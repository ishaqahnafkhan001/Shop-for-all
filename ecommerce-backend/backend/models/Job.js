const mongoose = require('mongoose');
const { Schema } = mongoose;

const JOB_STATUSES = ['queued', 'running', 'completed', 'failed', 'dead'];

const jobSchema = new Schema({
    queue: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    payload: {
        type: Schema.Types.Mixed,
        default: {}
    },
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'Shop',
        default: null,
        index: true
    },
    status: {
        type: String,
        enum: JOB_STATUSES,
        default: 'queued',
        index: true
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
    runAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    lockedAt: {
        type: Date,
        default: null
    },
    lockId: {
        type: String,
        trim: true,
        default: ''
    },
    lastError: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: ''
    },
    idempotencyKey: {
        type: String,
        trim: true,
        default: undefined,
        index: true
    }
}, { timestamps: true });

jobSchema.index({ status: 1, runAt: 1, queue: 1 });
jobSchema.index(
    { idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true } } }
);

const Job = mongoose.model('Job', jobSchema);
Job.STATUSES = JOB_STATUSES;

module.exports = Job;
