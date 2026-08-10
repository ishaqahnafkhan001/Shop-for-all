const mongoose = require('mongoose');

const aiGenerationRequestSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        default: null
    },
    feature: {
        type: String,
        enum: ['product.content', 'catalog.collection', 'growth.ad_planning', 'seo.homepage', 'legacy.product_description'],
        required: true
    },
    requestId: { type: String, required: true, trim: true, maxlength: 120 },
    status: {
        type: String,
        enum: ['reserving', 'in_progress', 'completed', 'failed'],
        default: 'reserving',
        index: true
    },
    source: {
        type: String,
        enum: ['provider', 'deterministic_fallback', 'none'],
        default: 'none'
    },
    safeErrorCode: { type: String, trim: true, maxlength: 80, default: '' },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    provenance: {
        promptId: { type: String, trim: true, maxlength: 80, default: '' },
        promptVersion: { type: String, trim: true, maxlength: 30, default: '' },
        model: { type: String, trim: true, maxlength: 80, default: '' },
        latencyMs: { type: Number, min: 0, default: 0 }
    },
    expiresAt: { type: Date, required: true }
}, { timestamps: true });

aiGenerationRequestSchema.index(
    { shopId: 1, feature: 1, requestId: 1 },
    { unique: true }
);
aiGenerationRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AiGenerationRequest', aiGenerationRequestSchema);
