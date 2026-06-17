const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
    shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    recipient_user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    type: {
        type: String,
        enum: ['order', 'customer', 'return', 'refund', 'system'],
        required: true,
        index: true
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    entityType: { type: String, trim: true, default: '' },
    entityId: { type: Schema.Types.ObjectId, default: null, index: true },
    severity: { type: String, enum: ['info', 'success', 'warning', 'critical'], default: 'info' },
    readAt: { type: Date, default: null, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false, index: true }
}, { timestamps: true });

notificationSchema.index({ shop_id: 1, recipient_user_id: 1, isDeleted: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ shop_id: 1, isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
