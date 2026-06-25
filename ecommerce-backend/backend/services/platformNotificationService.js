const PlatformNotification = require('../models/PlatformNotification');

const createPlatformNotification = async ({
    recipientType = 'SuperAdmin',
    recipientId = null,
    type,
    title,
    message,
    entityType = '',
    entityId = null,
    shop_id = null,
    severity = 'info',
    metadata = {}
}) => {
    try {
        if (!type || !title || !message) return null;

        return await PlatformNotification.create({
            recipientType,
            recipientId,
            type,
            title,
            message,
            entityType,
            entityId,
            shop_id,
            severity,
            metadata
        });
    } catch (err) {
        console.error('[PlatformNotification] Failed:', err.message);
        return null;
    }
};

module.exports = {
    createPlatformNotification
};
