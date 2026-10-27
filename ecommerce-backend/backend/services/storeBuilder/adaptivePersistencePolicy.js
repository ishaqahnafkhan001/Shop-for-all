'use strict';

const User = require('../../models/User');
const ShopMembership = require('../../models/ShopMembership');
const StaffPermission = require('../../models/StaffPermission');
const { getShopPlanAccess } = require('../billing/planAccessService');
const { normalizeStoredTheme } = require('@scaleup/storefront-theme');
const { themeError } = require('../../models/storeBuilderThemeContract');

const { getAdaptiveAvailability } = require('./adaptiveRolloutPolicy');
const permissionError = (code, message) => Object.assign(themeError(code, message), { statusCode: 403 });

const assertAdaptiveActor = async ({ shopId, req }) => {
    if (!req?.user?._id || String(req.tenantId) !== String(shopId)) throw permissionError('ADAPTIVE_TENANT_FORBIDDEN', 'The authenticated store does not match this operation.');
    const user = await User.findOne({ _id: req.user._id, status: 'Active' }).select('role shop_id permissions').lean();
    if (!user || !['VendorAdmin', 'VendorStaff'].includes(user.role)) throw permissionError('ADAPTIVE_ACTOR_FORBIDDEN', 'An active store administrator or authorized staff member is required.');
    const membership = await ShopMembership.findOne({ legacyUser_id: user._id, shop_id: shopId }).lean();
    if (membership && (membership.status !== 'Active' || membership.role !== user.role)) throw permissionError('ADAPTIVE_ACTOR_FORBIDDEN', 'Store membership is inactive.');
    if (!membership && String(user.shop_id) !== String(shopId)) throw permissionError('ADAPTIVE_TENANT_FORBIDDEN', 'This account cannot edit this store.');
    if (user.role === 'VendorStaff') {
        const stored = membership ? await StaffPermission.findOne({ membership_id: membership._id, shop_id: shopId }).lean() : null;
        if (!(membership ? stored?.permissions : user.permissions)?.storeBuilder) throw permissionError('ADAPTIVE_ACTOR_FORBIDDEN', 'Store Builder staff permission is required.');
    }
};
const assertAdaptiveThemeMutation = async ({ shop, candidate, req, changeScope }) => {
    if (Number(shop?.theme?.version) !== 5 && Number(candidate?.version) !== 5) return;
    await assertAdaptiveActor({ shopId: shop._id, req });
    const access = await getShopPlanAccess(shop._id); // Ignore caller-supplied plans.
    if (!['full', 'limited'].includes(access.storeBuilderAccess) || !access.features?.storeBuilder || !access.isOperational || !access.shopOperational) throw Object.assign(themeError('ADAPTIVE_PLAN_REQUIRED', 'Active Store Builder access is required.'), { statusCode: 403 });
    const before = normalizeStoredTheme(JSON.parse(JSON.stringify(shop.theme || {})));
    const next = normalizeStoredTheme(JSON.parse(JSON.stringify(candidate)));
    if (Number(before.version) !== 5 || JSON.stringify(before.siteBuilder) !== JSON.stringify(next.siteBuilder)) {
        if (!getAdaptiveAvailability({ shopId: shop._id, planAccess: access }).available) throw Object.assign(themeError('ADAPTIVE_ADOPTION_DISABLED', 'Adaptive Store Builder adoption is disabled.'), { statusCode: 403 });
    } else if (changeScope !== 'homepage-seo' && !getAdaptiveAvailability({ shopId: shop._id, planAccess: access }).available) {
        throw Object.assign(themeError('ADAPTIVE_READ_ONLY', 'Adaptive editing remains disabled during reader-first rollout.'), { statusCode: 403 });
    }
    if (changeScope === 'homepage-seo') {
        if (!access.features?.homepageSeo) throw Object.assign(themeError('FEATURE_NOT_INCLUDED', 'Homepage SEO is not included in this plan.'), { statusCode: 403 });
        const withoutSeo = value => { const rest = { ...value }; delete rest.seo; return rest; };
        if (JSON.stringify(withoutSeo(before)) !== JSON.stringify(withoutSeo(next))) throw themeError('INVALID_SEO_CHANGE_SCOPE', 'SEO updates must preserve the complete storefront design.');
    }
};
module.exports = { getAdaptiveAvailability, assertAdaptiveActor, assertAdaptiveThemeMutation };
