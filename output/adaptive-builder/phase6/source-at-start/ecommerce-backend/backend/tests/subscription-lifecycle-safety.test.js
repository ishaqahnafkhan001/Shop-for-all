const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    PLAN_CONFIG_VERSION,
    PLAN_DEFINITIONS
} = require('../config/subscriptionPlans');
const {
    getPlanFeatureValue,
    validatePlanCapabilityMatrix
} = require('../config/subscriptionFeatures');
const {
    resolveSubscriptionAccess
} = require('../services/billing/subscriptionAccessResolver');
const {
    buildPlanUpdate
} = require('../scripts/sync-subscription-plans');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('pending payment review preserves active Beginner trial entitlements only', () => {
    const now = new Date('2026-07-26T10:00:00.000Z');
    const access = resolveSubscriptionAccess({
        now,
        subscription: {
            status: 'trialing',
            paymentReviewStatus: 'pending_approval',
            activePlanSlug: 'beginner',
            pendingPlanSlug: 'growth',
            trialStartedAt: new Date('2026-07-20T10:00:00.000Z'),
            trialEndsAt: new Date('2026-08-03T10:00:00.000Z'),
            entitlementVersion: 4
        }
    });

    assert.equal(access.effectivePlan, 'beginner');
    assert.equal(access.subscriptionStatus, 'trialing');
    assert.equal(access.paymentReviewStatus, 'pending_approval');
    assert.equal(access.isTrialActive, true);
    assert.equal(access.isOperational, true);
    assert.equal(access.entitlementVersion, 4);
});

test('legacy pending approval cannot extend access beyond trial expiry', () => {
    const access = resolveSubscriptionAccess({
        now: new Date('2026-08-04T10:00:00.000Z'),
        subscription: {
            status: 'pending_approval',
            activePlanSlug: 'beginner',
            pendingPlanSlug: 'growth',
            trialStartedAt: new Date('2026-07-20T10:00:00.000Z'),
            trialEndsAt: new Date('2026-08-03T10:00:00.000Z')
        }
    });

    assert.equal(access.effectivePlan, 'beginner');
    assert.equal(access.subscriptionStatus, 'pending_approval_expired');
    assert.equal(access.paymentReviewStatus, 'pending_approval');
    assert.equal(access.isTrialActive, false);
    assert.equal(access.isOperational, false);
});

test('legacy active subscriptions remain operational without activatedAt', () => {
    const now = new Date('2026-07-26T00:00:00.000Z');
    const access = resolveSubscriptionAccess({
        subscription: {
            status: 'active',
            activePlanSlug: 'pro',
            currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
            currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z')
        },
        now
    });

    assert.equal(access.subscriptionStatus, 'active');
    assert.equal(access.isOperational, true);
    assert.equal(access.effectivePlan, 'pro');
});

test('legacy Trial plan markers resolve to Beginner without rewriting real paid plan references', () => {
    const trialAccess = resolveSubscriptionAccess({
        subscription: {
            status: 'trialing',
            activePlanName: 'Trial',
            trialStartedAt: new Date('2026-07-01T00:00:00.000Z'),
            trialEndsAt: new Date('2026-07-15T00:00:00.000Z')
        },
        now: new Date('2026-07-05T00:00:00.000Z')
    });
    const paidAccess = resolveSubscriptionAccess({
        subscription: {
            status: 'active',
            activePlanSlug: 'growth',
            activatedAt: new Date('2026-07-01T00:00:00.000Z'),
            currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z')
        },
        now: new Date('2026-07-05T00:00:00.000Z')
    });

    assert.equal(trialAccess.effectivePlan, 'beginner');
    assert.equal(paidAccess.effectivePlan, 'growth');
});

test('capability registry is default-deny and canonical plans are complete', () => {
    assert.equal(getPlanFeatureValue({ features: {} }, 'homepageSeo'), false);
    assert.deepEqual(validatePlanCapabilityMatrix(PLAN_DEFINITIONS), []);

    const incomplete = {
        demo: {
            features: {
                madeUpCapability: true
            }
        }
    };
    const errors = validatePlanCapabilityMatrix(incomplete);
    assert.ok(errors.some(error => error.includes('unknown capability')));
    assert.ok(errors.some(error => error.includes('missing capability')));
});

test('plan synchronization applies security config version and preserves commercial values', () => {
    const existing = {
        monthlyPrice: 1234,
        yearlyPrice: 12000,
        currency: 'BDT',
        limits: {
            ...PLAN_DEFINITIONS.starter.limits,
            productCount: 125
        },
        features: { storeBuilder: false },
        planConfigVersion: PLAN_CONFIG_VERSION
    };
    const update = buildPlanUpdate(PLAN_DEFINITIONS.starter, existing);
    assert.equal(update.monthlyPrice, 1234);
    assert.equal(update.yearlyPrice, 12000);
    assert.equal(update.limits.productCount, 125);
    assert.equal(update.features.storeBuilder, false);
    assert.equal(update.features.homepageSeo, true);
    assert.equal(update.planConfigVersion, PLAN_CONFIG_VERSION);

    const stale = buildPlanUpdate(PLAN_DEFINITIONS.beginner, {
        ...existing,
        features: { storeBuilder: true },
        planConfigVersion: PLAN_CONFIG_VERSION - 1
    });
    assert.equal(stale.features.storeBuilder, false);
});

test('worker runs lock-protected lifecycle and handlers recheck before side effects', () => {
    const worker = read('workers/index.js');
    const lifecycle = read('services/billing/billingLifecycleService.js');
    const lease = read('services/workers/distributedLeaseService.js');
    const entitlement = read('services/workers/jobEntitlementService.js');
    const campaign = read('services/customerEmailCampaignService.js');
    const courier = read('services/courierJobService.js');
    const lowStock = read('services/inventoryLowStockAlertService.js');

    assert.match(worker, /BILLING_LIFECYCLE_INTERVAL_MS/);
    assert.match(worker, /runBillingLifecycleCheck/);
    assert.match(lifecycle, /acquireLease/);
    assert.match(lifecycle, /BILLING_LIFECYCLE_BATCH_SIZE/);
    assert.match(lease, /lockedUntil:\s*\{\s*\$lte:\s*now/);
    assert.match(entitlement, /expectedEntitlementVersion/);
    assert.match(entitlement, /status:\s*'cancelled'/);
    assert.match(campaign, /assertJobEntitlementStillValid/);
    assert.match(courier, /assertJobEntitlementStillValid/);
    assert.match(lowStock, /assertJobEntitlementStillValid/);
});

test('subscription and job schemas persist payment, reconciliation, and entitlement safety state', () => {
    const subscriptionModel = read('models/Subscription.js');
    const jobModel = read('models/Job.js');
    const vendorPlanModel = read('models/VendorPlan.js');

    assert.match(subscriptionModel, /paymentReviewStatus/);
    assert.match(subscriptionModel, /entitlementVersion/);
    assert.match(subscriptionModel, /reconciliationType/);
    assert.match(subscriptionModel, /nextRetryAt/);
    assert.match(jobModel, /entitlementVersion/);
    assert.match(vendorPlanModel, /planConfigVersion/);
    assert.match(vendorPlanModel, /lastSyncedAt/);
});
