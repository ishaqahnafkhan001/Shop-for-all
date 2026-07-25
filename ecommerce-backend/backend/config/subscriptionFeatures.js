/**
 * @typedef {Object} SubscriptionFeatureDefinition
 * @property {string} key
 * @property {string} label
 * @property {'beginner'|'starter'|'growth'|'pro'|null} requiredPlan
 * @property {string} upgradeReason
 * @property {string|null} [shopOverrideKey]
 * @property {string[]} [aliases]
 * @property {string|null} [capabilityKey]
 * @property {'none'|'limited'|'full'|null} [storeBuilderAccess]
 * @property {boolean} [defaultAccess]
 * @property {boolean} [legacyDefaultAccess]
 * @property {string} [category]
 * @property {boolean} [editableCommercially]
 * @property {'disable_only'|'plan_only'|'none'} [overridePolicy]
 * @property {string[]} [dependsOn]
 */

const defineFeature = (key, definition) => Object.freeze({
    key,
    label: definition.label,
    requiredPlan: definition.requiredPlan ?? null,
    upgradeReason: definition.upgradeReason || `Unlock ${definition.label}`,
    shopOverrideKey: definition.shopOverrideKey === undefined ? key : definition.shopOverrideKey,
    aliases: Object.freeze(definition.aliases || []),
    capabilityKey: definition.capabilityKey || null,
    storeBuilderAccess: definition.storeBuilderAccess || null,
    defaultAccess: definition.defaultAccess === true,
    legacyDefaultAccess: definition.legacyDefaultAccess === true,
    category: definition.category || 'Operations',
    editableCommercially: definition.editableCommercially !== undefined
        ? definition.editableCommercially === true
        : !(definition.storeBuilderAccess || definition.capabilityKey),
    overridePolicy: definition.overridePolicy || (
        definition.shopOverrideKey === null ? 'plan_only' : 'disable_only'
    ),
    dependsOn: Object.freeze(definition.dependsOn || [])
});

const FEATURE_REGISTRY = Object.freeze({
    basicStoreBranding: defineFeature('basicStoreBranding', {
        label: 'Essential Store Branding',
        requiredPlan: 'beginner',
        upgradeReason: 'Manage the essential identity of your storefront',
        category: 'Storefront'
    }),
    storeBuilder: defineFeature('storeBuilder', {
        label: 'Store Builder',
        requiredPlan: 'starter',
        category: 'Storefront'
    }),
    advancedStoreDesign: defineFeature('advancedStoreDesign', {
        label: 'Advanced Store Design',
        requiredPlan: 'growth',
        capabilityKey: 'advancedDesign',
        shopOverrideKey: 'storeBuilder',
        category: 'Storefront'
    }),
    homepageSeo: defineFeature('homepageSeo', {
        label: 'Homepage SEO',
        requiredPlan: 'starter',
        upgradeReason: 'Control homepage search titles, descriptions, and search-engine settings',
        category: 'Storefront',
        dependsOn: ['storeBuilder']
    }),
    storeBuilderFull: defineFeature('storeBuilderFull', {
        label: 'Full Store Builder',
        requiredPlan: 'growth',
        storeBuilderAccess: 'full',
        shopOverrideKey: 'storeBuilder',
        category: 'Storefront'
    }),
    scheduledBanners: defineFeature('scheduledBanners', {
        label: 'Scheduled banners',
        requiredPlan: 'growth',
        capabilityKey: 'scheduledBanners',
        shopOverrideKey: 'storeBuilder',
        category: 'Marketing'
    }),
    analytics: defineFeature('analytics', { label: 'Analytics', requiredPlan: 'starter', category: 'Insights' }),
    dashboardTopProducts: defineFeature('dashboardTopProducts', {
        label: 'Top product insights',
        requiredPlan: 'starter',
        upgradeReason: 'Identify popular products and understand what is driving sales',
        category: 'Insights',
        dependsOn: ['analytics']
    }),
    lowStockAlerts: defineFeature('lowStockAlerts', {
        label: 'Low-stock alerts',
        requiredPlan: 'starter',
        upgradeReason: 'Receive warnings before products run out of stock',
        category: 'Inventory'
    }),
    coupons: defineFeature('coupons', { label: 'Coupons', requiredPlan: 'starter', category: 'Marketing' }),
    customDomain: defineFeature('customDomain', { label: 'Custom domain', requiredPlan: 'growth', category: 'Storefront' }),
    staffAccounts: defineFeature('staffAccounts', { label: 'Staff accounts', requiredPlan: 'starter', category: 'Team' }),
    bulkProductTools: defineFeature('bulkProductTools', { label: 'Catalog tools', requiredPlan: 'growth', category: 'Catalog' }),
    growthCenter: defineFeature('growthCenter', {
        label: 'Growth Center',
        requiredPlan: 'growth',
        aliases: ['analytics'],
        category: 'Insights',
        dependsOn: ['analytics']
    }),
    aiAdGenerator: defineFeature('aiAdGenerator', {
        label: 'AI ad generator',
        requiredPlan: 'growth',
        aliases: ['growthCenter', 'analytics'],
        category: 'AI',
        dependsOn: ['growthCenter']
    }),
    aiProductCreation: defineFeature('aiProductCreation', {
        label: 'AI product creation',
        requiredPlan: 'starter',
        shopOverrideKey: null,
        category: 'AI'
    }),
    customerSection: defineFeature('customerSection', { label: 'Customer management', requiredPlan: 'growth', category: 'Customers' }),
    emailCampaigns: defineFeature('emailCampaigns', {
        label: 'Customer email campaigns',
        requiredPlan: 'growth',
        upgradeReason: 'Bring customers back with targeted product and store emails',
        category: 'Customers',
        dependsOn: ['customerSection']
    }),
    trustSystem: defineFeature('trustSystem', { label: 'Trust system', requiredPlan: 'growth', category: 'Trust' }),
    publicVerifiedBadge: defineFeature('publicVerifiedBadge', {
        label: 'Public Verified Seller badge',
        requiredPlan: 'starter',
        shopOverrideKey: null,
        category: 'Trust'
    }),
    notifications: defineFeature('notifications', { label: 'Notification Center', requiredPlan: 'growth', category: 'Operations' }),
    privacyRequests: defineFeature('privacyRequests', {
        label: 'Privacy Requests management',
        requiredPlan: 'starter',
        category: 'Compliance'
    }),
    activityLogs: defineFeature('activityLogs', {
        label: 'Activity Logs',
        requiredPlan: 'starter',
        category: 'Compliance'
    }),
    scheduledProductPublishing: defineFeature('scheduledProductPublishing', {
        label: 'Scheduled product publishing',
        requiredPlan: 'pro',
        category: 'Catalog'
    }),
    scheduledSales: defineFeature('scheduledSales', { label: 'Scheduled sales', requiredPlan: 'growth', category: 'Marketing' }),
    platformBrandingRemoval: defineFeature('platformBrandingRemoval', {
        label: 'Remove Scaleup branding',
        requiredPlan: 'growth',
        shopOverrideKey: null,
        category: 'Storefront'
    })
});

