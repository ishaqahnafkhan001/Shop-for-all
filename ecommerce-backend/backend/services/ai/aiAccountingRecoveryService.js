const AiGenerationRequest = require('../../models/AiGenerationRequest');
const { getAiConfig } = require('../../config/ai');
const { accountingError, readReceipt, settleWeeklyAiUsage, pruneReceipt, fenceExpiredReceipt } = require('../billing/planUsageService');

const reservationFor = (record) => ({ shopId: record.shopId, periodStart: record.quotaPeriodStart,
    owner: record._id, fence: record.fence, deadline: record.deadline });
const identityFor = (record) => ({ _id: record._id, shopId: record.shopId, accountingVersion: 2 });
const expired = { $expr: { $lte: ['$deadline', '$$NOW'] } };

const finalizeAiOperation = async (record) => {
    if (!record?.outcome || record.accountingVersion !== 2) return record;
    const identity = identityFor(record);
    const reservation = reservationFor(record);
    if (!record.accountingAcknowledgedAt) {
        const receipt = await readReceipt(reservation);
        if (!receipt) {
            // Admission uses the same Mongo clock. Before the deadline an uncertain
            // admission could still insert a receipt, so absence is not settlement.
            const closed = await AiGenerationRequest.exists({ ...identity, ...expired });
            if (!closed || record.settlement !== 'released') throw accountingError('AI_SETTLEMENT_PENDING', 'AI accounting is awaiting recovery. Retry the same operation.');
        } else {
            reservation.fence = receipt.fence;
            await settleWeeklyAiUsage(reservation, record.settlement);
        }
        record = await AiGenerationRequest.findOneAndUpdate({ ...identity, status: 'outcome_ready' }, {
            $set: { status: record.outcome, accountingAcknowledgedAt: new Date() },
            $max: { fence: reservation.fence }
        }, { returnDocument: 'after' }).lean() || await AiGenerationRequest.findOne(identity).lean();
    }
    if (!record?.accountingAcknowledgedAt) throw accountingError('AI_SETTLEMENT_PENDING', 'AI accounting is awaiting recovery.');
    // Keep a settled admission tombstone until the admission deadline passes.
    // This also makes delayed/repeated reserve writes harmless after finalization.
    if (!record.receiptPrunedAt && await AiGenerationRequest.exists({ ...identity, ...expired })) {
        await pruneReceipt(reservation, record.settlement);
        record = await AiGenerationRequest.findOneAndUpdate({ ...identity, accountingAcknowledgedAt: { $exists: true } }, {
            $set: { receiptPrunedAt: new Date(), expiresAt: new Date(Date.now() + getAiConfig().retentionHours * 3600000) }
        }, { returnDocument: 'after' }).lean();
    }
    return record;
};

const reconcileAiOperation = async (record) => {
    if (!record || record.accountingVersion !== 2 || record.receiptPrunedAt) return record;
    const identity = identityFor(record);
    if (!record.outcome) {
        if (!await AiGenerationRequest.exists({ ...identity, ...expired })) return record;
        const receipt = await fenceExpiredReceipt(reservationFor(record));
        await AiGenerationRequest.updateOne({ ...identity, ...expired, status: { $in: ['reserving', 'in_progress'] } }, {
            $set: { status: 'outcome_ready', outcome: 'failed', settlement: 'released', source: 'none',
                safeErrorCode: record.status === 'in_progress' ? 'AI_PROVIDER_OUTCOME_UNKNOWN' : 'AI_ADMISSION_INTERRUPTED',
                providerOutcome: record.status === 'in_progress' ? 'unknown' : 'not_started',
                ...(record.status === 'in_progress' ? { cooldownUntil: new Date(Date.now() + getAiConfig().unknownCooldownMs) } : {}) },
            $max: { fence: receipt?.fence || record.fence + 1 }
        });
        record = await AiGenerationRequest.findOne(identity).lean();
    }
    return finalizeAiOperation(record);
};

const reconcileStaleAiOperations = async ({ shopId, limit = 25 } = {}) => {
    const records = await AiGenerationRequest.find({ accountingVersion: 2,
        ...(shopId ? { shopId } : {}), receiptPrunedAt: { $exists: false }, ...expired
    }).sort({ deadline: 1 }).limit(Math.min(Math.max(limit, 1), 100)).lean();
    const result = { scanned: records.length, recovered: 0, pending: 0 };
    for (const record of records) {
        try {
            const final = await reconcileAiOperation(record);
            if (final?.receiptPrunedAt) result.recovered += 1;
            else result.pending += 1;
        } catch (_) { result.pending += 1; }
    }
    return result;
};
module.exports = { finalizeAiOperation, reconcileAiOperation, reconcileStaleAiOperations, identityFor };
