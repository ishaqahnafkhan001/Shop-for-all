const Subscription = require('../../models/Subscription');
const {
    addDays,
    markPastDue,
    enterGracePeriod,
    suspendForBilling,
    BILLING_SUSPENSION_REASON
} = require('./subscriptionService');
const { processDueDowngrades } = require('./subscriptionDowngradeService');
const {
    acquireLease,
    releaseLease
} = require('../workers/distributedLeaseService');
const { resolveSubscriptionAccess } = require('./subscriptionAccessResolver');

const BILLING_LIFECYCLE_LOCK_KEY = 'billing-lifecycle';

const getBatchSize = (value = process.env.BILLING_LIFECYCLE_BATCH_SIZE) => (
    Math.min(500, Math.max(1, Number(value) || 100))
);

const getLockTimeoutMs = (value = process.env.BILLING_LIFECYCLE_LOCK_TIMEOUT_MS) => (
    Math.max(30_000, Number(value) || 10 * 60 * 1000)
);

const findTrialsEndingSoon = (now = new Date(), limit = 100) => {
    const soon = addDays(now, 3);
    return Subscription.find({
        status: 'trialing',
        trialEndsAt: { $gt: now, $lte: soon }
    }).limit(getBatchSize(limit));
};

const findExpiredTrials = (now = new Date(), limit = 100) => Subscription.find({
    status: 'trialing',
    trialEndsAt: { $lte: now }
}).sort({ trialEndsAt: 1 }).limit(getBatchSize(limit));

const findExpiredActiveSubscriptions = (now = new Date(), limit = 100) => Subscription.find({
    status: 'active',
    currentPeriodEnd: { $lte: now }
}).sort({ currentPeriodEnd: 1 }).limit(getBatchSize(limit));

const findExpiredLegacyPendingPayments = (now = new Date(), limit = 100) => Subscription.find({
    status: 'pending_approval',
    $or: [
        { trialEndsAt: { $lte: now } },
        { currentPeriodEnd: { $lte: now } }
    ]
}).sort({ updatedAt: 1 }).limit(getBatchSize(limit));

const findPastDueSubscriptions = (now = new Date(), limit = 100) => Subscription.find({
    status: 'past_due',
    graceEndsAt: { $lte: now }
}).sort({ graceEndsAt: 1 }).limit(getBatchSize(limit));

const findGraceExpiredSubscriptions = (now = new Date(), limit = 100) => Subscription.find({
    status: 'grace',
    graceEndsAt: { $lte: now }
}).sort({ graceEndsAt: 1 }).limit(getBatchSize(limit));

const processRecords = async (records, transition, resultKey, summary) => {
    for (const subscription of records) {
        try {
            const result = await transition(subscription);
            if (result) summary[resultKey] += 1;
        } catch (error) {
            summary.failures.push({
                subscriptionId: String(subscription._id),
                transition: resultKey,
                error: String(error?.message || error).slice(0, 500)
            });
        }
    }
};

const runBillingLifecycleCheck = async ({
    req = null,
    now = new Date(),
    batchSize = getBatchSize(),
    lockTimeoutMs = getLockTimeoutMs(),
    useLock = true
} = {}) => {
    const lock = useLock
        ? await acquireLease({
            key: BILLING_LIFECYCLE_LOCK_KEY,
            timeoutMs: lockTimeoutMs,
            now
        })
        : { key: BILLING_LIFECYCLE_LOCK_KEY, ownerId: 'unlocked-run' };
    if (!lock) {
        return {
            skipped: true,
            reason: 'lock_not_acquired',
            movedToGrace: 0,
            movedToPastDue: 0,
            suspended: 0,
            failures: []
        };
    }

    const summary = {
        skipped: false,
        startedAt: now,
        batchSize,
        movedToGrace: 0,
        movedToPastDue: 0,
        suspended: 0,
        legacyPendingProcessed: 0,
        downgrades: null,
        failures: []
    };

    try {
        const [
            expiredTrials,
            expiredActive,
            expiredLegacyPending,
            pastDue,
            graceExpired
        ] = await Promise.all([
            findExpiredTrials(now, batchSize),
            findExpiredActiveSubscriptions(now, batchSize),
            findExpiredLegacyPendingPayments(now, batchSize),
            findPastDueSubscriptions(now, batchSize),
            findGraceExpiredSubscriptions(now, batchSize)
        ]);

        await processRecords(
            expiredTrials,
            subscription => enterGracePeriod(subscription, { req, now }),
            'movedToGrace',
            summary
        );
        await processRecords(
            expiredActive,
            subscription => markPastDue(subscription, { req, now }),
            'movedToPastDue',
            summary
        );
        await processRecords(
            expiredLegacyPending,
            async subscription => {
                const access = resolveSubscriptionAccess({ subscription, now });
                if (access.isTrialActive || access.isOperational) return null;
                summary.legacyPendingProcessed += 1;
                if (subscription.trialStartedAt || subscription.trialEndsAt) {
                    return enterGracePeriod(subscription, { req, now });
                }
                return markPastDue(subscription, { req, now });
            },
            'movedToGrace',
            summary
        );
        await processRecords(
            [...pastDue, ...graceExpired],
            subscription => suspendForBilling(subscription, {
                req,
                now,
                reason: BILLING_SUSPENSION_REASON
            }),
            'suspended',
            summary
        );

        summary.downgrades = await processDueDowngrades({ now, limit: batchSize });
        summary.completedAt = new Date();
        await releaseLease(useLock ? lock : null, { summary });
        return summary;
    } catch (error) {
        summary.completedAt = new Date();
        summary.fatalError = String(error?.message || error).slice(0, 1000);
        await releaseLease(useLock ? lock : null, { summary, error });
        throw error;
    }
};

module.exports = {
    BILLING_LIFECYCLE_LOCK_KEY,
    getBatchSize,
    getLockTimeoutMs,
    findTrialsEndingSoon,
    findExpiredTrials,
    findExpiredActiveSubscriptions,
    findExpiredLegacyPendingPayments,
    findPastDueSubscriptions,
    findGraceExpiredSubscriptions,
    runBillingLifecycleCheck
};
