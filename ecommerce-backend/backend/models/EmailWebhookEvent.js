const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
    providerEventId: { type: String, required: true, unique: true },
    providerMessageId: { type: String, required: true },
    eventType: { type: String, required: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'CustomerEmailCampaign', default: null },
    recipientId: { type: Schema.Types.ObjectId, ref: 'CustomerEmailRecipient', default: null },
    registrationDeliveryId: { type: Schema.Types.ObjectId, ref: 'RegistrationWelcomeDelivery', default: null },
    processedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ shopId: 1, campaignId: 1, createdAt: -1 });
module.exports = mongoose.model('EmailWebhookEvent', schema);
