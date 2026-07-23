const {
    evaluateHomepageSeo,
    resolveHomepageSeo
} = require('@scaleup/storefront-theme');

const Shop = require('../../models/Shop');
const StoreBuilderAsset = require('../../models/StoreBuilderAsset');
const StoreBuilderDraft = require('../../models/StoreBuilderDraft');
const {
    getStoreBuilderBootstrap,
    normalizeShopAliases,
    normalizeThemeForShop,
    publishStoreBuilder
} = require('./storeBuilderService');
const {
    assertThemeAssetOwnership,
    attachAssetsToDraft
} = require('./storeBuilderAssetService');

const getActorId = (req) => req?.user?._id || req?.user?.id || null;

const buildSeoContext = ({ shop, seo, searchAliases, seoStats = {}, categories = [] }) => {
    const heroSlide = shop.theme?.hero?.bannerSlides?.[0] || {};
    const customDomain = shop.customDomain || {};
    const shopPublished = shop.isActive !== false && shop.approvalStatus === 'Approved';
    const resolvedSeo = resolveHomepageSeo({
        seo: seo || {},
        shopIdentity: {
            shopName: shop.shopName,
            displayName: shop.shopName,
            subdomain: shop.subdomain,
            searchAliases: searchAliases || [],
            primaryCategory: seo?.primaryCategory || categories[0] || '',
            language: seo?.language || 'en-BD'
        },
        storefrontContent: {
            heroTitle: heroSlide.title || shop.theme?.hero?.title,
            heroDescription: heroSlide.subtitle || shop.theme?.hero?.subtitle,
            logoUrl: shop.theme?.logoUrl,
            fallbackSocialImage: shop.theme?.logoUrl || heroSlide.desktopImage || shop.theme?.hero?.imageUrl
        },
        catalogSummary: {
            productCount: Number(seoStats.products?.total || 0),
            collectionCount: Number(seoStats.collections?.total || 0),
            categories: categories.map(name => ({ name }))
        },
        domain: { customDomain },
        indexing: {
            vendorVisible: seo?.searchEngineVisibility !== false,
            shopPublished,
            platformAllowed: shopPublished,
            environmentAllowsIndexing: process.env.NODE_ENV === 'production'
        },
        socialProfiles: {
            facebook: seo?.facebookUrl || shop.theme?.footer?.facebookUrl,
            instagram: shop.theme?.footer?.instagramUrl,
            twitter: shop.theme?.footer?.twitterUrl
        },
        commerce: { currency: shop.theme?.commerce?.currency || 'BDT' },
        publicContact: {
            email: shop.theme?.footer?.contactEmail,
            phone: shop.theme?.footer?.contactPhone
        }
    });
    const health = evaluateHomepageSeo(resolvedSeo, {
        productCount: Number(seoStats.products?.total || 0),
        collectionCount: Number(seoStats.collections?.total || 0),
        imageAltCoverage: Number(seoStats.imageAltCoverage || 0),
        googleSiteVerification: seo?.googleSiteVerification,
        customDomainConnected: Boolean(resolvedSeo.canonical && customDomain?.status === 'Verified'),
        h1: heroSlide.title || shop.theme?.hero?.title,
        internalLinkCount: (shop.theme?.navigation || []).filter(item => item?.url && item.url !== '#').length
    });
    return { resolvedSeo, health };
};

const getSocialAsset = async ({ shopId, seo }) => {
    if (!seo?.socialImageAssetId) return null;
    return StoreBuilderAsset.findOne({
        _id: seo.socialImageAssetId,
        shop_id: shopId,
        status: { $in: ['temporary', 'active'] }
    }).select('_id url width height mimeType originalName status').lean();
};

const getStoreBuilderSeoBootstrap = async ({ shopId }) => {
    const bootstrap = await getStoreBuilderBootstrap({ shopId });
    if (!bootstrap) return null;
    const { shop, draft, seoStats, categories, planAccess } = bootstrap;
    const publishedSeo = shop.theme?.seo || {};
    const publishedAliases = shop.searchAliases || [];
    const draftSeo = draft?.theme?.seo || null;
    const draftAliases = draft ? (draft.searchAliases || []) : null;
    const effectiveSeo = draftSeo || publishedSeo;
    const effectiveAliases = draftAliases || publishedAliases;
    const diagnostics = buildSeoContext({
        shop,
        seo: effectiveSeo,
        searchAliases: effectiveAliases,
        seoStats,
        categories
    });
    const socialAsset = await getSocialAsset({ shopId, seo: effectiveSeo });

    return {
        published: { seo: publishedSeo, searchAliases: publishedAliases },
        draft: draft ? {
            seo: draftSeo || publishedSeo,
            searchAliases: draftAliases || publishedAliases,
            basedOnRevision: Number(draft.basedOnRevision || 0),
            updatedAt: draft.updatedAt || null,
            stale: Boolean(draft.stale)
        } : null,
        themeRevision: Number(shop.themeRevision || 0),
        lastPublishedAt: shop.lastPublishedAt || null,
        lastPublishedBy: shop.lastPublishedBy || null,
        resolvedSeo: diagnostics.resolvedSeo,
        health: diagnostics.health,
        capabilities: planAccess?.capabilityMetadata || {},
        domain: {
            subdomain: shop.subdomain,
            customDomain: shop.customDomain || {},
            canonical: diagnostics.resolvedSeo.canonical,
            sitemap: `${String(diagnostics.resolvedSeo.canonical || '').replace(/\/$/, '')}/sitemap.xml`,
            robots: `${String(diagnostics.resolvedSeo.canonical || '').replace(/\/$/, '')}/robots.txt`
        },
        shop: { shopName: shop.shopName, subdomain: shop.subdomain },
        seoStats,
        socialAsset
    };
};

