const Notification = require('../models/Notification');

const getRecipientQuery = (req) => ({
    shop_id: req.tenantId,
    isDeleted: false,
    $or: [
        { recipient_user_id: req.user?._id || req.user?.id },
        { recipient_user_id: null }
    ]
});

exports.getNotifications = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const skip = (page - 1) * limit;
        const query = getRecipientQuery(req);

        if (req.query.unread === 'true') query.readAt = null;
        if (req.query.type && req.query.type !== 'All') query.type = req.query.type;

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Notification.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: notifications,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ success: false, error: 'Failed to load notifications' });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            ...getRecipientQuery(req),
            readAt: null
        });

        res.status(200).json({ success: true, data: { count } });
    } catch (err) {
        console.error('Get notification count error:', err);
        res.status(500).json({ success: false, error: 'Failed to load notification count' });
    }
};

exports.markNotificationRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            {
                _id: req.params.id,
                ...getRecipientQuery(req)
            },
            { $set: { readAt: new Date() } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        res.status(200).json({ success: true, data: notification });
    } catch (err) {
        console.error('Mark notification read error:', err);
        res.status(500).json({ success: false, error: 'Failed to update notification' });
    }
};

exports.markAllNotificationsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            {
                ...getRecipientQuery(req),
                readAt: null
            },
            { $set: { readAt: new Date() } }
        );

        res.status(200).json({
            success: true,
            data: { updatedCount: result.modifiedCount }
        });
    } catch (err) {
        console.error('Mark all notifications read error:', err);
        res.status(500).json({ success: false, error: 'Failed to update notifications' });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            {
                _id: req.params.id,
                ...getRecipientQuery(req)
            },
            { $set: { isDeleted: true } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (err) {
        console.error('Delete notification error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete notification' });
    }
};
