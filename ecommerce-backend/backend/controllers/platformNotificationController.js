const PlatformNotification = require('../models/PlatformNotification');

const getSuperAdminNotificationQuery = (req) => ({
    recipientType: 'SuperAdmin',
    isDeleted: false,
    $or: [
        { recipientId: req.user?._id || req.user?.id },
        { recipientId: null }
    ]
});

exports.getSuperAdminNotifications = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const skip = (page - 1) * limit;
        const query = getSuperAdminNotificationQuery(req);
        if (req.query.unread === 'true') query.readAt = null;

        const [notifications, total, unreadCount] = await Promise.all([
            PlatformNotification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            PlatformNotification.countDocuments(query),
            PlatformNotification.countDocuments({ ...getSuperAdminNotificationQuery(req), readAt: null })
        ]);

        res.status(200).json({
            success: true,
            data: notifications,
            unreadCount,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit) || 1
            }
        });
    } catch (err) {
        console.error('Get platform notifications error:', err);
        res.status(500).json({ success: false, error: 'Failed to load notifications' });
    }
};

exports.markSuperAdminNotificationRead = async (req, res) => {
    try {
        const notification = await PlatformNotification.findOneAndUpdate(
            {
                _id: req.params.id,
                ...getSuperAdminNotificationQuery(req)
            },
            { $set: { readAt: new Date() } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        res.status(200).json({ success: true, data: notification });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to update notification' });
    }
};

exports.markAllSuperAdminNotificationsRead = async (req, res) => {
    try {
        const result = await PlatformNotification.updateMany(
            {
                ...getSuperAdminNotificationQuery(req),
                readAt: null
            },
            { $set: { readAt: new Date() } }
        );

        res.status(200).json({ success: true, data: { updatedCount: result.modifiedCount } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to update notifications' });
    }
};
