const crypto = require('crypto');
const Subscription = require('../../models/Subscription');
const Product = require('../../models/Product');
const Shop = require('../../models/Shop');
const { PLAN_ORDER } = require('../../config/subscriptionPlans');
const {
    getPlanByIdOrNameOrDefault,
    getPlanSlug
} = require('./billingPlanService');
const { reconcileShopPlan, buildRetentionSelection } = require('./subscriptionReconciliationService');
const { emitSubscriptionEvent, SUBSCRIPTION_EVENTS } = require('./subscriptionEvents');
const { logPlatformAudit } = require('../platformAuditLogService');
const cache = require('../cacheService');

const normalizeIds = (values = []) => [...new Set(
    (Array.isArray(values) ? values : [])
        .map(value => String(value || '').trim())
        .filter(value => /^[a-f\d]{24}$/i.test(value))
)];

const getCurrentPlanKey = (subscription) => (
    subscription.activePlanSlug ||
    subscription.activePlanName ||
    subscription.planId ||
    'starter'
);

const getDowngradePreview = async ({
    shopId,
    targetPlanRef,
    retainedProductIds = []
}) => {
    const subscription = await Subscription.findOne({ shopId });
    if (!subscription) {
        const error = new Error('Subscription not found.');
        error.statusCode = 404;
        throw error;
    }
    if (subscription.status !== 'active') {
        const error = new Error('Plan downgrades can only be scheduled for an active subscription.');
        error.statusCode = 409;
        error.code = 'SUBSCRIPTION_NOT_ACTIVE';
        throw error;
    }

    const [currentPlan, targetPlan, products] = await Promise.all([
        getPlanByIdOrNameOrDefault(getCurrentPlanKey(subscription)),
        getPlanByIdOrNameOrDefault(targetPlanRef),
        Product.find({
            shop_id: shopId,
            isDeleted: { $ne: true },
            $or: [
                { status: { $ne: 'Archived' } },
                { 'planArchive.active': true }
            ]
        }).select('_id title status isActive updatedAt planArchive').lean()
    ]);
    const currentPlanKey = getPlanSlug(currentPlan);
    const targetPlanKey = getPlanSlug(targetPlan);
    if (PLAN_ORDER.indexOf(targetPlanKey) >= PLAN_ORDER.indexOf(currentPlanKey)) {
        const error = new Error('The selected plan is not a downgrade from the current plan.');
        error.statusCode = 400;
        error.code = 'INVALID_DOWNGRADE_TARGET';
        throw error;
    }

    const productLimit = targetPlan.limits?.productCount ?? targetPlan.productLimit ?? null;
    const normalizedRetained = normalizeIds(retainedProductIds);
    const productIdSet = new Set(products.map(product => String(product._id)));
    const invalidRetainedIds = normalizedRetained.filter(id => !productIdSet.has(id));
    if (invalidRetainedIds.length) {
        const error = new Error('One or more retained products do not belong to this shop.');
        error.statusCode = 400;
        error.code = 'INVALID_RETAINED_PRODUCTS';
        throw error;
    }
    if (productLimit !== null && normalizedRetained.length > Number(productLimit)) {
        const error = new Error(`Select no more than ${productLimit} products to retain.`);
        error.statusCode = 400;
        error.code = 'RETAINED_PRODUCT_LIMIT_EXCEEDED';
        throw error;
    }

    const selection = buildRetentionSelection({
        products,
        limit: productLimit,
        retainedProductIds: normalizedRetained
    });
    const retainedSet = new Set(selection.selectedIds.map(String));

    return {
        subscription,
        currentPlan,
        targetPlan,
        effectiveAt: subscription.currentPeriodEnd || new Date(),
        requiresProductSelection: productLimit !== null && products.length > Number(productLimit),
        productCount: products.length,
        productLimit,
        selectedProductCount: normalizedRetained.length,
        availableProducts: products
            .sort((left, right) => {
                const leftSelected = retainedSet.has(String(left._id)) ? 0 : 1;
                const rightSelected = retainedSet.has(String(right._id)) ? 0 : 1;
                return leftSelected - rightSelected || String(left.title || '').localeCompare(String(right.title || ''));
            })
            .map(product => ({
                id: product._id,
                title: product.title,
                status: product.planArchive?.active
                    ? product.planArchive.previousStatus
                    : product.status,
                selectedByDefault: retainedSet.has(String(product._id))
            })),
        retainedProducts: products
            .filter(product => retainedSet.has(String(product._id)))
            .map(product => ({
                id: product._id,
                title: product.title,
                status: product.planArchive?.active
                    ? product.planArchive.previousStatus
                    : product.status
            })),
        productsToArchive: Math.max(0, products.length - selection.selectedIds.length),
        requestedRetainedProductIds: normalizedRetained,
        resolvedRetainedProductIds: selection.selectedIds,
        effects: {
            productLimit,
            imagesPerProduct: targetPlan.limits?.imagesPerProduct ?? null,
            staffLimit: targetPlan.limits?.staffAccounts ?? null,
            customDomainDisabled: targetPlan.features?.customDomain === false,
            storeBuilderDisabled: targetPlan.features?.storeBuilder === false,
            scheduledPublishingPaused: targetPlan.features?.scheduledProductPublishing === false,
            scheduledSalesEnded: targetPlan.features?.scheduledSales === false,
            lowStockAlertsDisabled: targetPlan.features?.lowStockAlerts === false
        }
    };
};

