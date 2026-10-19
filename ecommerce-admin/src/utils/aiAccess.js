import { getFeatureStatus } from './featureAccess.js';
const FEATURES = {
    'product.content': ['products', 'aiProductCreation'],
    'catalog.collection': [['catalogTools', 'collectionsAi'], ['bulkProductTools', 'aiProductCreation']],
    'seo.homepage': ['storeBuilder', ['storeBuilder', 'homepageSeo']],
    'growth.ad_planning': ['growthCenter', 'aiAdGenerator']
};
export function getAiAccess(user, feature) {
    const [permission, gate] = FEATURES[feature] || [];
    if (!user) return { allowed: false, reason: 'session', message: 'Sign in to use suggestions.' };
    if (user.role === 'VendorStaff' && [permission].flat().some(key => user.permissions?.[key] !== true)) return { allowed: false, reason: 'permission', message: 'Ask your store owner for access to this workflow.' };
    const statuses = [gate].flat().map(key => getFeatureStatus(user, key));
    if (statuses.some(status => !status.enabled)) return { allowed: false, reason: 'plan', message: 'AI suggestions are unavailable on your current store plan. Review Billing or contact your store owner.' };
    const usage = user.planAccess?.usage?.ai;
    if (usage && !usage.unlimited && Number(usage.available ?? usage.remaining) <= 0) return {
        allowed: false, reason: Number(usage.pending) > 0 ? 'pending' : 'exhausted',
        message: Number(usage.pending) > 0 ? 'Your remaining allowance is reserved by pending operations. Wait for them to finish.' : 'Your shared weekly allowance is used. It will refresh at the next weekly reset.'
    };
    return { allowed: true, reason: 'available', message: '' };
}
export const aiErrorMessage = payload => ({
    AI_NOT_CONFIGURED: 'AI suggestions are temporarily unavailable. Contact support.',
    AI_ACCOUNTING_CUTOVER_REQUIRED: 'AI suggestions are temporarily unavailable. Contact support.',
    AI_PROVIDER_AUTH_FAILED: 'AI suggestions are temporarily unavailable. Contact support.',
    AI_MODEL_NOT_FOUND: 'AI suggestions are temporarily unavailable. Contact support.',
    AI_PROVIDER_RATE_LIMITED: 'The AI service is busy. Please try again later.',
    AI_CAPACITY_PENDING: 'Other AI operations are processing or recovering. Retry shortly.'
}[payload.code || payload.errorCode] || payload.message || payload.error);
