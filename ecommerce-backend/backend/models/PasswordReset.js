const mongoose = require('mongoose');
const { Schema } = mongoose;

const passwordResetSchema = new Schema({
    resetKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true
    },
    audience: {
        type: String,
        enum: ['admin', 'customer'],
        required: true
    },
    account_id: {
        type: Schema.Types.ObjectId,
        ref: 'Account'
    },
    membership_id: {
        type: Schema.Types.ObjectId,
        ref: 'ShopMembership'
    },
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        index: true
    },
    role: {
        type: String,
        enum: ['SuperAdmin', 'VendorAdmin', 'VendorStaff', 'Customer']
    },
    otpHash: {
        type: String
    },
    resetTokenHash: {
        type: String
    },
    expiresAt: {
        type: Date
    },
    resendAvailableAt: {
        type: Date
    },
    requestWindowStartedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    requestCount: {
        type: Number,
        default: 0
    },
    attempts: {
        type: Number,
        default: 0
    },
    blockedUntil: {
        type: Date
    },
    verifiedAt: {
        type: Date
    },
    consumedAt: {
        type: Date
    },
    cleanupAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

passwordResetSchema.index({ email: 1, audience: 1, shop_id: 1 });
passwordResetSchema.index({ cleanupAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
