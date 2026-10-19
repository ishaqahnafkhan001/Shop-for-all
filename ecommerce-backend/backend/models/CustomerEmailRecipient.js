const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'CustomerEmailCampaign', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    customerName: { type: String, trim: true, maxlength: 80, default: '' },
    status: {
        type: String,
        enum: ['queued', 'submitting', 'retryable', 'accepted', 'delivered', 'failed', 'bounced', 'complained', 'suppressed', 'uncertain'],
        default: 'queued',
        index: true
    },
    idempotencyKey: { type: String, required: true, maxlength: 256 },
    provider: { type: String, enum: ['resend', 'smtp'], default: 'resend' },
    providerMessageId: { type: String, default: '', index: true },
    attempts: { type: Number, min: 0, default: 0 },
    claimId: { type: String, default: '' },
    claimedAt: { type: Date, default: null },
    firstSubmissionAt: { type: Date, default: null },
    nextAttemptAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    lastReconciledAt: { type: Date, default: null },
    lastError: { type: String, maxlength: 300, default: '' }
}, { timestamps: true });

schema.index({ shopId: 1, campaignId: 1, customerId: 1 }, { unique: true });
schema.index({ shopId: 1, campaignId: 1, email: 1 }, { unique: true });
schema.index({ shopId: 1, campaignId: 1, status: 1, nextAttemptAt: 1 });
schema.index({ providerMessageId: 1 });
schema.index({ provider: 1, status: 1, lastReconciledAt: 1 });

module.exports = mongoose.model('CustomerEmailRecipient', schema);
