const PlatformAuditLog = require('../models/PlatformAuditLog');

const getActorRef = (req) => {
    const user = req?.user || {};
    return {
        actor_id: user.accountId || user.account_id || user._id || user.id || null,
        actorModel: user.accountId || user.account_id ? 'Account' : 'User',
        actorName: user.fullName || '',
        actorEmail: user.email || '',
        actorRole: user.role || ''
    };
};

const logPlatformAudit = async ({
    req,
    action,
    entityType,
    entityId = null,
    entityLabel = '',
    shop_id = null,
    message,
    reason = '',
    metadata = {},
    severity = 'info'
}) => {
    try {
        if (!action || !entityType || !message) return null;

        return await PlatformAuditLog.create({
            ...getActorRef(req),
            action,
            entityType,
            entityId,
            entityLabel,
            shop_id,
            message,
            reason,
            metadata,
            severity,
            ip: req?.ip || '',
            userAgent: req?.get ? req.get('user-agent') || '' : ''
        });
    } catch (err) {
        console.error('[PlatformAuditLog] Failed to write audit log:', err.message);
        return null;
    }
};

module.exports = { logPlatformAudit };
