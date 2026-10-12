const PlanUsage = require('../../models/PlanUsage');
const { getAiConfig } = require('../../config/ai');
const AI_METRIC = 'aiProductCreations';
const accountingError = (code, message, statusCode = 503) => Object.assign(new Error(message), { code, statusCode });
const getUtcWeekWindow = (value = new Date()) => {
    const now = new Date(value);
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    return { start, end: new Date(start.getTime() + 7 * 86400000) };
};
const windowFilter = ({ shopId, periodStart }) => ({ shopId, metric: AI_METRIC, periodStart });
const ensureUsageWindow = async ({ shopId, start, end }) => {
    try {
        await PlanUsage.updateOne(windowFilter({ shopId, periodStart: start }), {
            $setOnInsert: { periodEnd: end, used: 0, reserved: 0, accountingVersion: 2, receipts: [] }
        }, { upsert: true });
    } catch (error) {
        if (error?.code !== 11000) throw error;
    }
};
const getWeeklyAiUsage = async ({ shopId, limit, now = new Date() }) => {
    const { start, end } = getUtcWeekWindow(now);
    const usage = await PlanUsage.findOne(windowFilter({ shopId, periodStart: start })).lean();
    const used = Number(usage?.used || 0);
    const pending = Number(usage?.reserved || 0);
    const unlimited = limit === null;
    const available = unlimited ? null : Math.max(Number(limit || 0) - used - pending, 0);
    return { used, pending, available, remaining: available, limit, unlimited, resetsAt: end.toISOString() };
};
const readReceipt = async (reservation) => {
    const usage = await PlanUsage.findOne(windowFilter(reservation)).lean();
    return usage?.receipts?.find(receipt => String(receipt.owner) === String(reservation.owner)) || null;
};
const reserveWeeklyAiUsage = async ({ shopId, limit, owner, deadline, periodStart, periodEnd, fence = 1 }) => {
    if (!owner || !deadline || !periodStart || !periodEnd) throw accountingError('AI_OWNER_REQUIRED', 'An owned AI operation is required.');
    const config = getAiConfig();
    await ensureUsageWindow({ shopId, start: periodStart, end: periodEnd });
    const windowOpen = await PlanUsage.exists({ ...windowFilter({ shopId, periodStart }),
        $expr: { $gte: ['$$NOW', periodStart] } });
    if (!windowOpen) throw accountingError('AI_WINDOW_PENDING', 'The AI usage window is changing. Retry shortly.', 409);
    // Briefly drain the previous week rather than allowing two independent
    // weekly concurrency pools at midnight. Old-week settlement stays valid.
    if (await PlanUsage.exists({ shopId, metric: AI_METRIC, periodStart: { $lt: periodStart }, reserved: { $gt: 0 } })) {
        throw accountingError('AI_CAPACITY_PENDING', 'An earlier AI operation is still processing. Retry shortly.', 409);
    }
    const filter = {
        ...windowFilter({ shopId, periodStart }), accountingVersion: 2,
        'receipts.owner': { $ne: owner }, reserved: { $lt: config.concurrency },
        $expr: { $and: [
            { $gt: [deadline, '$$NOW'] },
            { $gt: [periodEnd, '$$NOW'] },
            { $lt: [{ $size: { $ifNull: ['$receipts', []] } }, config.receiptCapacity] },
            ...(limit === null ? [] : [{ $lt: [{ $add: ['$used', '$reserved'] }, Number(limit || 0)] }])
        ] }
    };
    const usage = await PlanUsage.findOneAndUpdate(filter, {
        $inc: { reserved: 1 },
        $push: { receipts: { owner, state: 'reserved', fence, deadline, recovered: false } }
    }, { returnDocument: 'after' }).lean();
    if (!usage) {
        const current = await PlanUsage.findOne(windowFilter({ shopId, periodStart })).lean();
        if (current?.accountingVersion !== 2) throw accountingError('AI_ACCOUNTING_CUTOVER_REQUIRED', 'AI generation is temporarily unavailable.');
        const existing = current?.receipts?.find(receipt => String(receipt.owner) === String(owner));
        if (existing?.state === 'reserved' && existing.fence === fence) return { shopId, periodStart, owner, fence };
        const capacity = current?.reserved >= config.concurrency || current?.receipts?.length >= config.receiptCapacity;
        const error = accountingError(capacity ? 'AI_CAPACITY_PENDING' : 'PLAN_LIMIT_REACHED',
            capacity ? 'Other AI operations are still processing. Retry this operation shortly.' : 'No AI generations are currently available.', capacity ? 409 : 403);
        error.limitKey = 'aiProductCreationsPerWeek';
        error.usage = await getWeeklyAiUsage({ shopId, limit });
        throw error;
    }
    return { shopId, periodStart, owner, fence };
};
const fenceExpiredReceipt = async (reservation) => {
    // One recovery epoch suffices: recovery never starts another provider attempt.
    await PlanUsage.updateOne({
        ...windowFilter(reservation), accountingVersion: 2,
        receipts: { $elemMatch: { owner: reservation.owner, state: 'reserved', recovered: false } },
        $expr: { $lte: [reservation.deadline, '$$NOW'] }
    }, { $inc: { 'receipts.$.fence': 1 }, $set: { 'receipts.$.recovered': true } });
    return readReceipt(reservation);
};
const settleWeeklyAiUsage = async (reservation, decision) => {
    if (!reservation?.owner || !['consumed', 'released'].includes(decision)) throw accountingError('AI_OWNER_REQUIRED', 'An owned settlement is required.');
    const receipt = await readReceipt(reservation);
    if (!receipt) return { missing: true };
    if (receipt.state === decision) return { state: decision };
    if (receipt.state !== 'reserved') throw accountingError('AI_ACCOUNTING_CONFLICT', 'AI accounting needs recovery.');
    const result = await PlanUsage.updateOne({
        ...windowFilter(reservation), accountingVersion: 2,
        receipts: { $elemMatch: { owner: reservation.owner, state: 'reserved', fence: reservation.fence } }
    }, {
        $set: { 'receipts.$.state': decision },
        $inc: { reserved: -1, ...(decision === 'consumed' ? { used: 1 } : {}) }
    });
    if (result.modifiedCount === 1) return { state: decision };
    const latest = await readReceipt(reservation);
    if (latest?.state === decision) return { state: decision };
    throw accountingError('AI_SETTLEMENT_PENDING', 'AI accounting is being recovered. Retry the same operation.');
};
const pruneReceipt = async (reservation, decision) => PlanUsage.updateOne(windowFilter(reservation), {
    $pull: { receipts: { owner: reservation.owner, state: decision } }
});
module.exports = {
    AI_METRIC, accountingError, getUtcWeekWindow, getWeeklyAiUsage, reserveWeeklyAiUsage,
    settleWeeklyAiUsage, readReceipt, fenceExpiredReceipt, pruneReceipt
};
