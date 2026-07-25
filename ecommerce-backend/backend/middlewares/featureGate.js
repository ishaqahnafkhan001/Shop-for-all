const Shop = require('../models/Shop');
const { getShopPlanAccess, buildFeatureError } = require('../services/billing/planAccessService');
const { SUBSCRIPTION_EVENTS, emitSubscriptionEvent } = require('../services/billing/subscriptionEvents');
const { normalizeCustomDomain } = require('../utils/domainUtils');

const featureDenied = async (req, res, context, feature, metadata = {}) => {
    await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.FEATURE_BLOCKED, {
        req,
        shopId: context.shop?._id,
        subscriptionId: context.subscription?._id,
        planKey: context.planKey,
        affectedResources: [feature],
        metadata: {
            feature,
            featureStatus: context.featureStatuses?.[feature] || null,
            ...metadata
        }
    });
    return res.status(403).json(await buildFeatureError(context, feature));
};

const requireShopFeature = (feature) => async (req, res, next) => {
    try {
        const shopId = req.tenantId || req.user?.shop_id || req.user?.shopId;

        if (!shopId) {
            return res.status(400).json({
                success: false,
                error: 'Shop context is required',
                code: 'SHOP_CONTEXT_REQUIRED'
            });
        }

        const context = await getShopPlanAccess(shopId);
        req.planAccess = context;
        if (!context.shopOperational) {
            return res.status(403).json({
                success: false,
                code: 'SHOP_SUSPENDED',
                message: 'This shop is not active and approved.'
            });
        }
        if (!context.isOperational) {
            return res.status(403).json({
                success: false,
                code: 'SUBSCRIPTION_INACTIVE',
                message: 'Your subscription is not active. Billing, settings, and support remain available.',
                currentPlan: context.planKey
            });
        }
        if (!context.features[feature]) return featureDenied(req, res, context, feature);

        return next();
    } catch (err) {
        console.error('Feature gate error:', err);
        return res.status(500).json({
            success: false,
            error: 'Unable to verify feature access',
            code: 'FEATURE_CHECK_FAILED',
            feature
        });
    }
};

const requireShopFeatureWhenBodyField = (feature, fieldName) => async (req, res, next) => {
    if (req.body?.[fieldName] === undefined) return next();
    return requireShopFeature(feature)(req, res, next);
};

const normalizeDomainValue = (value) => {
    return normalizeCustomDomain(value);
};

const shouldRequireCustomDomainFeature = (incomingCustomDomain, currentCustomDomain) => {
    if (incomingCustomDomain === undefined) return false;

    const incomingDomain = normalizeDomainValue(incomingCustomDomain);
    const currentDomain = normalizeDomainValue(currentCustomDomain);
    if (!incomingDomain) return Boolean(currentDomain);
    return incomingDomain !== currentDomain;
};

const requireShopFeatureWhenCustomDomainChanges = (feature = 'customDomain') => async (req, res, next) => {
    try {
        if (req.body?.customDomain === undefined) return next();

        const shopId = req.tenantId || req.user?.shop_id || req.user?.shopId;
        if (!shopId) {
            return res.status(400).json({
                success: false,
                error: 'Shop context is required',
                code: 'SHOP_CONTEXT_REQUIRED'
            });
        }

        const shop = await Shop.findById(shopId).select('customDomain.domain').lean();
        if (!shouldRequireCustomDomainFeature(req.body.customDomain, shop?.customDomain)) {
            return next();
        }

        return requireShopFeature(feature)(req, res, next);
    } catch (err) {
        console.error('Custom domain feature gate error:', err);
        return res.status(500).json({
            success: false,
            error: 'Unable to verify feature access',
            code: 'FEATURE_CHECK_FAILED',
            feature
        });
    }
};

module.exports = {
    requireShopFeature,
    requireShopFeatureWhenBodyField,
    requireShopFeatureWhenCustomDomainChanges,
    shouldRequireCustomDomainFeature,
    requireStoreBuilderCapability: (capability) => async (req, res, next) => {
        try {
            const shopId = req.tenantId || req.user?.shop_id || req.user?.shopId;
            const context = await getShopPlanAccess(shopId);
            req.planAccess = context;
            if (context.storeBuilderCapabilities?.[capability]) return next();
            await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.FEATURE_BLOCKED, {
                req,
                shopId: context.shop?._id,
                subscriptionId: context.subscription?._id,
                planKey: context.planKey,
                affectedResources: ['storeBuilder'],
                metadata: { feature: 'storeBuilder', capability }
            });
            return res.status(403).json({
                success: false,
                code: 'FEATURE_NOT_AVAILABLE',
                message: 'This Store Builder capability is available on the Growth plan.',
                feature: 'storeBuilder',
                capability,
                currentPlan: context.planKey,
                requiredPlan: 'growth'
            });
        } catch (err) {
            return res.status(500).json({ success: false, code: 'FEATURE_CHECK_FAILED', error: 'Unable to verify Store Builder access' });
        }
    }
};
