const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        unique: true,
        index: true
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VendorPlan',
        default: null
    },
    activePlanName: {
        type: String,
        trim: true,
        default: ''
    },
    activePlanSlug: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    intendedPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VendorPlan',
        default: null
    },
    intendedPlanName: {
        type: String,
        trim: true,
        default: ''
    },
    intendedPlanSlug: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['trialing', 'pending_approval', 'active', 'past_due', 'grace', 'suspended', 'cancelled'],
        default: 'trialing',
        index: true
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
    },
    trialStartedAt: Date,
    trialEndsAt: Date,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    activatedAt: Date,
    pendingPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VendorPlan',
        default: null
    },
    pendingPlanName: {
        type: String,
        trim: true,
        default: ''
    },
    pendingPlanSlug: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    pendingPlanEffectiveAt: {
        type: Date,
        default: null,
        index: true
    },
    reconciliation: {
        operationId: { type: String, trim: true, default: '' },
        targetPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorPlan', default: null },
        targetPlanName: { type: String, trim: true, default: '' },
        targetPlanSlug: { type: String, trim: true, lowercase: true, default: '' },
        retainedProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
        status: {
            type: String,
            enum: ['idle', 'pending', 'running', 'completed', 'failed', 'cancelled'],
            default: 'idle'
        },
        attempts: { type: Number, min: 0, default: 0 },
        lastError: { type: String, trim: true, maxlength: 1000, default: '' },
        scheduledAt: { type: Date, default: null },
        startedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },
        forced: { type: Boolean, default: false },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
        requestId: { type: String, trim: true, maxlength: 120, default: '' },
        reason: { type: String, trim: true, maxlength: 500, default: '' },
        summary: { type: mongoose.Schema.Types.Mixed, default: null }
    },
    graceEndsAt: Date,
    lastInvoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        default: null
    },
    cancelledAt: Date,
    suspendedAt: Date,
    suspensionReason: {
        type: String,
        trim: true,
        default: ''
    }
}, { timestamps: true });

subscriptionSchema.index({ shopId: 1, status: 1 });
subscriptionSchema.index({ 'reconciliation.status': 1, pendingPlanEffectiveAt: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
