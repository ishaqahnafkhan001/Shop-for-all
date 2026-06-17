const Notification = require('../models/Notification');
const User = require('../models/User');

const getShopNotificationRecipients = async (shopId) => {
    if (!shopId) return [];

    return User.find({
        shop_id: shopId,
        role: { $in: ['VendorAdmin', 'VendorStaff'] },
        status: 'Active'
    }).select('_id').lean();
};

const createNotification = async ({
                                      shop_id,
                                      recipientUserIds = null,
                                      type,
                                      title,
                                      message,
                                      entityType = '',
                                      entityId = null,
                                      severity = 'info',
                                      metadata = {}
                                  }) => {
    try {
        if (!shop_id || !type || !title || !message) return [];

        const recipients = Array.isArray(recipientUserIds)
            ? recipientUserIds.filter(Boolean)
            : (await getShopNotificationRecipients(shop_id)).map(user => user._id);

        const docs = recipients.length > 0
            ? recipients.map(userId => ({
                shop_id,
                recipient_user_id: userId,
                type,
                title,
                message,
                entityType,
                entityId,
                severity,
                metadata
            }))
            : [{
                shop_id,
                type,
                title,
                message,
                entityType,
                entityId,
                severity,
                metadata
            }];

        return await Notification.insertMany(docs, { ordered: false });
    } catch (err) {
        console.error('[Notification] Failed to create notification:', err.message);
        return [];
    }
};

module.exports = {
    createNotification,
    getShopNotificationRecipients
};
