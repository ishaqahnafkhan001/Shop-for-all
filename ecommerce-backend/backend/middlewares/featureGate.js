const Shop = require('../models/Shop');
const { hasFeature } = require('../services/shops/featureAccessService');
const { normalizeCustomDomain } = require('../utils/domainUtils');

const featureDenied = (res, feature) => res.status(403).json({
    success: false,
    error: 'Feature not available',
    code: 'FEATURE_NOT_AVAILABLE',
    feature
});

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

        const allowed = await hasFeature(shopId, feature);
        if (!allowed) return featureDenied(res, feature);

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
    if (!incomingDomain) return false;

    return incomingDomain !== normalizeDomainValue(currentCustomDomain);
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
    shouldRequireCustomDomainFeature
};
