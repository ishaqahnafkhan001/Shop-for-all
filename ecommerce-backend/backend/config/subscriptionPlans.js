const UNLIMITED = null;
const PLAN_CONFIG_VERSION = 2;

const STORE_BUILDER_CAPABILITIES = {
    none: {
        basicBranding: false,
        basicHeader: false,
        standardHero: false,
        featuredProducts: false,
        basicFooter: false,
        allProducts: false,
        advancedSections: false,
        sectionReordering: false,
        scheduledBanners: false,
        premiumLayouts: false,
        advancedDesign: false
    },
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
    beginner: {
        key: 'beginner',
        slug: 'beginner',
        name: 'Beginner',
        monthlyPrice: 499,
        yearlyPrice: 4990,
        currency: 'BDT',
        limits: {
            aiProductCreationsPerWeek: 0,
            imagesPerProduct: 3,
            staffAccounts: 0,
            productCount: 25,
            activityLogRetentionDays: 7
        },
        features: {
            basicStoreBranding: true,
            aiProductCreation: false,
            storeBuilder: false,
            homepageSeo: false,
            coupons: false,
            analytics: false,
            dashboardTopProducts: false,
            lowStockAlerts: false,
            bulkProductTools: false,
            staffAccounts: false,
            aiAdGenerator: false,
            growthCenter: false,
            customDomain: false,
            customerSection: false,
            emailCampaigns: false,
            trustSystem: false,
            publicVerifiedBadge: false,
            notifications: false,
            privacyRequests: false,
            activityLogs: false,
            scheduledProductPublishing: false,
            scheduledSales: false,
            platformBrandingRemoval: false
        },
        storeBuilderAccess: 'none',
        storeBuilderCapabilities: STORE_BUILDER_CAPABILITIES.none,
        badgeEligible: false,
        prioritySupport: false
    },
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
            basicStoreBranding: true,
            aiProductCreation: true,
            storeBuilder: true,
            homepageSeo: true,
            coupons: true,
            analytics: true,
            dashboardTopProducts: true,
            lowStockAlerts: true,
            bulkProductTools: false,
            staffAccounts: true,
            aiAdGenerator: false,
            growthCenter: false,
            customDomain: false,
            customerSection: false,
            emailCampaigns: false,
            trustSystem: false,
            publicVerifiedBadge: true,
            notifications: false,
            privacyRequests: true,
            activityLogs: true,
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
            basicStoreBranding: true,
            aiProductCreation: true,
            storeBuilder: true,
            homepageSeo: true,
            coupons: true,
            analytics: true,
            dashboardTopProducts: true,
            lowStockAlerts: true,
            bulkProductTools: true,
            staffAccounts: true,
            aiAdGenerator: true,
            growthCenter: true,
            customDomain: true,
            customerSection: true,
            emailCampaigns: true,
            trustSystem: true,
            publicVerifiedBadge: true,
            notifications: true,
            privacyRequests: true,
            activityLogs: true,
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
            basicStoreBranding: true,
            aiProductCreation: true,
            storeBuilder: true,
            homepageSeo: true,
            coupons: true,
            analytics: true,
            dashboardTopProducts: true,
            lowStockAlerts: true,
            bulkProductTools: true,
            staffAccounts: true,
            aiAdGenerator: true,
            growthCenter: true,
            customDomain: true,
            customerSection: true,
            emailCampaigns: true,
            trustSystem: true,
            publicVerifiedBadge: true,
            notifications: true,
            privacyRequests: true,
            activityLogs: true,
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
    basicStoreBranding: 'beginner',
    aiProductCreation: 'starter',
    storeBuilder: 'starter',
    homepageSeo: 'starter',
    analytics: 'starter',
    dashboardTopProducts: 'starter',
    lowStockAlerts: 'starter',
    staffAccounts: 'starter',
    privacyRequests: 'starter',
    activityLogs: 'starter',
    publicVerifiedBadge: 'starter',
    growthCenter: 'growth',
    customDomain: 'growth',
    customerSection: 'growth',
    emailCampaigns: 'growth',
    trustSystem: 'growth',
    notifications: 'growth',
    scheduledSales: 'growth',
    scheduledProductPublishing: 'pro'
};

const PLAN_ORDER = ['beginner', 'starter', 'growth', 'pro'];
const SUBSCRIPTION_STATUS_REGISTRY = Object.freeze([
    'trialing',
    'active',
    'grace',
    'past_due',
    'pending_approval',
    'suspended',
    'cancelled'
]);

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
    PLAN_CONFIG_VERSION,
    PLAN_ORDER,
    SUBSCRIPTION_STATUS_REGISTRY,
    PLAN_DEFINITIONS,
    FEATURE_MINIMUM_PLAN,
    STORE_BUILDER_CAPABILITIES,
    normalizePlanKey,
    getCanonicalPlan
};