const scheduleDowngrade = async ({
    shopId,
    targetPlanRef,
    retainedProductIds = [],
    req = null,
    forceImmediate = false,
    reason = ''
}) => {
    const preview = await getDowngradePreview({
        shopId,
        targetPlanRef,
        retainedProductIds
    });
    if (
        preview.requiresProductSelection &&
        !forceImmediate &&
        preview.requestedRetainedProductIds.length === 0
    ) {
        const error = new Error(
            `Select up to ${preview.productLimit} products to keep before scheduling this downgrade.`
        );
        error.statusCode = 409;
        error.code = 'DOWNGRADE_SELECTION_REQUIRED';
        error.preview = preview;
        throw error;
    }

    const now = new Date();
    const operationId = crypto.randomUUID();
    const effectiveAt = forceImmediate ? now : new Date(preview.effectiveAt);
    const subscription = preview.subscription;
    subscription.pendingPlanId = preview.targetPlan._id || null;
    subscription.pendingPlanName = preview.targetPlan.name;
    subscription.pendingPlanSlug = getPlanSlug(preview.targetPlan);
    subscription.pendingPlanEffectiveAt = effectiveAt;
    subscription.reconciliation = {
        operationId,
        targetPlanId: preview.targetPlan._id || null,
        targetPlanName: preview.targetPlan.name,
        targetPlanSlug: getPlanSlug(preview.targetPlan),
        retainedProductIds: preview.resolvedRetainedProductIds,
        status: 'pending',
        attempts: 0,
        maxAttempts: 6,
        reconciliationType: 'downgrade',
        lastAttemptAt: null,
        nextRetryAt: effectiveAt,
        lastError: '',
        scheduledAt: now,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        forced: Boolean(forceImmediate),
        requestedBy: req?.user?._id || req?.user?.id || null,
        requestId: req?.requestId || req?.id || '',
        reason: String(reason || '').slice(0, 500),
        summary: null
    };
    await subscription.save();

    await logPlatformAudit({
        req,
        action: 'billing.downgrade_scheduled',
        entityType: 'Subscription',
        entityId: subscription._id,
        shop_id: shopId,
        message: `Plan downgrade to ${preview.targetPlan.name} scheduled`,
        reason,
        metadata: {
            operationId,
            effectiveAt,
            targetPlanKey: getPlanSlug(preview.targetPlan),
            retainedProductIds: preview.resolvedRetainedProductIds
        }
    });

    if (forceImmediate) {
        return executeScheduledDowngrade({ subscriptionId: subscription._id, req, now });
    }
    return subscription;
};

const cancelScheduledDowngrade = async ({ shopId, req = null, reason = '' }) => {
    const subscription = await Subscription.findOne({
        shopId,
        'reconciliation.status': { $in: ['pending', 'failed'] }
    });
    if (!subscription) return null;

    subscription.pendingPlanId = null;
    subscription.pendingPlanName = '';
    subscription.pendingPlanSlug = '';
    subscription.pendingPlanEffectiveAt = null;
    subscription.reconciliation.status = 'cancelled';
    subscription.reconciliation.cancelledAt = new Date();
    subscription.reconciliation.reason = String(
        reason || subscription.reconciliation.reason || ''
    ).slice(0, 500);
    await subscription.save();

    await logPlatformAudit({
        req,
        action: 'billing.downgrade_cancelled',
        entityType: 'Subscription',
        entityId: subscription._id,
        shop_id: shopId,
        message: 'Scheduled plan downgrade cancelled',
        reason
    });
    return subscription;
};

