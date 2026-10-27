const { resolveEffectiveTheme } = require('@scaleup/storefront-theme');
const { ensureThemeSectionArchitecture } = require('../themeSectionService');
const { resolveStoreBranding } = require('../shops/storeBrandingService');

// All callers supply a shop loaded through their existing tenant/domain boundary.
// Branding resolves assets and CTA targets using this shop's ID, never request data.
const applyEffectiveStoreTheme = async (shop, planAccess) => {
    if (!shop) return shop;
    await ensureThemeSectionArchitecture(shop, { persist: false });
    const branding = await resolveStoreBranding(shop);
    const theme = Number(shop.theme?.version) >= 5 ? JSON.parse(JSON.stringify(shop.theme)) : shop.theme;
    if (Number(theme?.version) >= 5) require('@scaleup/storefront-theme').assertReadableThemeVersion(theme);
    shop.theme = resolveEffectiveTheme(theme, { planAccess, branding, shopName: shop.shopName });
    shop.branding = branding;
    shop.themeRevision = Number(shop.themeRevision || 0);
    if (planAccess?.features?.coupons === false) shop.storewideDiscount = 0;
    return shop;
};

// Future renderer integration only. No current route/cache invokes this projection.
// A tenant-scoped snapshot and two bounded media queries avoid per-node reads.
const getAdaptivePublicProjection = async ({ shopId }) => {
    const Shop = require('../../models/Shop');
    const { normalizeStoredTheme, projectAdaptiveTheme, collectAdaptiveReferences } = require('@scaleup/storefront-theme/storage');
    const { assertThemeAssetOwnership } = require('./storeBuilderAssetService');
    const StoreBuilderAsset = require('../../models/StoreBuilderAsset');
    const shop = await Shop.findById(shopId).select('theme themeRevision').lean();
    if (!shop || Number(shop.theme?.version) !== 5) return null;
    const theme = normalizeStoredTheme(JSON.parse(JSON.stringify(shop.theme)));
    await assertThemeAssetOwnership({ shopId: shop._id, theme });
    const siteBuilder = projectAdaptiveTheme(theme);
    const refs = collectAdaptiveReferences({ ...theme, siteBuilder: { ...siteBuilder, savedSections: {} } });
    const assets = await StoreBuilderAsset.find({ shop_id: shop._id, _id: { $in: refs.assetIds }, status: { $in: ['active', 'retired'] } })
        .select('_id url width height mimeType').lean();
    if (assets.length !== refs.assetIds.length) throw Object.assign(new Error('Published adaptive media is unavailable.'), { code: 'ASSET_UNAVAILABLE', statusCode: 409 });
    return { revision: Number(shop.themeRevision || 0), siteBuilder, assets: assets.map(asset => ({ id: String(asset._id),
        url: asset.url, width: asset.width, height: asset.height, mimeType: asset.mimeType })) };
};
module.exports = { applyEffectiveStoreTheme, getAdaptivePublicProjection };