const saveStoreBuilderSeoDraft = async ({ shopId, req, seo, searchAliases, basedOnRevision }) => {
    const [shop, existingDraft] = await Promise.all([
        Shop.findById(shopId).select('shopName theme searchAliases customDomain storewideDiscount themeRevision').lean(),
        StoreBuilderDraft.findOne({ shop_id: shopId }).lean()
    ]);
    if (!shop) return null;
    const baseTheme = existingDraft?.theme || shop.theme || {};
    const normalizedTheme = await normalizeThemeForShop({
        ...baseTheme,
        seo: seo === undefined ? (baseTheme.seo || {}) : seo
    }, shop);
    const aliasResult = await normalizeShopAliases({
        aliases: searchAliases === undefined
            ? (existingDraft?.searchAliases || shop.searchAliases || [])
            : searchAliases,
        shop
    });
    await assertThemeAssetOwnership({ shopId, theme: normalizedTheme });
    const revision = basedOnRevision === undefined
        ? Number(existingDraft?.basedOnRevision ?? shop.themeRevision ?? 0)
        : Math.max(0, Number(basedOnRevision) || 0);
    const draft = await StoreBuilderDraft.findOneAndUpdate(
        { shop_id: shopId },
        {
            $set: {
                theme: normalizedTheme,
                searchAliases: aliasResult.aliases,
                basedOnRevision: revision,
                updatedBy: getActorId(req)
            },
            $setOnInsert: {
                customDomain: shop.customDomain || {},
                storewideDiscount: Number(shop.storewideDiscount || 0)
            }
        },
        { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await attachAssetsToDraft({ shopId, draftId: draft._id, theme: normalizedTheme });
    return {
        seo: draft.theme?.seo || {},
        searchAliases: draft.searchAliases || [],
        basedOnRevision: Number(draft.basedOnRevision || 0),
        updatedAt: draft.updatedAt,
        stale: Number(draft.basedOnRevision || 0) !== Number(shop.themeRevision || 0)
    };
};

const withoutSeo = (theme = {}) => {
    const clone = { ...(theme || {}) };
    delete clone.seo;
    return clone;
};

const deleteStoreBuilderSeoDraft = async ({ shopId, req }) => {
    const [shop, draft] = await Promise.all([
        Shop.findById(shopId).select('theme searchAliases customDomain storewideDiscount themeRevision').lean(),
        StoreBuilderDraft.findOne({ shop_id: shopId })
    ]);
    if (!shop) return null;
    if (!draft) return { deleted: false, rebased: false };

    const hasUnrelatedDraft = JSON.stringify(withoutSeo(draft.theme || {})) !== JSON.stringify(withoutSeo(shop.theme || {}))
        || JSON.stringify(draft.customDomain || {}) !== JSON.stringify(shop.customDomain || {})
        || Number(draft.storewideDiscount || 0) !== Number(shop.storewideDiscount || 0);
    if (!hasUnrelatedDraft) {
        await StoreBuilderDraft.deleteOne({ _id: draft._id, shop_id: shopId });
        return { deleted: true, rebased: false };
    }

    draft.theme = await normalizeThemeForShop({ ...(draft.theme || {}), seo: shop.theme?.seo || {} }, shop);
    draft.searchAliases = shop.searchAliases || [];
    draft.basedOnRevision = Number(shop.themeRevision || 0);
    draft.updatedBy = getActorId(req);
    await draft.save();
    return { deleted: false, rebased: true };
};

const publishStoreBuilderSeo = async ({ shopId, req, seo, searchAliases, expectedRevision }) => {
    const shop = await Shop.findById(shopId)
        .select('theme searchAliases customDomain storewideDiscount themeRevision')
        .lean();
    if (!shop) return null;
    const saved = await publishStoreBuilder({
        shopId,
        req,
        theme: { ...(shop.theme || {}), seo: seo || {} },
        searchAliases,
        customDomain: shop.customDomain,
        storewideDiscount: shop.storewideDiscount,
        expectedRevision,
        changeScope: 'homepage-seo',
        draftCleanupScope: 'seo',
        audit: {
            action: 'store_builder.seo_published',
            entityType: 'ShopTheme',
            before: { revision: Number(shop.themeRevision || 0) }
        }
    });
    if (!saved) return null;
    return {
        seo: saved.theme?.seo || {},
        searchAliases: saved.searchAliases || [],
        themeRevision: Number(saved.themeRevision || 0),
        lastPublishedAt: saved.lastPublishedAt || null,
        lastPublishedBy: saved.lastPublishedBy || null,
        changeSummary: saved.changeSummary || [],
        warnings: saved.warnings || []
    };
};

module.exports = {
    buildSeoContext,
    getStoreBuilderSeoBootstrap,
    saveStoreBuilderSeoDraft,
    deleteStoreBuilderSeoDraft,
    publishStoreBuilderSeo
};