const executeScheduledDowngrade = async ({
    subscriptionId,
    req = null,
    now = new Date()
}) => {
    const subscription = await Subscription.findOneAndUpdate(
        {
            _id: subscriptionId,
            'reconciliation.status': { $in: ['pending', 'failed'] },
            pendingPlanEffectiveAt: { $lte: now },
            $or: [
                { 'reconciliation.nextRetryAt': null },
                { 'reconciliation.nextRetryAt': { $lte: now } }
            ],
            $expr: {
                $lt: [
                    '$reconciliation.attempts',
                    { $ifNull: ['$reconciliation.maxAttempts', 6] }
                ]
            }
        },
        {
            $set: {
                'reconciliation.status': 'running',
                'reconciliation.startedAt': now,
                'reconciliation.lastAttemptAt': now,
                'reconciliation.lastError': ''
            },
            $inc: { 'reconciliation.attempts': 1 }
        },
        { new: true }
    );
    if (!subscription) return null;

    const previousPlanKey = subscription.activePlanSlug || 'starter';
    try {
        const targetPlan = await getPlanByIdOrNameOrDefault(
            subscription.reconciliation.targetPlanId ||
            subscription.reconciliation.targetPlanSlug ||
            subscription.pendingPlanId ||
            subscription.pendingPlanSlug
        );
        const summary = await reconcileShopPlan({
            shopId: subscription.shopId,
            planKey: getPlanSlug(targetPlan),
            plan: targetPlan,
            retainedProductIds: subscription.reconciliation.retainedProductIds,
            operationId: subscription.reconciliation.operationId
        });

        subscription.planId = targetPlan._id || subscription.pendingPlanId || null;
        subscription.activePlanName = targetPlan.name;
        subscription.activePlanSlug = getPlanSlug(targetPlan);
        subscription.pendingPlanId = null;
        subscription.pendingPlanName = '';
        subscription.pendingPlanSlug = '';
        subscription.pendingPlanEffectiveAt = null;
        subscription.reconciliation.status = 'completed';
        subscription.reconciliation.completedAt = new Date();
        subscription.reconciliation.nextRetryAt = null;
        subscription.reconciliation.lastError = '';
        subscription.reconciliation.summary = summary;
        subscription.entitlementVersion = Math.max(
            0,
            Number(subscription.entitlementVersion) || 0
        ) + 1;
        await subscription.save();

        await Shop.updateOne(
            { _id: subscription.shopId },
            {
                $set: {
                    'plan.name': targetPlan.name,
                    'plan.status': 'Active',
                    'plan.productLimit': targetPlan.limits?.productCount ?? targetPlan.productLimit ?? null,
                    'plan.activePlanName': targetPlan.name,
                    'plan.activePlanSlug': getPlanSlug(targetPlan)
                }
            }
        );

        await Promise.all([
            cache.delPattern(`storefront:*:${subscription.shopId}:*`),
            cache.delPattern(`admin:dashboard-overview:${subscription.shopId}:*`),
            cache.del(`subscription:usage:${subscription.shopId}`)
        ]);
        await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.PLAN_DOWNGRADED, {
            req,
            shopId: subscription.shopId,
            subscriptionId: subscription._id,
            planKey: subscription.activePlanSlug,
            oldValue: { planKey: previousPlanKey },
            newValue: {
                planKey: subscription.activePlanSlug,
                planName: subscription.activePlanName
            },
            affectedResources: ['subscription', 'plan', 'features', 'quotas'],
            metadata: {
                operationId: subscription.reconciliation.operationId,
                reconciliationSummary: summary
            }
        });
        return subscription;
    } catch (error) {
        const attempts = Number(subscription.reconciliation.attempts) || 1;
        const maxAttempts = Number(subscription.reconciliation.maxAttempts) || 6;
        subscription.reconciliation.status = 'failed';
        subscription.reconciliation.lastError = String(error?.message || error).slice(0, 1000);
        subscription.reconciliation.nextRetryAt = attempts >= maxAttempts
            ? null
            : new Date(now.getTime() + Math.min(
                6 * 60 * 60 * 1000,
                (2 ** Math.max(0, attempts - 1)) * 30 * 1000
            ));
        await subscription.save();
        if (attempts >= maxAttempts) {
            await logPlatformAudit({
                action: 'billing.downgrade_reconciliation_exhausted',
                entityType: 'Subscription',
                entityId: subscription._id,
                shop_id: subscription.shopId,
                message: 'Scheduled downgrade reconciliation exhausted automatic retries',
                reason: subscription.reconciliation.lastError,
                severity: 'critical',
                metadata: {
                    operationId: subscription.reconciliation.operationId,
                    attempts
                }
            });
        }
        throw error;
    }
};

const processDueDowngrades = async ({ limit = 20, now = new Date() } = {}) => {
    const due = await Subscription.find({
        'reconciliation.status': { $in: ['pending', 'failed'] },
        pendingPlanEffectiveAt: { $lte: now },
        $or: [
            { 'reconciliation.nextRetryAt': null },
            { 'reconciliation.nextRetryAt': { $lte: now } }
        ],
        $expr: {
            $lt: [
                '$reconciliation.attempts',
                { $ifNull: ['$reconciliation.maxAttempts', 6] }
            ]
        }
    }).select('_id').sort({ pendingPlanEffectiveAt: 1 }).limit(limit).lean();

    let completed = 0;
    let failed = 0;
    for (const item of due) {
        try {
            const result = await executeScheduledDowngrade({
                subscriptionId: item._id,
                now
            });
            if (result) completed += 1;
        } catch {
            failed += 1;
        }
    }
    return { processed: due.length, completed, failed };
};

module.exports = {
    normalizeIds,
    getDowngradePreview,
    scheduleDowngrade,
    cancelScheduledDowngrade,
    executeScheduledDowngrade,
    processDueDowngrades
};
