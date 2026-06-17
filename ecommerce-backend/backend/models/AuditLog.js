const mongoose = require('mongoose');
const { Schema } = mongoose;

const auditLogSchema = new Schema({
    shop_id: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    actor: {
        user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        role: { type: String, trim: true, default: 'System' },
        name: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, default: '' }
    },
    action: { type: String, required: true, trim: true, index: true },
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: Schema.Types.ObjectId, default: null, index: true },
    entityLabel: { type: String, trim: true, default: '' },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info', index: true },
    ip: { type: String, trim: true, default: '' },
    userAgent: { type: String, trim: true, default: '' },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

auditLogSchema.index({ shop_id: 1, createdAt: -1 });
auditLogSchema.index({ shop_id: 1, entityType: 1, entityId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
