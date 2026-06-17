const mongoose = require('mongoose');
const { Schema } = mongoose;

const platformAuditLogSchema = new Schema({
    actor_id: {
        type: Schema.Types.ObjectId,
        refPath: 'actorModel',
        index: true
    },
    actorModel: {
        type: String,
        enum: ['Account', 'User'],
        default: 'Account'
    },
    actorName: { type: String, trim: true, default: '' },
    actorEmail: { type: String, trim: true, lowercase: true, default: '' },
    actorRole: { type: String, trim: true, default: '' },
    action: {
        type: String,
        required: true,
        index: true
    },
    entityType: {
        type: String,
        required: true,
        index: true
    },
    entityId: {
        type: Schema.Types.ObjectId,
        index: true
    },
    entityLabel: { type: String, trim: true, default: '' },
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        index: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    reason: {
        type: String,
        trim: true,
        default: ''
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {}
    },
    ip: { type: String, trim: true, default: '' },
    userAgent: { type: String, trim: true, default: '' },
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info',
        index: true
    }
}, { timestamps: true });

platformAuditLogSchema.index({ createdAt: -1 });
platformAuditLogSchema.index({ actor_id: 1, createdAt: -1 });
platformAuditLogSchema.index({ action: 1, createdAt: -1 });
platformAuditLogSchema.index({ entityType: 1, entityId: 1 });
platformAuditLogSchema.index({ shop_id: 1, createdAt: -1 });
platformAuditLogSchema.index({ severity: 1, createdAt: -1 });

module.exports = mongoose.model('PlatformAuditLog', platformAuditLogSchema);
