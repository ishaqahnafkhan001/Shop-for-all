export const FEATURE_LABELS = {
    storeBuilder: 'Customize your store',
    analytics: 'Advanced analytics',
    coupons: 'Discounts and promotions',
    customDomain: 'Custom domain',
    staffAccounts: 'Staff accounts',
    bulkProductTools: 'Catalog tools',
    growthCenter: 'Growth Center',
    aiAdGenerator: 'Ad generator',
    customerSection: 'Customer management',
    trustSystem: 'Trust system',
    notifications: 'Notification Center',
    scheduledProductPublishing: 'Scheduled product publishing',
    scheduledSales: 'Scheduled sales',
    scheduledBanners: 'Launch banners',
    aiProductCreation: 'AI product creation',
    platformBrandingRemoval: 'Remove Scaleup branding'
};

export const FEATURE_MESSAGES = {
    storeBuilder: 'Store Builder is not enabled for your store.',
    analytics: 'Analytics is not enabled for your store.',
    coupons: 'Discounts and promotions are not enabled for your store.',
    customDomain: 'Custom domains are not enabled for your store.',
    staffAccounts: 'Staff accounts are not enabled for your store.',
    bulkProductTools: 'Bulk catalog tools are not enabled for your store.',
    growthCenter: 'Growth Center is not enabled for your store.',
    aiAdGenerator: 'The ad generator is not enabled for your store.',
    customerSection: 'Customer management is available on Growth and Pro plans.',
    trustSystem: 'The trust system is available on Growth and Pro plans.',
    notifications: 'The Notification Center is available on Growth and Pro plans.',
    scheduledProductPublishing: 'Scheduled product publishing requires the Pro plan.',
    scheduledSales: 'Scheduled sales are available on Growth and Pro plans.',
    scheduledBanners: 'Scheduled launch banners are available on Growth and Pro plans.'
};

export const hasFeature = (user, feature) => {
    if (!feature) return true;
    if (user?.role === 'SuperAdmin') return true;
    return getFeatureStatus(user, feature).enabled;
};

export const getFeatureStatus = (user, feature) => {
    if (!feature || user?.role === 'SuperAdmin') {
        return { feature, enabled: true, reason: 'enabled' };
    }
    const authoritative = user?.planAccess?.featureStatuses?.[feature];
    if (authoritative) return authoritative;
    const effectiveFeatures = user?.effectiveFeatures || {};
    return {
        feature,
        enabled: effectiveFeatures[feature] !== false,
        reason: effectiveFeatures[feature] === false ? 'unavailable' : 'enabled'
    };
};

export const canUseFeature = hasFeature;

export const hasStoreBuilderCapability = (user, capability) => {
    if (user?.role === 'SuperAdmin') return true;
    return user?.planAccess?.storeBuilderCapabilities?.[capability] !== false;
};
