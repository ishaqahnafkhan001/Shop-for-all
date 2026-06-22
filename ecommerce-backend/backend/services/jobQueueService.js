const crypto = require('crypto');
const Job = require('../models/Job');
const logger = require('./logger');

const DEFAULT_LOCK_MS = 5 * 60 * 1000;

const toErrorMessage = (error) => String(error?.message || error || 'Unknown job error').slice(0, 2000);

const getBackoffRunAt = (attempts) => {
    const delayMs = Math.min(15 * 60 * 1000, Math.max(10 * 1000, attempts * attempts * 10 * 1000));
    return new Date(Date.now() + delayMs);
};

const enqueueJob = async ({
    queue,
    name,
    payload = {},
    shop_id = null,
    runAt = new Date(),
    maxAttempts = 5,
    idempotencyKey = ''
}) => {
    try {
        const data = {
            queue,
            name,
            payload,
            shop_id,
            runAt,
            maxAttempts
        };
        if (idempotencyKey) data.idempotencyKey = idempotencyKey;

        const job = await Job.create(data);
        return job;
    } catch (error) {
        if (error?.code === 11000 && idempotencyKey) {
            return Job.findOne({ idempotencyKey });
        }
        throw error;
    }
};

const claimNextJob = async ({ queues = [], lockMs = DEFAULT_LOCK_MS } = {}) => {
    const lockId = crypto.randomUUID();
    const now = new Date();
    const staleLockDate = new Date(Date.now() - lockMs);
    const query = {
        $and: [
            queues.length ? { queue: { $in: queues } } : {},
            {
                $or: [
                    { status: 'queued', runAt: { $lte: now } },
                    { status: 'failed', runAt: { $lte: now } },
                    { status: 'running', lockedAt: { $lte: staleLockDate } }
                ]
            }
        ]
    };

    return Job.findOneAndUpdate(
        query,
        {
            $set: {
                status: 'running',
                lockedAt: now,
                lockId
            },
            $inc: { attempts: 1 }
        },
        {
            new: true,
            sort: { runAt: 1, createdAt: 1 }
        }
    );
};

const completeJob = async (job) => (
    Job.updateOne(
        { _id: job._id, lockId: job.lockId },
        {
            $set: {
                status: 'completed',
                lockedAt: null,
                lockId: '',
                lastError: ''
            }
        }
    )
);

const failJob = async (job, error) => {
    const attempts = Number(job.attempts || 0);
    const maxAttempts = Number(job.maxAttempts || 5);
    const status = attempts >= maxAttempts ? 'dead' : 'failed';
    const runAt = status === 'dead' ? job.runAt : getBackoffRunAt(attempts);

    await Job.updateOne(
        { _id: job._id, lockId: job.lockId },
        {
            $set: {
                status,
                runAt,
                lockedAt: null,
                lockId: '',
                lastError: toErrorMessage(error)
            }
        }
    );

    logger.warn('job_failed', {
        jobId: job._id,
        queue: job.queue,
        name: job.name,
        attempts,
        maxAttempts,
        status,
        error
    });
};

module.exports = {
    enqueueJob,
    claimNextJob,
    completeJob,
    failJob
};
