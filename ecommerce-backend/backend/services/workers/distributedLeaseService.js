const crypto = require('crypto');
const WorkerLease = require('../../models/WorkerLease');

const acquireLease = async ({
    key,
    timeoutMs,
    now = new Date(),
    ownerId = crypto.randomUUID()
}) => {
    const safeTimeout = Math.max(1000, Number(timeoutMs) || 5 * 60 * 1000);
    try {
        await WorkerLease.updateOne(
            { key },
            {
                $setOnInsert: {
                    key,
                    ownerId: '',
                    lockedUntil: null,
                    attempts: 0
                }
            },
            { upsert: true }
        );
    } catch (error) {
        if (error?.code !== 11000) throw error;
    }

    const lease = await WorkerLease.findOneAndUpdate(
        {
            key,
            $or: [
                { lockedUntil: null },
                { lockedUntil: { $lte: now } },
                { ownerId: '' }
            ]
        },
        {
            $set: {
                ownerId,
                lockedUntil: new Date(now.getTime() + safeTimeout),
                lastStartedAt: now,
                lastError: ''
            },
            $inc: { attempts: 1 }
        },
        { new: true }
    );

    return lease ? { key, ownerId, lease } : null;
};

const releaseLease = async (handle, {
    now = new Date(),
    summary = null,
    error = null
} = {}) => {
    if (!handle) return null;
    return WorkerLease.updateOne(
        { key: handle.key, ownerId: handle.ownerId },
        {
            $set: {
                ownerId: '',
                lockedUntil: null,
                lastCompletedAt: now,
                lastSummary: summary,
                lastError: error ? String(error?.message || error).slice(0, 2000) : ''
            }
        }
    );
};

module.exports = {
    acquireLease,
    releaseLease
};
