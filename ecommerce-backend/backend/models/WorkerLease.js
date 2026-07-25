const mongoose = require('mongoose');

const workerLeaseSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    ownerId: {
        type: String,
        trim: true,
        default: ''
    },
    lockedUntil: {
        type: Date,
        default: null,
        index: true
    },
    lastStartedAt: {
        type: Date,
        default: null
    },
    lastCompletedAt: {
        type: Date,
        default: null
    },
    attempts: {
        type: Number,
        min: 0,
        default: 0
    },
    lastError: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ''
    },
    lastSummary: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('WorkerLease', workerLeaseSchema);
