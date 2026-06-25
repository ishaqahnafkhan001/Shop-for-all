const mongoose = require('mongoose');

const platformNotificationSchema = new mongoose.Schema({
    recipientType: {
        type: String,
        enum: ['SuperAdmin', 'User'],
        default: 'SuperAdmin',
        index: true
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    type: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    entityType: {
        type: String,
        trim: true,
        default: ''
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        index: true
    },
    shop_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        default: null,
        index: true
    },
    severity: {
        type: String,
        enum: ['info', 'success', 'warning', 'error'],
        default: 'info',
        index: true
    },
    readAt: {
        type: Date,
        default: null,
        index: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

platformNotificationSchema.index({ recipientType: 1, isDeleted: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('PlatformNotification', platformNotificationSchema);
