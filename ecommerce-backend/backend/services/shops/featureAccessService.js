const Shop = require('../../models/Shop');
const { isVerificationSuspension } = require('../vendorVerificationService');
const { getPlanByIdOrNameOrDefault } = require('../billing/billingPlanService');
const { ensureSubscriptionExists } = require('../billing/subscriptionService');
const {
    FEATURE_KEYS,
    getFeatureDefinition,
    assertFeatureKey,
    getPlanFeatureValue
} = require('../../config/subscriptionFeatures');

const LEGACY_DEFAULT_FEATURES = {
    storeBuilder: true,
    analytics: true,
    coupons: true,
    customDomain: false,
    staffAccounts: true,
    bulkProductTools: true,
    growthCenter: true,
    aiAdGenerator: true,
    aiProductCreation: true,
    customerSection: false,
    trustSystem: false,
    notifications: false,
    scheduledProductPublishing: false,
    scheduledSales: false,
    storeBuilderFull: false,
    scheduledBanners: false,
    platformBrandingRemoval: false
};

const BILLING_ALLOWED_STATUSES = new Set(['trialing', 'active', 'past_due', 'grace']);
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

const toPlain = (value) => {
    if (!value) return {};
    if (typeof value.toObject === 'function') return value.toObject();
    return value;
};

const getNestedFeature = (source, featureName) => {
    const plain = toPlain(source);
    return plain?.[featureName];
};

const getEffectivePlanRef = (shop, subscription) => {
    const plainShop = toPlain(shop);
    const plainSubscription = toPlain(subscription);
    const status = plainSubscription?.status || 'active';

    if (status === 'trialing') return 'Starter';

    if (status === 'pending_approval') {
        return plainSubscription.activePlanSlug ||
            plainSubscription.activePlanName ||
            plainSubscription.planId ||
            'Starter';
    }

    return plainSubscription.activePlanSlug ||
        plainSubscription.activePlanName ||
        plainSubscription.planId ||
        plainShop.plan?.activePlanSlug ||
        plainShop.plan?.activePlanName ||
        plainShop.plan?.name ||
        'Starter';
};

const getPlanFeatures = async (shop, subscription = null) => {
    const plan = await getPlanByIdOrNameOrDefault(getEffectivePlanRef(shop, subscription));
    return FEATURE_KEYS.reduce((features, featureName) => {
        features[featureName] = getPlanFeatureValue(plan, featureName);
        return features;
    }, { ...LEGACY_DEFAULT_FEATURES });
};

const computeFeatureStatuses = (shop, planFeatures = LEGACY_DEFAULT_FEATURES, billingStatus = 'active') => {
    const plainShop = toPlain(shop);
    const shopFlags = toPlain(plainShop.featureFlags);
    const shopAvailable = Boolean(plainShop) &&
        plainShop.isActive !== false &&
        plainShop.approvalStatus === 'Approved';
    const billingAllows = BILLING_ALLOWED_STATUSES.has(String(billingStatus || 'active'));

    return FEATURE_KEYS.reduce((acc, featureName) => {
        const definition = assertFeatureKey(featureName);
        let planAllows = getNestedFeature(planFeatures, featureName);
        if (planAllows === undefined) {
            for (const alias of definition.aliases) {
                const aliasValue = getNestedFeature(planFeatures, alias);
                if (aliasValue !== undefined) {
                    planAllows = aliasValue;
                    break;
                }
            }
        }
        const shopOverride = definition.shopOverrideKey
            ? getNestedFeature(shopFlags, definition.shopOverrideKey)
            : undefined;

        const defaultAllows = planAllows !== false;
        const overrideAllows = shopOverride !== false;
        let reason = 'enabled';
        if (!shopAvailable) reason = 'shop_unavailable';
        else if (!billingAllows) reason = 'subscription_inactive';
        else if (!defaultAllows) reason = 'plan_disabled';
        else if (!overrideAllows) reason = 'shop_override_disabled';

        acc[featureName] = {
            feature: featureName,
            enabled: shopAvailable && billingAllows && defaultAllows && overrideAllows,
            reason,
            planAllowed: defaultAllows,
            shopOverride: shopOverride === undefined ? null : shopOverride,
            requiredPlan: definition.requiredPlan,
            label: definition.label,
            upgradeReason: definition.upgradeReason
        };
        return acc;
    }, {});
};

const computeEffectiveFeatures = (shop, planFeatures = LEGACY_DEFAULT_FEATURES, billingStatus = 'active') => {
    const statuses = computeFeatureStatuses(shop, planFeatures, billingStatus);
    return Object.fromEntries(Object.entries(statuses).map(([key, status]) => [key, status.enabled]));
};

const getShopFeatureStatuses = async (shopOrId) => {
    const shop = isShopRecord(shopOrId)
        ? shopOrId
        : await Shop.findById(shopOrId)
            .select('isActive approvalStatus suspensionReason plan featureFlags')
            .lean();

    if (!shop || isVerificationSuspension(shop)) {
        return FEATURE_KEYS.reduce((acc, key) => {
            const definition = getFeatureDefinition(key);
            acc[key] = {
                feature: key,
                enabled: false,
                reason: shop ? 'verification_suspended' : 'shop_not_found',
                planAllowed: false,
                shopOverride: null,
                requiredPlan: definition.requiredPlan,
                label: definition.label,
                upgradeReason: definition.upgradeReason
            };
            return acc;
        }, {});
    }

    const subscription = await ensureSubscriptionExists(shop);
    const planFeatures = await getPlanFeatures(shop, subscription);
    return computeFeatureStatuses(shop, planFeatures, subscription.status);
};

const getShopFeatureFlags = async (shopOrId) => {
    const shop = isShopRecord(shopOrId)
        ? shopOrId
        : await Shop.findById(shopOrId)
            .select('isActive approvalStatus suspensionReason plan featureFlags')
            .lean();

    const statuses = await getShopFeatureStatuses(shop || shopOrId);
    return Object.fromEntries(Object.entries(statuses).map(([key, status]) => [key, status.enabled]));
};

const hasFeature = async (shopOrId, featureName) => {
    const status = await getFeatureStatus(shopOrId, featureName);
    return status.enabled;
};

const canUseFeature = hasFeature;

const getFeatureStatus = async (shopOrId, featureName) => {
    assertFeatureKey(featureName);
    const statuses = await getShopFeatureStatuses(shopOrId);
    return statuses[featureName];
};

module.exports = {
    FEATURE_KEYS,
    LEGACY_DEFAULT_FEATURES,
    BILLING_ALLOWED_STATUSES,
    computeFeatureStatuses,
    computeEffectiveFeatures,
    getEffectivePlanRef,
    getPlanFeatures,
    getShopFeatureStatuses,
    getShopFeatureFlags,
    getFeatureStatus,
    hasFeature,
    canUseFeature
};
