const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    channel: { type: String, enum: ['email', 'sms'], required: true },
    provider: { type: String, enum: ['resend', 'smtp', 'sms'], required: true },
    recipient: { type: String, default: '', select: false },
    context: {
        shopName: String,
        ownerName: String,
        storefrontUrl: String,
        adminUrl: String,
        supportEmail: String,
        senderEmail: String,
        verificationPending: Boolean
    },
    status: {
        type: String,
        enum: ['queued', 'submitting', 'accepted', 'delivered', 'failed', 'bounced', 'complained', 'suppressed', 'uncertain', 'skipped', 'mocked'],
        default: 'queued'
    },
    providerMessageId: { type: String, maxlength: 160, default: '' },
    idempotencyKey: { type: String, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    firstSubmissionAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    lastReconciledAt: { type: Date, default: null },
    claimId: { type: String, default: '' },
    claimedAt: { type: Date, default: null },
    lastError: { type: String, maxlength: 160, default: '' }
}, { timestamps: true });

schema.index({ shopId: 1, accountId: 1, channel: 1 }, { unique: true });
schema.index({ shopId: 1, status: 1, createdAt: -1 });
schema.index({ providerMessageId: 1 });
schema.index({ channel: 1, status: 1, lastReconciledAt: 1 });

module.exports = mongoose.model('RegistrationWelcomeDelivery', schema);
