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
        enum: ['reserving', 'in_progress', 'outcome_ready', 'completed', 'failed'],
        default: 'reserving',
        index: true
    },
    source: {
        type: String,
        enum: ['provider', 'deterministic_fallback', 'mixed', 'manual', 'unknown_legacy', 'none'],
        default: 'none'
    },
    safeErrorCode: { type: String, trim: true, maxlength: 80, default: '' },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    provenance: {
        provider: { type: String, trim: true, maxlength: 30, default: '' },
        promptId: { type: String, trim: true, maxlength: 80, default: '' },
        promptVersion: { type: String, trim: true, maxlength: 30, default: '' },
        model: { type: String, trim: true, maxlength: 80, default: '' },
        latencyMs: { type: Number, min: 0, default: 0 }
    },
    accountingVersion: { type: Number },
    quotaPeriodStart: { type: Date, immutable: true },
    quotaPeriodEnd: { type: Date, immutable: true },
    fence: { type: Number, default: 1 },
    deadline: { type: Date },
    entityId: { type: String, maxlength: 80 },
    entityVersion: { type: String, maxlength: 80 },
    inputHash: { type: String, maxlength: 64 },
    contextHash: { type: String, maxlength: 64 },
    outcome: { type: String, enum: ['completed', 'failed'] },
    settlement: { type: String, enum: ['consumed', 'released'] },
    providerOutcome: { type: String, enum: ['known', 'unknown', 'not_started'] },
    cooldownUntil: { type: Date },
    attempts: { type: [new mongoose.Schema({
        attemptId: String, epoch: Number, feature: String, provider: String, model: String,
        modality: String, startedAt: Date, endedAt: Date, outcome: String,
        latencyMs: Number, statusClass: String,
        inputTokens: { type: Number, default: null },
        outputTokens: { type: Number, default: null },
        totalTokens: { type: Number, default: null }
    }, { _id: false })], default: undefined },
    accountingAcknowledgedAt: { type: Date },
    receiptPrunedAt: { type: Date },
    expiresAt: { type: Date }
}, { timestamps: true });

aiGenerationRequestSchema.index(
    { shopId: 1, feature: 1, requestId: 1 },
    { unique: true }
);
aiGenerationRequestSchema.index({ accountingVersion: 1, createdAt: -1 });
aiGenerationRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
aiGenerationRequestSchema.index({ accountingVersion: 1, receiptPrunedAt: 1, deadline: 1 });

module.exports = mongoose.model('AiGenerationRequest', aiGenerationRequestSchema);
