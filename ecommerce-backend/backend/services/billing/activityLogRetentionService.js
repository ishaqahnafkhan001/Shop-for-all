const AuditLog = require('../../models/AuditLog');
const { getShopPlanAccess } = require('./planAccessService');

const DAY_MS = 24 * 60 * 60 * 1000;

const getActivityLogCutoff = (retentionDays, now = new Date()) => (
    new Date(new Date(now).getTime() - (Number(retentionDays) * DAY_MS))
);

const cleanupExpiredActivityLogs = async ({ batchSize = 500, now = new Date() } = {}) => {
    const oldestPossibleCutoff = getActivityLogCutoff(7, now);
    const candidates = await AuditLog.find({ createdAt: { $lt: oldestPossibleCutoff } })
        .select('_id shop_id createdAt')
        .sort({ createdAt: 1 })
        .limit(Math.min(Math.max(Number(batchSize) || 500, 1), 2000))
        .lean();
    if (!candidates.length) return { scanned: 0, deleted: 0 };

    const byShop = candidates.reduce((acc, log) => {
        const key = String(log.shop_id);
        if (!acc.has(key)) acc.set(key, []);
        acc.get(key).push(log);
        return acc;
    }, new Map());
    const expiredIds = [];

    for (const [shopId, logs] of byShop) {
        try {
            const access = await getShopPlanAccess(shopId);
            const cutoff = getActivityLogCutoff(access.limits.activityLogRetentionDays, now);
            logs.forEach(log => {
                if (new Date(log.createdAt) < cutoff) expiredIds.push(log._id);
            });
        } catch (_error) {
            // Orphaned logs are preserved for explicit administrative cleanup.
        }
    }

    if (!expiredIds.length) return { scanned: candidates.length, deleted: 0 };
    const result = await AuditLog.deleteMany({ _id: { $in: expiredIds } });
    return { scanned: candidates.length, deleted: result.deletedCount || 0 };
};

module.exports = {
    DAY_MS,
    getActivityLogCutoff,
    cleanupExpiredActivityLogs
};
