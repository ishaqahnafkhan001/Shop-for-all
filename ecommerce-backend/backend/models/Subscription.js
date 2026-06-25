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
