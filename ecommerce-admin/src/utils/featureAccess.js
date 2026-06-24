export const FEATURE_LABELS = {
    storeBuilder: 'Customize your store',
    analytics: 'Advanced analytics',
    coupons: 'Discounts and promotions',
    customDomain: 'Custom domain',
    staffAccounts: 'Staff accounts',
    bulkProductTools: 'Catalog tools',
    growthCenter: 'Growth Center',
    aiAdGenerator: 'Ad generator'
};

export const FEATURE_MESSAGES = {
    storeBuilder: 'Store Builder is not enabled for your store.',
    analytics: 'Analytics is not enabled for your store.',
    coupons: 'Discounts and promotions are not enabled for your store.',
    customDomain: 'Custom domains are not enabled for your store.',
    staffAccounts: 'Staff accounts are not enabled for your store.',
    bulkProductTools: 'Bulk catalog tools are not enabled for your store.',
    growthCenter: 'Growth Center is not enabled for your store.',
    aiAdGenerator: 'The ad generator is not enabled for your store.'
};

export const hasFeature = (user, feature) => {
    if (!feature) return true;
    if (user?.role === 'SuperAdmin') return true;
    const effectiveFeatures = user?.effectiveFeatures || {};
    return effectiveFeatures[feature] !== false;
};
