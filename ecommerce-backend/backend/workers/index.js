require('dotenv').config();

const connectDB = require('../config/db');
const {
    claimNextJob,
    completeJob,
    cancelJob,
    failJob
} = require('../services/jobQueueService');
const { processShopEventJob } = require('../services/shopEventNotificationService');
const { processCourierJob } = require('../services/courierJobService');
const { processCustomerEmailCampaignJob } = require('../services/customerEmailCampaignService');
const {
    processBadgeAnalysisJob,
    markBadgeAnalysisFailed
} = require('../services/badges/badgeAnalysisService');
const {
    SCHEDULED_PRODUCT_QUEUE,
    processScheduledProductJob,
    processOverdueScheduledProducts
} = require('../services/products/scheduledProductService');
const {
    LOW_STOCK_ALERT_QUEUE,
    processLowStockAlertJob,
    markLowStockAlertFailed
} = require('../services/inventoryLowStockAlertService');
const { processScheduledSaleStates } = require('../services/sales/scheduledSaleService');
const { processSupportJob } = require('../services/support/supportNotificationService');
const logger = require('../services/logger');
const { cleanupExpiredActivityLogs } = require('../services/billing/activityLogRetentionService');
const { initializeSubscriptionEventHandlers } = require('../services/billing/subscriptionEventHandlers');
const { cleanupExpiredStoreBuilderAssets } = require('../services/storeBuilder/storeBuilderAssetService');
const { hasFeature } = require('../services/shops/featureAccessService');
const { processDueDowngrades } = require('../services/billing/subscriptionDowngradeService');

initializeSubscriptionEventHandlers();

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS || 3000);
let shuttingDown = false;
let nextActivityCleanupAt = 0;
let nextStoreBuilderAssetCleanupAt = 0;
let nextSubscriptionReconciliationAt = 0;

const handlers = {
    notifications: processShopEventJob,
    courier: processCourierJob,
    badges: processBadgeAnalysisJob,
    'customer-email': processCustomerEmailCampaignJob,
    [SCHEDULED_PRODUCT_QUEUE]: processScheduledProductJob,
    [LOW_STOCK_ALERT_QUEUE]: processLowStockAlertJob,
    support: processSupportJob
};

const QUEUE_FEATURES = Object.freeze({
    badges: 'trustSystem',
    'customer-email': 'emailCampaigns',
    [SCHEDULED_PRODUCT_QUEUE]: 'scheduledProductPublishing',
    [LOW_STOCK_ALERT_QUEUE]: 'lowStockAlerts'
});

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
        const requiredFeature = QUEUE_FEATURES[job.queue];
        if (requiredFeature && !(await hasFeature(job.shop_id, requiredFeature))) {
            await cancelJob(job, `${requiredFeature} is not included in the current plan.`);
            logger.info('job_cancelled_plan_blocked', {
                jobId: job._id,
                shopId: job.shop_id,
                queue: job.queue,
                feature: requiredFeature
            });
            return true;
        }

        const result = await handler(job);
        if (result?.cancelled) {
            await cancelJob(job, result.reason || 'Cancelled by handler');
            return true;
        }
        await completeJob(job);
        logger.info('job_completed', { jobId: job._id, queue: job.queue, name: job.name });
    } catch (error) {
        if (job.queue === 'badges') {
            await markBadgeAnalysisFailed(job, error);
        }
        if (job.queue === LOW_STOCK_ALERT_QUEUE && Number(job.attempts || 0) >= Number(job.maxAttempts || 5)) {
            await markLowStockAlertFailed({
                shopId: job.shop_id,
                productId: job.payload?.productId,
                variantId: job.payload?.variantId
            });
        }
        await failJob(job, error);
    }

    return true;
};

const run = async () => {
    await connectDB();
    logger.info('worker_started', { queues: Object.keys(handlers) });

    while (!shuttingDown) {
        const processed = await processNextJob();
        if (!processed) {
            await processOverdueScheduledProducts({ limit: 25 });
            await processScheduledSaleStates({ limit: 50 });
            if (Date.now() >= nextActivityCleanupAt) {
                const cleanup = await cleanupExpiredActivityLogs({ batchSize: 500 });
                nextActivityCleanupAt = Date.now() + (6 * 60 * 60 * 1000);
                logger.info('activity_log_retention_processed', cleanup);
            }
            if (Date.now() >= nextStoreBuilderAssetCleanupAt) {
                const cleanup = await cleanupExpiredStoreBuilderAssets({ limit: 100 });
                nextStoreBuilderAssetCleanupAt = Date.now() + (60 * 60 * 1000);
                logger.info('store_builder_asset_cleanup_processed', cleanup);
            }
            if (Date.now() >= nextSubscriptionReconciliationAt) {
                const reconciliation = await processDueDowngrades({ limit: 20 });
                nextSubscriptionReconciliationAt = Date.now() + (60 * 1000);
                if (reconciliation.processed > 0) {
                    logger.info('subscription_downgrades_processed', reconciliation);
                }
            }
            await sleep(POLL_INTERVAL_MS);
        }
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
