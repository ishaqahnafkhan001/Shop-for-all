/**
 * @typedef {Object} SubscriptionFeatureDefinition
 * @property {string} key
 * @property {string} label
 * @property {'starter'|'growth'|'pro'|null} requiredPlan
 * @property {string} upgradeReason
 * @property {string|null} [shopOverrideKey]
 * @property {string[]} [aliases]
 * @property {string|null} [capabilityKey]
 * @property {'limited'|'full'|null} [storeBuilderAccess]
 */

const defineFeature = (key, definition) => Object.freeze({
    key,
    label: definition.label,
    requiredPlan: definition.requiredPlan ?? null,
    upgradeReason: definition.upgradeReason || `Unlock ${definition.label}`,
    shopOverrideKey: definition.shopOverrideKey === undefined ? key : definition.shopOverrideKey,
    aliases: Object.freeze(definition.aliases || []),
    capabilityKey: definition.capabilityKey || null,
    storeBuilderAccess: definition.storeBuilderAccess || null
});

const FEATURE_REGISTRY = Object.freeze({
    storeBuilder: defineFeature('storeBuilder', { label: 'Store Builder', requiredPlan: 'starter' }),
    storeBuilderFull: defineFeature('storeBuilderFull', {
        label: 'Full Store Builder',
        requiredPlan: 'growth',
        storeBuilderAccess: 'full',
        shopOverrideKey: 'storeBuilder'
    }),
    scheduledBanners: defineFeature('scheduledBanners', {
        label: 'Scheduled banners',
        requiredPlan: 'growth',
        capabilityKey: 'scheduledBanners',
        shopOverrideKey: 'storeBuilder'
    }),
    analytics: defineFeature('analytics', { label: 'Analytics', requiredPlan: 'starter' }),
    coupons: defineFeature('coupons', { label: 'Coupons', requiredPlan: 'starter' }),
    customDomain: defineFeature('customDomain', { label: 'Custom domain', requiredPlan: 'growth' }),
    staffAccounts: defineFeature('staffAccounts', { label: 'Staff accounts', requiredPlan: 'starter' }),
    bulkProductTools: defineFeature('bulkProductTools', { label: 'Catalog tools', requiredPlan: 'growth' }),
    growthCenter: defineFeature('growthCenter', {
        label: 'Growth Center',
        requiredPlan: 'growth',
        aliases: ['analytics']
    }),
    aiAdGenerator: defineFeature('aiAdGenerator', {
        label: 'AI ad generator',
        requiredPlan: 'growth',
        aliases: ['growthCenter', 'analytics']
    }),
    aiProductCreation: defineFeature('aiProductCreation', {
        label: 'AI product creation',
        requiredPlan: 'starter',
        shopOverrideKey: null
    }),
    customerSection: defineFeature('customerSection', { label: 'Customer management', requiredPlan: 'growth' }),
    trustSystem: defineFeature('trustSystem', { label: 'Trust system', requiredPlan: 'growth' }),
    notifications: defineFeature('notifications', { label: 'Notification Center', requiredPlan: 'growth' }),
    scheduledProductPublishing: defineFeature('scheduledProductPublishing', {
        label: 'Scheduled product publishing',
        requiredPlan: 'pro'
    }),
    scheduledSales: defineFeature('scheduledSales', { label: 'Scheduled sales', requiredPlan: 'growth' }),
    platformBrandingRemoval: defineFeature('platformBrandingRemoval', {
        label: 'Remove Scaleup branding',
        requiredPlan: 'growth',
        shopOverrideKey: null
    })
});

const FEATURE_KEYS = Object.freeze(Object.keys(FEATURE_REGISTRY));

const getFeatureDefinition = (featureKey) => FEATURE_REGISTRY[String(featureKey || '')] || null;

const assertFeatureKey = (featureKey) => {
    const definition = getFeatureDefinition(featureKey);
    if (!definition) {
        const error = new Error(`Unknown subscription feature: ${featureKey}`);
        error.code = 'UNKNOWN_SUBSCRIPTION_FEATURE';
        throw error;
    }
    return definition;
};

const getPlanFeatureValue = (plan = {}, featureKey) => {
    const definition = assertFeatureKey(featureKey);
    if (definition.storeBuilderAccess) {
        return plan.storeBuilderAccess === definition.storeBuilderAccess;
    }
    if (definition.capabilityKey) {
        return Boolean(plan.storeBuilderCapabilities?.[definition.capabilityKey]);
    }
    if (plan.features?.[featureKey] !== undefined) return plan.features[featureKey] !== false;
    for (const alias of definition.aliases) {
        if (plan.features?.[alias] !== undefined) return plan.features[alias] !== false;
    }
    return true;
};

module.exports = {
    FEATURE_REGISTRY,
    FEATURE_KEYS,
    getFeatureDefinition,
    assertFeatureKey,
    getPlanFeatureValue
};
