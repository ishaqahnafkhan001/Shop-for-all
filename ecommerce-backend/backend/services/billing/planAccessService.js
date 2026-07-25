const Shop = require('../../models/Shop');
const { PLAN_ORDER } = require('../../config/subscriptionPlans');
const { getFeatureDefinition, getPlanFeatureValue } = require('../../config/subscriptionFeatures');
const { ensureSubscriptionExists } = require('./subscriptionService');
const { getPlanByIdOrNameOrDefault, getPlanLimits, getPlanSlug } = require('./billingPlanService');
const {
    computeFeatureStatuses,
    getEffectivePlanRef,
    getPlanFeatures
} = require('../shops/featureAccessService');
const { getSubscriptionUsage, toLegacyUsageShape } = require('./subscriptionUsageService');
const { buildRichQuotaError } = require('./quotaResponseService');

const getShopId = (shopOrId) => shopOrId?._id || shopOrId;
const isShopRecord = (value) => Boolean(
    value &&
    typeof value === 'object' &&
    value._id &&
    (
        typeof value.toObject === 'function' ||
        Object.prototype.hasOwnProperty.call(value, 'shopName') ||
        Object.prototype.hasOwnProperty.call(value, 'plan')
    )
);

const getUpgradePlan = (currentPlan, requiredPlan = null) => {
    if (requiredPlan) return requiredPlan;
    const index = PLAN_ORDER.indexOf(getPlanSlug(currentPlan));
    return index >= 0 && index < PLAN_ORDER.length - 1 ? PLAN_ORDER[index + 1] : null;
};

const getLowestEligiblePlan = async (currentPlan, feature) => {
    const currentKey = getPlanSlug(currentPlan);
    const currentIndex = PLAN_ORDER.indexOf(currentKey);
    const candidates = currentIndex >= 0 ? PLAN_ORDER.slice(currentIndex + 1) : PLAN_ORDER;

    for (const planKey of candidates) {
        const plan = await getPlanByIdOrNameOrDefault(planKey);
        if (getPlanFeatureValue(plan, feature)) return getPlanSlug(plan);
    }

    return null;
};

const getLowestEligiblePlanForLimit = async (currentPlan, limitKey, currentLimit) => {
    const currentKey = getPlanSlug(currentPlan);
    const currentIndex = PLAN_ORDER.indexOf(currentKey);
    const candidates = currentIndex >= 0 ? PLAN_ORDER.slice(currentIndex + 1) : PLAN_ORDER;
    const numericCurrentLimit = currentLimit === null ? null : Number(currentLimit);

    for (const planKey of candidates) {
        const plan = await getPlanByIdOrNameOrDefault(planKey);
        const candidateLimit = plan.limits?.[limitKey] ?? plan[limitKey] ?? null;
        if (
            candidateLimit === null ||
            (numericCurrentLimit !== null && Number(candidateLimit) > numericCurrentLimit)
        ) {
            return getPlanSlug(plan);
        }
    }

    return null;
};

const getShopPlanAccess = async (shopOrId, { includeUsage = false } = {}) => {
    const shop = isShopRecord(shopOrId)
        ? shopOrId
        : await Shop.findById(shopOrId)
            .select('shopName plan featureFlags isActive approvalStatus suspensionReason customDomain badgeStatus')
            .lean();
    if (!shop) {
        const error = new Error('Shop not found');
        error.statusCode = 404;
        error.code = 'SHOP_NOT_FOUND';
        throw error;
    }

    const subscription = await ensureSubscriptionExists(shop);
    const plan = await getPlanByIdOrNameOrDefault(getEffectivePlanRef(shop, subscription));
    const planFeatures = await getPlanFeatures(shop, subscription);
    const featureStatuses = computeFeatureStatuses(shop, planFeatures, subscription.status);
    const effectiveFeatures = Object.fromEntries(
        Object.entries(featureStatuses).map(([key, status]) => [key, status.enabled])
    );
    const limits = await getPlanLimits(plan);
    const context = {
        shop,
        subscription,
        plan,
        planKey: getPlanSlug(plan),
        planName: plan.name,
        limits,
        features: effectiveFeatures,
        featureStatuses,
        storeBuilderAccess: plan.storeBuilderAccess || 'limited',
        storeBuilderCapabilities: plan.storeBuilderCapabilities || {},
        subscriptionStatus: subscription.status,
        shopOperational: shop.isActive !== false && shop.approvalStatus === 'Approved'
    };

    if (includeUsage) {
        const usagePayload = await getSubscriptionUsage(getShopId(shop), { access: context });
        context.usage = toLegacyUsageShape(usagePayload);
        context.usageDetails = usagePayload.usage;
        context.warnings = usagePayload.warnings;
    }

    return context;
};

const buildFeatureError = async (context, feature) => {
    const definition = getFeatureDefinition(feature);
    const requiredPlan = await getLowestEligiblePlan(context.plan, feature);
    const label = definition?.label || String(feature || 'feature')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, value => value.toUpperCase());
    return {
        success: false,
        code: 'FEATURE_NOT_INCLUDED',
        errorCode: `${String(feature || 'feature').replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}_NOT_AVAILABLE`,
        error: `${label} is not available on your current plan.`,
        message: `${label} is available on the ${requiredPlan ? requiredPlan[0].toUpperCase() + requiredPlan.slice(1) : 'higher'} plan.`,
        feature,
        currentPlan: context.planKey,
        requiredPlan,
        recommendedPlan: requiredPlan,
        upgradeReason: definition?.upgradeReason || `Unlock ${label}`,
        featureStatus: context.featureStatuses?.[feature] || null,
        upgrade: {
            recommended: requiredPlan,
            reason: definition?.upgradeReason || `Unlock ${label}`
        }
    };
};

const LIMIT_RESOURCE_MAP = Object.freeze({
    productCount: 'products',
    staffAccounts: 'staff',
    aiProductCreationsPerWeek: 'aiGeneration',
    imagesPerProduct: 'images'
});

const buildLimitError = async (context, limitKey, usage, limit) => {
    const used = typeof usage === 'object' ? usage?.used : usage;
    const result = buildRichQuotaError({
        context,
        resource: LIMIT_RESOURCE_MAP[limitKey] || limitKey,
        used,
        limit,
        message: `You have reached the ${limit} ${String(limitKey).replace(/([A-Z])/g, ' $1').toLowerCase()} limit of the ${context.planName} plan.`
    });
    const recommended = await getLowestEligiblePlanForLimit(context.plan, limitKey, limit);
    return {
        ...result,
        recommendedPlan: recommended,
        upgrade: {
            ...result.upgrade,
            recommended
        },
        limitKey,
        // Temporary aliases used by existing admin screens.
        usage: typeof usage === 'object' ? { ...result.usage, ...usage } : result.usage,
        upgradePlan: recommended
    };
};

const hasPlanFeature = async (shopOrId, feature) => {
    const context = await getShopPlanAccess(shopOrId);
    return Boolean(context.features[feature]);
};

const getPlanLimit = async (shopOrId, limitKey) => {
    const context = await getShopPlanAccess(shopOrId);
    return context.limits[limitKey] ?? null;
};

module.exports = {
    getShopPlanAccess,
    hasPlanFeature,
    getPlanLimit,
    getUpgradePlan,
    getLowestEligiblePlan,
    getLowestEligiblePlanForLimit,
    buildFeatureError,
    buildLimitError
};
