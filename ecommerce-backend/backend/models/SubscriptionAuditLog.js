const mongoose = require('mongoose');

const subscriptionAuditLogSchema = new mongoose.Schema({
    eventId: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null, index: true },
    eventType: { type: String, required: true, trim: true, maxlength: 100, index: true },
    action: { type: String, required: true, trim: true, maxlength: 140, index: true },
    actor: {
        id: { type: mongoose.Schema.Types.ObjectId, default: null },
        model: { type: String, enum: ['Account', 'User'], default: 'User' },
        name: { type: String, trim: true, maxlength: 120, default: '' },
        email: { type: String, trim: true, lowercase: true, maxlength: 180, default: '' },
        role: { type: String, trim: true, maxlength: 80, default: 'System' }
    },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    reason: { type: String, trim: true, maxlength: 1000, default: '' },
    ip: { type: String, trim: true, maxlength: 100, default: '' },
    userAgent: { type: String, trim: true, maxlength: 500, default: '' },
    requestId: { type: String, trim: true, maxlength: 120, default: '', index: true },
    correlationId: { type: String, trim: true, maxlength: 120, required: true, index: true },
    affectedResources: { type: [String], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, required: true, index: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

subscriptionAuditLogSchema.index({ shopId: 1, occurredAt: -1 });
subscriptionAuditLogSchema.index({ shopId: 1, eventType: 1, occurredAt: -1 });

const immutableError = () => new Error('Subscription audit records are immutable.');
['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'deleteOne', 'deleteMany', 'findOneAndDelete']
    .forEach(operation => subscriptionAuditLogSchema.pre(operation, function preventMutation() {
        throw immutableError();
    }));
subscriptionAuditLogSchema.pre('save', function preventExistingSave() {
    if (!this.isNew) throw immutableError();
});

module.exports = mongoose.model('SubscriptionAuditLog', subscriptionAuditLogSchema);
