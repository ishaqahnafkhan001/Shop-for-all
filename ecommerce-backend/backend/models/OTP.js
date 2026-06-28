const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    key: {
        type: String,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    identifier: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    channel: {
        type: String,
        enum: ['email', 'sms'],
        default: 'email'
    },
    purpose: {
        type: String,
        required: true,
        default: 'registration',
        index: true
    },
    otpHash: {
        type: String,
        required: true,
        select: true
    },
    attempts: {
        type: Number,
        default: 0,
        min: 0
    },
    maxAttempts: {
        type: Number,
        default: 5,
        min: 1
    },
    usedAt: {
        type: Date,
        default: null
    },
    consumedAt: {
        type: Date,
        default: null
    },
    verifiedAt: {
        type: Date,
        default: null
    },
    resendAvailableAt: {
        type: Date,
        default: null
    },
    verificationTokenHash: {
        type: String,
        default: '',
        select: true
    },
    verificationTokenExpiresAt: {
        type: Date,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 5 * 60 * 1000),
        expires: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });
otpSchema.index({ key: 1 }, { unique: true, sparse: true });
otpSchema.index({ identifier: 1, purpose: 1, channel: 1 });

module.exports = mongoose.model('OTP', otpSchema);
