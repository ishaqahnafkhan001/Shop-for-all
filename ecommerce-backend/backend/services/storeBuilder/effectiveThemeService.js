const { resolveEffectiveTheme } = require('@scaleup/storefront-theme');
const { ensureThemeSectionArchitecture } = require('../themeSectionService');
const { resolveStoreBranding } = require('../shops/storeBrandingService');
const { getAdaptiveAvailability } = require('./adaptiveRolloutPolicy');
const logger = require('../logger');

// All callers supply a shop loaded through their existing tenant/domain boundary.
// Branding resolves assets and CTA targets using this shop's ID, never request data.
const applyEffectiveStoreTheme = async (shop, planAccess) => {
    if (!shop) return shop;
    await ensureThemeSectionArchitecture(shop, { persist: false });
    const branding = await resolveStoreBranding(shop);
    const theme = Number(shop.theme?.version) >= 5 ? JSON.parse(JSON.stringify(shop.theme)) : shop.theme;
    if (Number(theme?.version) >= 5) require('@scaleup/storefront-theme').assertReadableThemeVersion(theme);
    // Never reuse a caller-provided projection or expose the private library.
    delete shop.adaptive;
    if (Number(theme?.version) === 5 && getAdaptiveAvailability({ shopId: shop._id, planAccess }).rendering) {
        try {
            shop.adaptive = await getAdaptivePublicProjection({ shopId: shop._id, published: { theme, themeRevision: shop.themeRevision } });
        } catch (error) {
            // Required commerce remains available through the validated v4 backing
            // presentation. Do not log graph content, URLs or exception messages.
            logger.warn('store_builder_adaptive_public_fallback', { shopId: String(shop._id), revision: Number(shop.themeRevision || 0),
                code: ['ASSET_UNAVAILABLE', 'INVALID_ADAPTIVE_THEME'].includes(error.code) ? error.code : 'ADAPTIVE_PROJECTION_FAILED' });
        }
    }
    shop.theme = resolveEffectiveTheme(theme, { planAccess, branding, shopName: shop.shopName });
    shop.branding = branding;
    shop.themeRevision = Number(shop.themeRevision || 0);
    if (planAccess?.features?.coupons === false) shop.storewideDiscount = 0;
    return shop;
};

// Only published snapshots reach this function. The public caller gates access;
// internal recovery tests may inspect projections with rollout still OFF.
const getAdaptivePublicProjection = async ({ shopId, published }) => {
    const Shop = require('../../models/Shop');
    const { normalizeStoredTheme, projectAdaptiveTheme, collectAdaptiveReferences } = require('@scaleup/storefront-theme/storage');
    const { assertThemeAssetOwnership } = require('./storeBuilderAssetService');
    const StoreBuilderAsset = require('../../models/StoreBuilderAsset');
    const shop = published ? { _id: shopId, ...published } : await Shop.findById(shopId).select('theme themeRevision').lean();
    if (!shop || Number(shop.theme?.version) !== 5) return null;
    const theme = normalizeStoredTheme(JSON.parse(JSON.stringify(shop.theme)));
    await assertThemeAssetOwnership({ shopId: shop._id, theme });
    const siteBuilder = projectAdaptiveTheme(theme);
    const refs = collectAdaptiveReferences({ ...theme, siteBuilder: { ...siteBuilder, savedSections: {} } });
    const assets = await StoreBuilderAsset.find({ shop_id: shop._id, _id: { $in: refs.assetIds }, status: { $in: ['active', 'retired'] } })
        .select('_id url width height mimeType').lean();
    if (assets.length !== refs.assetIds.length) throw Object.assign(new Error('Published adaptive media is unavailable.'), { code: 'ASSET_UNAVAILABLE', statusCode: 409 });
    const sourcesByTemplate = await resolvePublicSources(shopId, siteBuilder);
    return { revision: Number(shop.themeRevision || 0), siteBuilder, sourcesByTemplate, assets: assets.map(asset => ({ id: String(asset._id),
        url: asset.url, width: asset.width, height: asset.height, mimeType: asset.mimeType })) };
};

// One bounded batch per source family, independent of block count. Reuse public
// card serialization and scheduled pricing; never return private product fields.
const resolvePublicSources = async (shopId, graph) => {
    const mongoose = require('mongoose');
    const Product = require('../../models/Product');
    const { PUBLIC_PRODUCT_CARD_PROJECT, sanitizePublicProducts } = require('../publicProductSerializer');
    const { applyScheduledSalesToProducts } = require('../sales/scheduledSaleService');
    const nodes = Object.values(graph.templates).flatMap(tree => Object.values(tree.nodes));
    const ids = [...new Set(nodes.flatMap(node => node.source?.productIds || []))];
    const catalogLimit = Math.max(0, ...nodes.filter(node => node.source?.kind === 'catalog').map(node => node.source.limit));
    const categoryLimit = Math.max(0, ...nodes.filter(node => node.source?.kind === 'categories').map(node => node.source.limit));
    const query = { shop_id: new mongoose.Types.ObjectId(String(shopId)), status: 'Published', isActive: true, isDeleted: false };
    const [manual, catalog, categories] = await Promise.all([
        ids.length ? Product.aggregate([{ $match: { ...query, _id: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) } } }, { $project: PUBLIC_PRODUCT_CARD_PROJECT }]) : [],
        catalogLimit ? Product.aggregate([{ $match: query }, { $sort: { createdAt: -1, _id: 1 } }, { $limit: catalogLimit }, { $project: PUBLIC_PRODUCT_CARD_PROJECT }]) : [],
        categoryLimit ? Product.aggregate([{ $match: { ...query, category: { $type: 'string', $ne: '' } } }, { $group: { _id: '$category' } }, { $sort: { _id: 1 } }, { $limit: categoryLimit }]) : [],
    ]);
    const priced = sanitizePublicProducts(await applyScheduledSalesToProducts({ shopId, products: [...manual, ...catalog] }));
    const byId = new Map(priced.map(product => [String(product._id), product]));
    return Object.fromEntries(Object.entries(graph.templates).map(([id, tree]) => [id, Object.fromEntries(Object.entries(tree.nodes).filter(([, node]) => ['manualProducts', 'catalog', 'categories'].includes(node.source?.kind)).map(([nodeId, node]) => [nodeId,
        node.source.kind === 'categories' ? { categories: categories.slice(0, node.source.limit).map(item => item._id) }
            : { products: (node.source.kind === 'manualProducts' ? node.source.productIds : catalog.map(product => String(product._id))).map(key => byId.get(String(key))).filter(Boolean).slice(0, node.source.productIds?.length || node.source.limit) }
    ]))]));
};
module.exports = { applyEffectiveStoreTheme, getAdaptivePublicProjection };
