export const FEATURE_LABELS = {
    basicStoreBranding: 'Store Branding',
    storeBuilder: 'Customize your store',
    advancedStoreDesign: 'Advanced Store Design',
    homepageSeo: 'Homepage SEO',
    analytics: 'Advanced analytics',
    dashboardTopProducts: 'Top product insights',
    lowStockAlerts: 'Low-stock alerts',
    coupons: 'Discounts and promotions',
    customDomain: 'Custom domain',
    staffAccounts: 'Staff accounts',
    bulkProductTools: 'Catalog tools',
    growthCenter: 'Growth Center',
    aiAdGenerator: 'Ad generator',
    customerSection: 'Customer management',
    emailCampaigns: 'Customer email campaigns',
    trustSystem: 'Trust system',
    publicVerifiedBadge: 'Public Verified Seller badge',
    notifications: 'Notification Center',
    privacyRequests: 'Privacy Requests management',
    activityLogs: 'Activity Logs',
    scheduledProductPublishing: 'Scheduled product publishing',
    scheduledSales: 'Scheduled sales',
    scheduledBanners: 'Launch banners',
    aiProductCreation: 'AI product creation',
    platformBrandingRemoval: 'Remove Scaleup branding'
};

export const FEATURE_MESSAGES = {
    basicStoreBranding: 'Essential Store Branding is not enabled for this store.',
    storeBuilder: 'Store Builder is not enabled for your store.',
    advancedStoreDesign: 'Advanced Store Design is not enabled for your store.',
    homepageSeo: 'Homepage SEO controls are not enabled for your store.',
    analytics: 'Analytics is not enabled for your store.',
    dashboardTopProducts: 'Top product insights are not enabled for your store.',
    lowStockAlerts: 'Low-stock alerts are not enabled for your store.',
    coupons: 'Discounts and promotions are not enabled for your store.',
    customDomain: 'Custom domains are not enabled for your store.',
    staffAccounts: 'Staff accounts are not enabled for your store.',
    bulkProductTools: 'Bulk catalog tools are not enabled for your store.',
    growthCenter: 'Growth Center is not enabled for your store.',
    aiAdGenerator: 'The ad generator is not enabled for your store.',
    customerSection: 'Customer management is available on Growth and Pro plans.',
    emailCampaigns: 'Customer email campaigns are available on Growth and Pro plans.',
    trustSystem: 'The trust system is available on Growth and Pro plans.',
    publicVerifiedBadge: 'The public Verified Seller badge is not included in your current plan.',
    notifications: 'The Notification Center is available on Growth and Pro plans.',
    privacyRequests: 'The vendor Privacy Requests workspace is not included in your current plan.',
    activityLogs: 'The advanced Activity Logs workspace is not included in your current plan.',
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
