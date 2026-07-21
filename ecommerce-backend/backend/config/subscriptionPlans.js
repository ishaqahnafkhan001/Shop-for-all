const UNLIMITED = null;

const STORE_BUILDER_CAPABILITIES = {
    limited: {
        basicBranding: true,
        basicHeader: true,
        standardHero: true,
        featuredProducts: true,
        basicFooter: true,
        allProducts: true,
        advancedSections: false,
        sectionReordering: false,
        scheduledBanners: false,
        premiumLayouts: false,
        advancedDesign: false
    },
    full: {
        basicBranding: true,
        basicHeader: true,
        standardHero: true,
        featuredProducts: true,
        basicFooter: true,
        allProducts: true,
        advancedSections: true,
        sectionReordering: true,
        scheduledBanners: true,
        premiumLayouts: true,
        advancedDesign: true
    }
};

const PLAN_DEFINITIONS = {
    starter: {
        key: 'starter',
        slug: 'starter',
        name: 'Starter',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        currency: 'BDT',
        limits: {
            aiProductCreationsPerWeek: 10,
            imagesPerProduct: 5,
            staffAccounts: 1,
            productCount: 100,
            activityLogRetentionDays: 7
        },
        features: {
            aiProductCreation: true,
            storeBuilder: true,
            coupons: true,
            analytics: true,
            bulkProductTools: false,
            staffAccounts: true,
            aiAdGenerator: false,
            growthCenter: false,
            customDomain: false,
            customerSection: false,
            trustSystem: false,
            notifications: false,
            scheduledProductPublishing: false,
            scheduledSales: false,
            platformBrandingRemoval: false
        },
        storeBuilderAccess: 'limited',
        storeBuilderCapabilities: STORE_BUILDER_CAPABILITIES.limited,
        badgeEligible: false,
        prioritySupport: false
    },
    growth: {
        key: 'growth',
        slug: 'growth',
        name: 'Growth',
        monthlyPrice: 1999,
        yearlyPrice: 19990,
        currency: 'BDT',
        limits: {
            aiProductCreationsPerWeek: 50,
            imagesPerProduct: 10,
            staffAccounts: 3,
            productCount: 500,
            activityLogRetentionDays: 30
        },
        features: {
            aiProductCreation: true,
            storeBuilder: true,
            coupons: true,
            analytics: true,
            bulkProductTools: true,
            staffAccounts: true,
            aiAdGenerator: true,
            growthCenter: true,
            customDomain: true,
            customerSection: true,
            trustSystem: true,
            notifications: true,
            scheduledProductPublishing: false,
            scheduledSales: true,
            platformBrandingRemoval: true
        },
        storeBuilderAccess: 'full',
        storeBuilderCapabilities: STORE_BUILDER_CAPABILITIES.full,
        badgeEligible: true,
        prioritySupport: false
    },
    pro: {
        key: 'pro',
        slug: 'pro',
        name: 'Pro',
        monthlyPrice: 3999,
        yearlyPrice: 39990,
        currency: 'BDT',
        limits: {
            aiProductCreationsPerWeek: UNLIMITED,
            imagesPerProduct: 15,
            staffAccounts: 10,
            productCount: UNLIMITED,
            activityLogRetentionDays: 45
        },
        features: {
            aiProductCreation: true,
            storeBuilder: true,
            coupons: true,
            analytics: true,
            bulkProductTools: true,
            staffAccounts: true,
            aiAdGenerator: true,
            growthCenter: true,
            customDomain: true,
            customerSection: true,
            trustSystem: true,
            notifications: true,
            scheduledProductPublishing: true,
            scheduledSales: true,
            platformBrandingRemoval: true
        },
        storeBuilderAccess: 'full',
        storeBuilderCapabilities: STORE_BUILDER_CAPABILITIES.full,
        badgeEligible: true,
        prioritySupport: true
    }
};

const FEATURE_MINIMUM_PLAN = {
    growthCenter: 'growth',
    customDomain: 'growth',
    customerSection: 'growth',
    trustSystem: 'growth',
    notifications: 'growth',
    scheduledSales: 'growth',
    scheduledProductPublishing: 'pro'
};

const PLAN_ORDER = ['starter', 'growth', 'pro'];

const normalizePlanKey = (value = 'starter') => {
    const normalized = String(value || 'starter').trim().toLowerCase();
    if (PLAN_DEFINITIONS[normalized]) return normalized;
    if (normalized.includes('growth')) return 'growth';
    if (normalized.includes('pro')) return 'pro';
    return 'starter';
};

const getCanonicalPlan = (value = 'starter') => PLAN_DEFINITIONS[normalizePlanKey(value)];

module.exports = {
    UNLIMITED,
    PLAN_ORDER,
    PLAN_DEFINITIONS,
    FEATURE_MINIMUM_PLAN,
    STORE_BUILDER_CAPABILITIES,
    normalizePlanKey,
    getCanonicalPlan
};
