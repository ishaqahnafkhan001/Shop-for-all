const mongoose = require('mongoose');

const subscriptionUsageWarningSchema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    resource: { type: String, enum: ['products', 'staff', 'aiGeneration'], required: true, index: true },
    scopeKey: { type: String, required: true, trim: true, maxlength: 180 },
    threshold: { type: Number, required: true, min: 1, max: 100 },
    used: { type: Number, required: true, min: 0 },
    limit: { type: Number, required: true, min: 0 },
    eventType: { type: String, enum: ['QuotaWarning', 'QuotaReached'], required: true },
    notifiedAt: { type: Date, default: Date.now }
}, { timestamps: true });

subscriptionUsageWarningSchema.index(
    { shopId: 1, resource: 1, scopeKey: 1, threshold: 1 },
    { unique: true }
);
subscriptionUsageWarningSchema.index({ shopId: 1, createdAt: -1 });

module.exports = mongoose.model('SubscriptionUsageWarning', subscriptionUsageWarningSchema);
