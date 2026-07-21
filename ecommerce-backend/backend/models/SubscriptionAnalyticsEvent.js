const mongoose = require('mongoose');

const subscriptionAnalyticsEventSchema = new mongoose.Schema({
    eventId: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    planKey: { type: String, trim: true, lowercase: true, default: 'starter', index: true },
    eventType: { type: String, required: true, trim: true, maxlength: 100, index: true },
    domainEventType: { type: String, required: true, trim: true, maxlength: 100, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    correlationId: { type: String, trim: true, maxlength: 120, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, required: true, index: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

subscriptionAnalyticsEventSchema.index({ shopId: 1, eventType: 1, occurredAt: -1 });
subscriptionAnalyticsEventSchema.index({ eventType: 1, occurredAt: -1 });

module.exports = mongoose.model('SubscriptionAnalyticsEvent', subscriptionAnalyticsEventSchema);
