const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
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
    usedAt: {
        type: Date,
        default: null
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

module.exports = mongoose.model('OTP', otpSchema);
