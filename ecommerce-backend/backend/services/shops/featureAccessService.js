const Shop = require('../../models/Shop');
const VendorPlan = require('../../models/VendorPlan');
const { isVerificationSuspension } = require('../vendorVerificationService');
const { getPlanByNameOrDefault } = require('../billing/billingPlanService');
const { ensureSubscriptionExists } = require('../billing/subscriptionService');

const FEATURE_KEYS = [
    'storeBuilder',
    'analytics',
    'coupons',
    'customDomain',
    'staffAccounts',
    'bulkProductTools',
    'growthCenter',
    'aiAdGenerator'
];

const LEGACY_DEFAULT_FEATURES = {
    storeBuilder: true,
    analytics: true,
    coupons: true,
    customDomain: false,
    staffAccounts: true,
    bulkProductTools: true,
    growthCenter: true,
    aiAdGenerator: true
};

const BILLING_ALLOWED_STATUSES = new Set(['trialing', 'active', 'past_due', 'grace']);

const toPlain = (value) => {
    if (!value) return {};
    if (typeof value.toObject === 'function') return value.toObject();
    return value;
};

const getNestedFeature = (source, featureName) => {
    const plain = toPlain(source);
    return plain?.[featureName];
};

const getPlanFeatures = async (shop) => {
    const plainShop = toPlain(shop);
    const embeddedFeatures = plainShop.plan?.features;
    if (embeddedFeatures) {
        return { ...LEGACY_DEFAULT_FEATURES, ...toPlain(embeddedFeatures) };
    }

    const planName = plainShop.plan?.name;
    if (!planName) return { ...LEGACY_DEFAULT_FEATURES };

    const plan = await VendorPlan.findOne({ name: planName, isActive: { $ne: false } })
        .select('features')
        .lean();

    if (!plan) {
        const fallbackPlan = await getPlanByNameOrDefault(planName);
        return {
            ...LEGACY_DEFAULT_FEATURES,
            ...(fallbackPlan?.features || {})
        };
    }

    return {
        ...LEGACY_DEFAULT_FEATURES,
        ...(plan?.features || {})
    };
};

const computeEffectiveFeatures = (shop, planFeatures = LEGACY_DEFAULT_FEATURES, billingStatus = 'active') => {
    const plainShop = toPlain(shop);
    const shopFlags = toPlain(plainShop.featureFlags);
    const shopAvailable = Boolean(plainShop) &&
        plainShop.isActive !== false &&
        plainShop.approvalStatus !== 'Suspended';
    const billingAllows = BILLING_ALLOWED_STATUSES.has(String(billingStatus || 'active'));

    return FEATURE_KEYS.reduce((acc, featureName) => {
        let planAllows = getNestedFeature(planFeatures, featureName);
        let shopOverride = getNestedFeature(shopFlags, featureName);

        if (featureName === 'growthCenter') {
            if (planAllows === undefined) planAllows = getNestedFeature(planFeatures, 'analytics');
            if (shopOverride === undefined) shopOverride = getNestedFeature(shopFlags, 'analytics');
        }

        if (featureName === 'aiAdGenerator') {
            if (planAllows === undefined) planAllows = getNestedFeature(planFeatures, 'growthCenter');
            if (planAllows === undefined) planAllows = getNestedFeature(planFeatures, 'analytics');
            if (shopOverride === undefined) shopOverride = getNestedFeature(shopFlags, 'growthCenter');
            if (shopOverride === undefined) shopOverride = getNestedFeature(shopFlags, 'analytics');
        }

        const defaultAllows = planAllows !== false;
        const overrideAllows = shopOverride !== false;
        acc[featureName] = shopAvailable && billingAllows && defaultAllows && overrideAllows;
        return acc;
    }, {});
};

const getShopFeatureFlags = async (shopOrId) => {
    const shop = typeof shopOrId === 'object' && shopOrId?._id
        ? shopOrId
        : await Shop.findById(shopOrId)
            .select('isActive approvalStatus suspensionReason plan featureFlags')
            .lean();

    if (!shop || isVerificationSuspension(shop)) {
        return FEATURE_KEYS.reduce((acc, key) => ({ ...acc, [key]: false }), {});
    }

    const subscription = await ensureSubscriptionExists(shop);
    const planFeatures = await getPlanFeatures(shop);
    return computeEffectiveFeatures(shop, planFeatures, subscription.status);
};

const hasFeature = async (shopOrId, featureName) => {
    const features = await getShopFeatureFlags(shopOrId);
    return Boolean(features[featureName]);
};

module.exports = {
    FEATURE_KEYS,
    LEGACY_DEFAULT_FEATURES,
    BILLING_ALLOWED_STATUSES,
    computeEffectiveFeatures,
    getPlanFeatures,
    getShopFeatureFlags,
    hasFeature
};
