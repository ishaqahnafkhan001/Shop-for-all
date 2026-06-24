const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
        index: true
    },
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true,
        index: true
    },
    provider: {
        type: String,
        enum: ['manual_bkash', 'manual_nagad', 'manual_bank', 'other'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    transactionId: {
        type: String,
        trim: true,
        default: ''
    },
    senderNumber: {
        type: String,
        trim: true,
        default: ''
    },
    screenshotUrl: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'failed', 'refunded'],
        default: 'pending',
        index: true
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        default: null
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        default: null
    },
    verifiedAt: Date,
    rejectionReason: {
        type: String,
        trim: true,
        default: ''
    },
    adminNote: {
        type: String,
        trim: true,
        default: ''
    }
}, { timestamps: true });

paymentTransactionSchema.index(
    { provider: 1, transactionId: 1 },
    {
        unique: true,
        partialFilterExpression: { transactionId: { $type: 'string', $ne: '' } }
    }
);
paymentTransactionSchema.index({ invoiceId: 1, status: 1 });
paymentTransactionSchema.index({ shopId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
