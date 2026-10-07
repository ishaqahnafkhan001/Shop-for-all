const { resolveEffectiveTheme } = require('@scaleup/storefront-theme');
const { ensureThemeSectionArchitecture } = require('../themeSectionService');
const { resolveStoreBranding } = require('../shops/storeBrandingService');

// All callers supply a shop loaded through their existing tenant/domain boundary.
// Branding resolves assets and CTA targets using this shop's ID, never request data.
const applyEffectiveStoreTheme = async (shop, planAccess) => {
    if (!shop) return shop;
    await ensureThemeSectionArchitecture(shop, { persist: false });
    const branding = await resolveStoreBranding(shop);
    shop.theme = resolveEffectiveTheme(shop.theme, { planAccess, branding, shopName: shop.shopName });
    shop.branding = branding;
    shop.themeRevision = Number(shop.themeRevision || 0);
    if (planAccess?.features?.coupons === false) shop.storewideDiscount = 0;
    return shop;
};

module.exports = { applyEffectiveStoreTheme };
