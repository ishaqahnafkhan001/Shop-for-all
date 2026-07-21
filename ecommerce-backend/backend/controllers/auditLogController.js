const AuditLog = require('../models/AuditLog');
const { getShopPlanAccess } = require('../services/billing/planAccessService');
const { getActivityLogCutoff } = require('../services/billing/activityLogRetentionService');

exports.getAuditLogs = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
        const skip = (page - 1) * limit;
        const access = await getShopPlanAccess(req.tenantId);
        const retentionDays = access.limits.activityLogRetentionDays;
        const query = {
            shop_id: req.tenantId,
            createdAt: { $gte: getActivityLogCutoff(retentionDays) }
        };

        if (req.query.action) query.action = req.query.action;
        if (req.query.entityType) query.entityType = req.query.entityType;
        if (req.query.severity) query.severity = req.query.severity;

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            AuditLog.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            },
            retention: {
                days: retentionDays,
                plan: access.planKey
            }
        });
    } catch (err) {
        console.error('Get audit logs error:', err);
        res.status(500).json({ success: false, error: 'Failed to load activity logs' });
    }
};
