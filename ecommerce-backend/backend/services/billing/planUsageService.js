const PlanUsage = require('../../models/PlanUsage');

const AI_METRIC = 'aiProductCreations';
const ensureUsageWindow = async ({ shopId, start, end }) => {
    try {
        await PlanUsage.updateOne(
            { shopId, metric: AI_METRIC, periodStart: start },
            { $setOnInsert: { periodEnd: end, used: 0, reserved: 0 } },
            { upsert: true }
        );
    } catch (error) {
        // Concurrent first requests can race on the unique weekly key. The winner
        // created the same usage window, so the loser can safely continue.
        if (error?.code !== 11000) throw error;
    }
};

const getUtcWeekWindow = (value = new Date()) => {
    const now = new Date(value);
    const start = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
    ));
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, end };
};

const getWeeklyAiUsage = async ({ shopId, limit, now = new Date() }) => {
    const { start, end } = getUtcWeekWindow(now);
    const usage = await PlanUsage.findOne({ shopId, metric: AI_METRIC, periodStart: start }).lean();
    const used = Number(usage?.used || 0);
    const unlimited = limit === null;
    return {
        used,
        limit,
        remaining: unlimited ? null : Math.max(Number(limit || 0) - used, 0),
        unlimited,
        resetsAt: end.toISOString()
    };
};

const reserveWeeklyAiUsage = async ({ shopId, limit, now = new Date() }) => {
    const { start, end } = getUtcWeekWindow(now);
    await ensureUsageWindow({ shopId, start, end });
    if (limit === null) {
        await PlanUsage.updateOne(
            { shopId, metric: AI_METRIC, periodStart: start },
            { $inc: { reserved: 1 } }
        );
        return { shopId, periodStart: start, unlimited: true };
    }

    const usage = await PlanUsage.findOneAndUpdate(
        {
            shopId,
            metric: AI_METRIC,
            periodStart: start,
            $expr: { $lt: [{ $add: ['$used', '$reserved'] }, Number(limit)] }
        },
        { $inc: { reserved: 1 } },
        { new: true }
    ).lean();

    if (!usage) {
        const current = await getWeeklyAiUsage({ shopId, limit, now });
        const error = new Error(`You have used all ${limit} weekly AI product creations.`);
        error.code = 'PLAN_LIMIT_REACHED';
        error.limitKey = 'aiProductCreationsPerWeek';
        error.usage = current;
        throw error;
    }

    return { shopId, periodStart: start, unlimited: false };
};

const completeWeeklyAiUsage = async (reservation) => {
    if (!reservation) return;
    await PlanUsage.updateOne(
        { shopId: reservation.shopId, metric: AI_METRIC, periodStart: reservation.periodStart, reserved: { $gt: 0 } },
        { $inc: { reserved: -1, used: 1 } }
    );
};

const releaseWeeklyAiUsage = async (reservation) => {
    if (!reservation) return;
    await PlanUsage.updateOne(
        { shopId: reservation.shopId, metric: AI_METRIC, periodStart: reservation.periodStart, reserved: { $gt: 0 } },
        { $inc: { reserved: -1 } }
    );
};

module.exports = {
    AI_METRIC,
    getUtcWeekWindow,
    getWeeklyAiUsage,
    reserveWeeklyAiUsage,
    completeWeeklyAiUsage,
    releaseWeeklyAiUsage
};
