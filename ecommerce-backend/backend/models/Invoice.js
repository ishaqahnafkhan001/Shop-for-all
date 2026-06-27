const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        required: true,
        index: true
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VendorPlan',
        default: null
    },
    planName: {
        type: String,
        trim: true,
        default: ''
    },
    planSlug: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    invoiceNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        enum: ['BDT'],
        default: 'BDT'
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: 'monthly'
    },
    status: {
        type: String,
        enum: ['unpaid', 'submitted', 'paid', 'rejected', 'expired', 'cancelled'],
        default: 'unpaid',
        index: true
    },
    dueDate: Date,
    paidAt: Date,
    notes: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
    }
}, { timestamps: true });

invoiceSchema.index({ shopId: 1, status: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
