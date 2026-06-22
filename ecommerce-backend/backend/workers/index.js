require('dotenv').config();

const connectDB = require('../config/db');
const {
    claimNextJob,
    completeJob,
    failJob
} = require('../services/jobQueueService');
const { processShopEventJob } = require('../services/shopEventNotificationService');
const { processPathaoSyncJob } = require('../services/pathaoSyncJobService');
const logger = require('../services/logger');

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || 3000);
let shuttingDown = false;

const handlers = {
    notifications: processShopEventJob,
    courier: processPathaoSyncJob
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const processNextJob = async () => {
    const job = await claimNextJob({ queues: Object.keys(handlers) });
    if (!job) return false;

    const handler = handlers[job.queue];
    if (!handler) {
        await failJob(job, new Error(`No handler registered for queue ${job.queue}`));
        return true;
    }

    try {
        await handler(job);
        await completeJob(job);
        logger.info('job_completed', { jobId: job._id, queue: job.queue, name: job.name });
    } catch (error) {
        await failJob(job, error);
    }

    return true;
};

const run = async () => {
    await connectDB();
    logger.info('worker_started', { queues: Object.keys(handlers) });

    while (!shuttingDown) {
        const processed = await processNextJob();
        if (!processed) await sleep(POLL_INTERVAL_MS);
    }

    logger.info('worker_stopped');
    process.exit(0);
};

process.on('SIGINT', () => { shuttingDown = true; });
process.on('SIGTERM', () => { shuttingDown = true; });

run().catch(error => {
    logger.error('worker_fatal', { error });
    process.exit(1);
});