const FEATURE_KEYS = Object.freeze(Object.keys(FEATURE_REGISTRY));

const getFeatureDefinition = (featureKey) => FEATURE_REGISTRY[String(featureKey || '')] || null;

const getFeatureRegistryMetadata = () => FEATURE_KEYS.map(key => {
    const definition = FEATURE_REGISTRY[key];
    return {
        key,
        label: definition.label,
        category: definition.category,
        requiredPlan: definition.requiredPlan,
        upgradeReason: definition.upgradeReason,
        editableCommercially: definition.editableCommercially,
        overridePolicy: definition.overridePolicy,
        dependsOn: [...definition.dependsOn]
    };
});

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
    if (plan.features?.[featureKey] !== undefined) return plan.features[featureKey] === true;
    for (const alias of definition.aliases) {
        if (plan.features?.[alias] !== undefined) return plan.features[alias] === true;
    }
    return definition.legacyDefaultAccess || definition.defaultAccess;
};

const validatePlanCapabilityMatrix = (plans = {}) => {
    const errors = [];
    for (const [planKey, plan] of Object.entries(plans || {})) {
        const featureValues = plan?.features || {};
        for (const featureKey of Object.keys(featureValues)) {
            if (!FEATURE_REGISTRY[featureKey]) {
                errors.push(`${planKey}: unknown capability "${featureKey}"`);
            } else if (typeof featureValues[featureKey] !== 'boolean') {
                errors.push(`${planKey}: capability "${featureKey}" must be boolean`);
            }
        }

        for (const [featureKey, definition] of Object.entries(FEATURE_REGISTRY)) {
            if (definition.storeBuilderAccess || definition.capabilityKey) continue;
            if (!Object.prototype.hasOwnProperty.call(featureValues, featureKey)) {
                errors.push(`${planKey}: missing capability "${featureKey}"`);
            }

            const aliasValues = definition.aliases
                .filter(alias => Object.prototype.hasOwnProperty.call(featureValues, alias))
                .map(alias => featureValues[alias]);
            if (
                !Object.prototype.hasOwnProperty.call(featureValues, featureKey) &&
                new Set(aliasValues).size > 1
            ) {
                errors.push(`${planKey}: conflicting aliases for "${featureKey}"`);
            }

            if (featureValues[featureKey] === true) {
                for (const dependency of definition.dependsOn) {
                    if (featureValues[dependency] !== true) {
                        errors.push(`${planKey}: capability "${featureKey}" requires "${dependency}"`);
                    }
                }
            }
        }
    }
    return errors;
};

const assertValidPlanCapabilityMatrix = (plans = {}) => {
    const errors = validatePlanCapabilityMatrix(plans);
    if (errors.length) {
        const error = new Error(`Invalid subscription capability matrix:\n- ${errors.join('\n- ')}`);
        error.code = 'INVALID_SUBSCRIPTION_CAPABILITY_MATRIX';
        error.validationErrors = errors;
        throw error;
    }
    return true;
};

module.exports = {
    FEATURE_REGISTRY,
    FEATURE_KEYS,
    getFeatureDefinition,
    getFeatureRegistryMetadata,
    assertFeatureKey,
    getPlanFeatureValue,
    validatePlanCapabilityMatrix,
    assertValidPlanCapabilityMatrix
};
