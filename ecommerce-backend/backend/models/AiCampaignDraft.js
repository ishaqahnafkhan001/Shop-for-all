const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actorId: mongoose.Schema.Types.ObjectId,
    slot: { type: Number, min: 0, max: 49, required: true },
    version: { type: Number, min: 1, default: 1 },
    status: { type: String, enum: ['draft', 'archived'], default: 'draft' },
    name: { type: String, required: true, maxlength: 100 },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    evidence: { type: mongoose.Schema.Types.Mixed, required: true },
    provenance: { type: mongoose.Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });
schema.index({ shopId: 1, slot: 1 }, { unique: true });
schema.index({ shopId: 1, productId: 1, updatedAt: -1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('AiCampaignDraft', schema);
