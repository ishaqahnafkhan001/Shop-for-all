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

module.exports = mongoose.model('Subscription', subscriptionSchema);
