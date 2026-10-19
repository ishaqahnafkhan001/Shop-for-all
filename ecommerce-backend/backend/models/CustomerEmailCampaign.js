const mongoose = require('mongoose');
const { Schema } = mongoose;

const customerEmailCampaignSchema = new Schema({
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['plain', 'product'],
        required: true,
        index: true
    },
    subject: { type: String, trim: true, required: true, maxlength: 160 },
    message: { type: String, default: '', maxlength: 5000 },
    storeName: { type: String, default: '', maxlength: 160 },
    senderEmail: { type: String, default: '', maxlength: 320 },
    storeBaseUrl: { type: String, default: '', maxlength: 500 },
    productSnapshot: { type: Schema.Types.Mixed, default: null },
    recipientSnapshotReady: { type: Boolean, default: false },
    recipientCount: { type: Number, min: 0, default: 0 },
    sentCount: { type: Number, min: 0, default: 0 },
    deliveredCount: { type: Number, min: 0, default: 0 },
    failedCount: { type: Number, min: 0, default: 0 },
    skippedCount: { type: Number, min: 0, default: 0 },
    uncertainCount: { type: Number, min: 0, default: 0 },
    status: {
        type: String,
        enum: ['preparing', 'queued', 'sending', 'completed', 'failed', 'cancelled', 'needs_attention'],
        default: 'queued',
        index: true
    },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    lastError: { type: String, trim: true, maxlength: 1000, default: '' }
}, { timestamps: true });

customerEmailCampaignSchema.index({ shopId: 1, createdAt: -1 });

module.exports = mongoose.model('CustomerEmailCampaign', customerEmailCampaignSchema);
