const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    shopId: { type: mongoose.Schema.Types.ObjectId, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actorId: mongoose.Schema.Types.ObjectId,
    slot: { type: Number, min: 0, max: 49, required: true },
    feature: { type: String, enum: ['product.content'], required: true },
    operationId: { type: String, maxlength: 120, required: true },
    entityVersion: String,
    content: { type: mongoose.Schema.Types.Mixed, required: true },
    provenance: { type: mongoose.Schema.Types.Mixed, required: true },
    application: { type: mongoose.Schema.Types.Mixed, default: null },
    feedback: { type: String, enum: ['', 'useful', 'incorrect_facts', 'too_generic', 'wrong_tone', 'wrong_language', 'too_long', 'too_short', 'missing_details'], default: '' },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });
schema.index({ shopId: 1, slot: 1 }, { unique: true });
schema.index({ shopId: 1, feature: 1, operationId: 1 }, { unique: true });
schema.index({ shopId: 1, entityId: 1, createdAt: -1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('AiContentHistory', schema);
