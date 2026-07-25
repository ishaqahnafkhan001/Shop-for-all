const mongoose = require('mongoose');

const platformAuditOutboxSchema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    eventType: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    audit: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        select: false
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
        index: true
    },
    attempts: {
        type: Number,
        default: 0,
        min: 0
    },
    nextAttemptAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    lockedAt: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    },
    lastError: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
    }
}, { timestamps: true });

platformAuditOutboxSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });

module.exports = mongoose.model('PlatformAuditOutbox', platformAuditOutboxSchema);
