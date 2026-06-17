const AuditLog = require('../models/AuditLog');

const safeObjectId = (value) => value || null;

const buildActor = (req) => ({
    user_id: safeObjectId(req?.user?._id || req?.user?.id),
    role: req?.user?.role || 'System',
    name: req?.user?.fullName || '',
    email: req?.user?.email || ''
});

const logAudit = async ({
                            req,
                            shop_id,
                            action,
                            entityType,
                            entityId = null,
                            entityLabel = '',
                            severity = 'info',
                            before = null,
                            after = null,
                            metadata = {}
                        }) => {
    try {
        if (!shop_id || !action || !entityType) return null;

        return await AuditLog.create({
            shop_id,
            actor: buildActor(req),
            action,
            entityType,
            entityId,
            entityLabel,
            severity,
            ip: req?.ip || '',
            userAgent: req?.get ? req.get('user-agent') || '' : '',
            before,
            after,
            metadata
        });
    } catch (err) {
        console.error('[AuditLog] Failed to write audit log:', err.message);
        return null;
    }
};

module.exports = { logAudit };
