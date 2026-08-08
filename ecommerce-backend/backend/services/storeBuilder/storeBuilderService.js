const mongoose = require('mongoose');
const {
    getThemeCapabilityMetadata,
    normalizeSearchAliases,
    normalizeSearchText,
    normalizeTheme,
    sanitizeThemePayload,
    summarizeThemeChanges,
    validateTheme
} = require('@scaleup/storefront-theme');

const Shop = require('../../models/Shop');
const Product = require('../../models/Product');
const Review = require('../../models/Review');
const Collection = require('../../models/Collection');
const Category = require('../../models/Category');
const StoreBuilderDraft = require('../../models/StoreBuilderDraft');
const StoreBuilderRevision = require('../../models/StoreBuilderRevision');
const { fillMissingPolicyDefaults } = require('../policies/defaultPolicyTemplates');
const { buildPublicProductQuery } = require('../products/publicProductQueryService');
const { ensureThemeSectionArchitecture } = require('../themeSectionService');
const { getShopPlanAccess } = require('../billing/planAccessService');
const { assertStoreBuilderUpdateAllowed } = require('../billing/storeBuilderPlanService');
const logger = require('../logger');
const { logAudit } = require('../auditLogService');
const {
    assertThemeAssetOwnership,
    attachAssetsToDraft,
    promotePublishedAssets
} = require('./storeBuilderAssetService');
const { mergeCategoryDetails, normalizeCategoryKey } = require('../categories/categoryService');

const REVISION_RETENTION = 20;
const BUILDER_SHOP_FIELDS = [
    'shopName', 'subdomain', 'theme', 'themeRevision', 'lastPublishedAt', 'lastPublishedBy',
    'customDomain', 'plan', 'featureFlags', 'storewideDiscount', 'isActive', 'approvalStatus',
    'suspensionReason', 'searchAliases', 'searchAliasesNormalized', 'searchNameNormalized', 'updatedAt'
].join(' ');

const getActorId = (req) => req?.user?._id || req?.user?.id || null;
const getActorName = (req) => String(req?.user?.fullName || req?.user?.email || req?.user?.role || 'Vendor').slice(0, 120);
const toJsonSafeTheme = (theme) => JSON.parse(JSON.stringify(theme || {}));

const normalizeShopAliases = async ({ aliases, shop }) => {
    const result = normalizeSearchAliases({ aliases, officialName: shop?.shopName });
    if (result.errors.length) {
        const error = new Error(result.errors[0].message);
        error.statusCode = 400;
        error.code = result.errors[0].code || 'INVALID_SEARCH_ALIAS';
        error.validation = result.errors;
        throw error;
    }

    if (result.normalized.length) {
        const competitor = await Shop.findOne({
            _id: { $ne: shop._id },
            isActive: true,
            approvalStatus: 'Approved',
            $or: [
                { searchNameNormalized: { $in: result.normalized } },
                { shopName: { $in: result.aliases.map(alias => new RegExp(`^${String(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } }
            ]
        }).select('_id').lean();
        if (competitor) {
            const error = new Error('A search alias cannot use another active store\'s official name.');
            error.statusCode = 400;
            error.code = 'SEARCH_ALIAS_NOT_ALLOWED';
            throw error;
        }
    }
    return result;
};

const normalizeThemeForShop = async (theme, shop) => {
    const sanitizedTheme = sanitizeThemePayload(toJsonSafeTheme(theme));
    const validation = validateTheme(sanitizedTheme);
    if (!validation.valid) {
        const error = new Error(validation.errors[0]?.message || 'The Store Builder theme is invalid.');
        error.statusCode = 400;
        error.code = validation.errors[0]?.code === 'UNSUPPORTED_SECTION' ? 'UNSUPPORTED_SECTION' : 'INVALID_THEME';
        error.validation = validation.errors;
        throw error;
    }

    const cleanTheme = normalizeTheme(sanitizedTheme);
    const holder = { _id: shop?._id, theme: cleanTheme };
    await ensureThemeSectionArchitecture(holder, { persist: false });
    const policyDefaults = fillMissingPolicyDefaults(holder.theme?.policies || {}, { storeName: shop?.shopName });
    return normalizeTheme({
        ...holder.theme,
        policies: policyDefaults.policies,
        migrations: { ...(holder.theme?.migrations || {}), bannerSectionsV1: true }
    });
};

const safePlanAccess = (access = {}) => ({
    planKey: access.planKey,
    planName: access.planName,
    storeBuilderAccess: access.storeBuilderAccess,
    storeBuilderCapabilities: access.storeBuilderCapabilities || {},
    features: access.features || {},
    capabilityMetadata: getThemeCapabilityMetadata(access)
});

const getSelectedProductIds = (theme = {}) => [...new Set((theme.homepageSections || [])
    .filter(section => ['FeaturedProducts', 'Collection', 'CollectionShowcase'].includes(section?.type))
    .flatMap(section => section.settings?.productIds || section.settings?.source?.productIds || section.source?.productIds || [])
    .map(String)
    .filter(id => mongoose.Types.ObjectId.isValid(id)))];

const getSelectedReviewIds = (theme = {}) => [...new Set((theme.homepageSections || [])
    .filter(section => section?.type === 'Reviews')
    .flatMap(section => section.settings?.reviewIds || [])
    .map(String)
    .filter(id => mongoose.Types.ObjectId.isValid(id)))];

const getSeoStatistics = async (shopId) => {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const [productStats, collectionStats] = await Promise.all([
        Product.aggregate([
            { $match: buildPublicProductQuery(shopObjectId) },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    published: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'Published'] }, { $eq: ['$isActive', true] }] }, 1, 0] } },
                    withImageAlt: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$imageAltText', ''] } }, 0] }, 1, 0] } },
                    withSeoTitle: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$seo.title', ''] } }, 0] }, 1, 0] } },
                    withSeoDescription: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$seo.description', ''] } }, 0] }, 1, 0] } }
                }
            }
        ]),
        Collection.aggregate([
            { $match: { shop_id: shopObjectId, isActive: true } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: { $sum: { $cond: ['$isActive', 1, 0] } },
                    withSeoTitle: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$seo.title', ''] } }, 0] }, 1, 0] } },
                    withSeoDescription: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$seo.description', ''] } }, 0] }, 1, 0] } }
                }
            }
        ])
    ]);
    const products = productStats[0] || { total: 0, published: 0, withImageAlt: 0, withSeoTitle: 0, withSeoDescription: 0 };
    const collections = collectionStats[0] || { total: 0, active: 0, withSeoTitle: 0, withSeoDescription: 0 };
    return {
        products,
        collections,
        imageAltCoverage: products.total ? Math.round((products.withImageAlt / products.total) * 100) : 0
    };
};

const getStoreBuilderBootstrap = async ({ shopId }) => {
    const shop = await Shop.findById(shopId).select(BUILDER_SHOP_FIELDS).lean();
    if (!shop) return null;

    const migratedHolder = { _id: shop._id, theme: shop.theme || {} };
    await ensureThemeSectionArchitecture(migratedHolder, { persist: false });
    shop.theme = await normalizeThemeForShop(migratedHolder.theme, shop);
    shop.themeRevision = Number(shop.themeRevision || 0);

    const selectedProductIds = getSelectedProductIds(shop.theme);
    const selectedReviewIds = getSelectedReviewIds(shop.theme);
    const productBaseQuery = buildPublicProductQuery(shop._id);
    const [initialProducts, selectedProducts, categories, categoryMetadata, categoryCounts, publicCollections, initialReviews, selectedReviews, seoStats, draft, revisions, access] = await Promise.all([
        Product.find(productBaseQuery)
            .select('_id title slug category tags images imageAltText pricing.sellingPrice pricing.discount averageRating numReviews variants.stock status isActive')
            .sort({ createdAt: -1 }).limit(10).lean(),
        selectedProductIds.length
            ? Product.find({ ...productBaseQuery, _id: { $in: selectedProductIds } })
                .select('_id title slug category tags images imageAltText pricing.sellingPrice pricing.discount averageRating numReviews variants.stock status isActive').lean()
            : [],
        Product.distinct('category', productBaseQuery),
        Category.find({ shop_id: shop._id }).select('name coverImage updatedAt').lean(),
        Product.aggregate([
            { $match: { ...productBaseQuery, category: { $type: 'string', $ne: '' } } },
            { $group: { _id: '$category', productCount: { $sum: 1 } } }
        ]),
        Collection.find({ shop_id: shop._id, isActive: true }).select('_id title slug').sort({ title: 1 }).limit(50).lean(),
        Review.find({ shop_id: shop._id, rating: 5 }).select('_id product_id name rating comment createdAt').sort({ createdAt: -1 }).limit(10).lean(),
        selectedReviewIds.length
            ? Review.find({ shop_id: shop._id, rating: 5, _id: { $in: selectedReviewIds } }).select('_id product_id name rating comment createdAt').lean()
            : [],
        getSeoStatistics(shop._id),
        StoreBuilderDraft.findOne({ shop_id: shop._id }).select('-__v').lean(),
        StoreBuilderRevision.find({ shop_id: shop._id }).select('revision publishedByName source restoredFromRevision changeSummary createdAt').sort({ revision: -1 }).limit(10).lean(),
        getShopPlanAccess(shop)
    ]);

    const products = Array.from(new Map([...initialProducts, ...selectedProducts].map(product => [String(product._id), product])).values());
    const reviews = Array.from(new Map([...initialReviews, ...selectedReviews].map(review => [String(review._id), review])).values());
    const planAccess = safePlanAccess(access);

    return {
        shop: { ...shop, planAccess },
        planAccess,
        products,
        selectedProductIds,
        categories: categories.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b))),
        categoryDetails: mergeCategoryDetails({
            names: categories,
            metadata: categoryMetadata,
            counts: new Map(categoryCounts.map(item => [normalizeCategoryKey(item._id), Number(item.productCount || 0)]))
        }),
        collections: publicCollections,
        reviews,
        selectedReviewIds,
        seoStats,
        draft: draft ? { ...draft, stale: Number(draft.basedOnRevision || 0) !== shop.themeRevision } : null,
        revisions,
        publication: {
            revision: shop.themeRevision,
            lastPublishedAt: shop.lastPublishedAt || null,
            lastPublishedBy: shop.lastPublishedBy || null
        }
    };
};

const saveStoreBuilderDraft = async ({ shopId, req, theme, searchAliases, customDomain, storewideDiscount, basedOnRevision, planAccess }) => {
    const shop = await Shop.findById(shopId).select('_id shopName searchAliases theme themeRevision').lean();
    if (!shop) return null;
    const effectivePlanAccess = planAccess || await getShopPlanAccess(shopId);
    assertStoreBuilderUpdateAllowed({
        currentTheme: shop.theme || {},
        incomingTheme: theme || {},
        planAccess: effectivePlanAccess
    });
    const normalizedTheme = await normalizeThemeForShop(theme, shop);
    const aliasResult = await normalizeShopAliases({ aliases: searchAliases === undefined ? shop.searchAliases : searchAliases, shop });
    await assertThemeAssetOwnership({ shopId, theme: normalizedTheme });
    const draft = await StoreBuilderDraft.findOneAndUpdate(
        { shop_id: shopId },
        {
            $set: {
                theme: normalizedTheme,
                searchAliases: aliasResult.aliases,
                customDomain: customDomain || {},
                storewideDiscount: Math.max(0, Math.min(100, Number(storewideDiscount) || 0)),
                basedOnRevision: Math.max(0, Number(basedOnRevision) || 0),
                updatedBy: getActorId(req)
            }
        },
        { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await attachAssetsToDraft({ shopId, draftId: draft._id, theme: normalizedTheme });
    return { ...draft.toObject(), stale: Number(draft.basedOnRevision) !== Number(shop.themeRevision || 0) };
};

const buildRevisionFilter = (shopId, expectedRevision) => expectedRevision === 0
    ? { _id: shopId, $or: [{ themeRevision: 0 }, { themeRevision: { $exists: false } }] }
    : { _id: shopId, themeRevision: expectedRevision };

const createRevisionRecord = async ({ shop, revision, req, source, changeScope, restoredFromRevision, changeSummary, session }) => {
    const [record] = await StoreBuilderRevision.create([{
        shop_id: shop._id,
        revision,
        theme: normalizeTheme(shop.theme),
        searchAliases: shop.searchAliases || [],
        customDomain: shop.customDomain || {},
        storewideDiscount: Number(shop.storewideDiscount || 0),
        publishedBy: getActorId(req),
        publishedByName: getActorName(req),
        source,
        changeScope,
        restoredFromRevision,
        changeSummary
    }], session ? { session } : undefined);
    return record;
};

const supportsTransactions = () => {
    const topologyType = mongoose.connection?.client?.topology?.description?.type;
    return ['ReplicaSetWithPrimary', 'Sharded'].includes(topologyType);
};

const publishStoreBuilder = async ({
    shopId,
    req,
    theme,
    searchAliases,
    customDomain,
    storewideDiscount,
    expectedRevision,
    source = 'publish',
    changeScope = 'storefront',
    restoredFromRevision = null,
    draftCleanupScope = 'all',
    audit = null
}) => {
    const current = await Shop.findById(shopId).select(BUILDER_SHOP_FIELDS).lean();
    if (!current) return null;
    const currentRevision = Number(current.themeRevision || 0);
    const expected = expectedRevision === undefined || expectedRevision === null
        ? currentRevision
        : Math.max(0, Number(expectedRevision) || 0);
    if (expected !== currentRevision) {
        const error = new Error('The store theme was updated by another session.');
        error.statusCode = 409;
        error.code = 'THEME_CONFLICT';
        error.latestRevision = currentRevision;
        error.lastPublishedAt = current.lastPublishedAt || null;
        throw error;
    }

    const normalizedTheme = await normalizeThemeForShop(theme, current);
    const aliasResult = await normalizeShopAliases({ aliases: searchAliases === undefined ? current.searchAliases : searchAliases, shop: current });
    await assertThemeAssetOwnership({ shopId, theme: normalizedTheme });
    const revision = currentRevision + 1;
    const now = new Date();
    const changeSummary = summarizeThemeChanges(current.theme || {}, normalizedTheme);
    if (JSON.stringify(current.searchAliases || []) !== JSON.stringify(aliasResult.aliases || [])) {
        changeSummary.push({ area: 'SEO', message: 'Store search aliases changed.' });
    }
    const publishWarnings = [];
    const update = {
        theme: normalizedTheme,
        searchAliases: aliasResult.aliases,
        searchAliasesNormalized: aliasResult.normalized,
        searchNameNormalized: normalizeSearchText(current.shopName),
        themeRevision: revision,
        lastPublishedAt: now,
        lastPublishedBy: getActorId(req),
        customDomain: customDomain || current.customDomain || {},
        storewideDiscount: storewideDiscount === undefined
            ? Math.max(0, Math.min(100, Number(current.storewideDiscount) || 0))
            : Math.max(0, Math.min(100, Number(storewideDiscount) || 0))
    };

    const execute = async (session = null) => {
        let query = Shop.findOneAndUpdate(
            buildRevisionFilter(shopId, expected),
            { $set: update },
            { returnDocument: 'after', runValidators: true }
        ).select(BUILDER_SHOP_FIELDS).lean();
        if (session) query = query.session(session);
        const savedShop = await query;
        if (!savedShop) {
            const latest = await Shop.findById(shopId).select('themeRevision lastPublishedAt').lean();
            const error = new Error('The store theme was updated by another session.');
            error.statusCode = 409;
            error.code = 'THEME_CONFLICT';
            error.latestRevision = Number(latest?.themeRevision || 0);
            error.lastPublishedAt = latest?.lastPublishedAt || null;
            throw error;
        }
        try {
            await createRevisionRecord({
                shop: savedShop,
                revision,
                req,
                source,
                changeScope,
                restoredFromRevision,
                changeSummary,
                session
            });
            if (audit) {
                await logAudit({
                    req,
                    shop_id: shopId,
                    action: audit.action,
                    entityType: audit.entityType || 'ShopTheme',
                    entityId: shopId,
                    entityLabel: savedShop.shopName,
                    before: audit.before || { revision: currentRevision },
                    after: audit.after || { revision },
                    metadata: { ...(audit.metadata || {}), changeScope, changeSummary },
                    session,
                    strict: true
                });
            }
        } catch (error) {
            if (!session) {
                await Promise.all([
                    Shop.findOneAndUpdate(
                        { _id: shopId, themeRevision: revision },
                        {
                            $set: {
                                theme: current.theme || {},
                                searchAliases: current.searchAliases || [],
                                searchAliasesNormalized: current.searchAliasesNormalized || [],
                                searchNameNormalized: current.searchNameNormalized || normalizeSearchText(current.shopName),
                                themeRevision: currentRevision,
                                lastPublishedAt: current.lastPublishedAt || null,
                                lastPublishedBy: current.lastPublishedBy || null,
                                customDomain: current.customDomain || {},
                                storewideDiscount: Number(current.storewideDiscount || 0)
                            }
                        },
                        { runValidators: true }
                    ),
                    StoreBuilderRevision.deleteOne({ shop_id: shopId, revision })
                ]);
            }
            throw error;
        }

        try {
            await promotePublishedAssets({
                shopId,
                beforeTheme: current.theme || {},
                afterTheme: normalizedTheme,
                session
            });
        } catch (error) {
            if (!session) {
                await Promise.all([
                    Shop.findOneAndUpdate(
                        { _id: shopId, themeRevision: revision },
                        {
                            $set: {
                                theme: current.theme || {},
                                searchAliases: current.searchAliases || [],
                                searchAliasesNormalized: current.searchAliasesNormalized || [],
                                searchNameNormalized: current.searchNameNormalized || normalizeSearchText(current.shopName),
                                themeRevision: currentRevision,
                                lastPublishedAt: current.lastPublishedAt || null,
                                lastPublishedBy: current.lastPublishedBy || null,
                                customDomain: current.customDomain || {},
                                storewideDiscount: Number(current.storewideDiscount || 0)
                            }
                        },
                        { runValidators: true }
                    ),
                    StoreBuilderRevision.deleteOne({ shop_id: shopId, revision })
                ]);
            }
            throw error;
        }

        const draftCleanup = draftCleanupScope === 'seo'
            ? StoreBuilderDraft.updateOne(
                { shop_id: shopId },
                {
                    $set: {
                        'theme.seo': normalizedTheme.seo || {},
                        searchAliases: aliasResult.aliases,
                        basedOnRevision: revision,
                        updatedBy: getActorId(req)
                    }
                }
            )
            : StoreBuilderDraft.deleteOne({ shop_id: shopId });
        if (session) {
            await draftCleanup.session(session);
        } else {
            try {
                await draftCleanup;
            } catch (error) {
                publishWarnings.push('DRAFT_CLEANUP_PENDING');
                logger.warn('store_builder_draft_cleanup_pending', {
                    shopId,
                    revision,
                    requestId: req?.id,
                    error
                });
            }
        }
        savedShop.theme = normalizeTheme(toJsonSafeTheme(savedShop.theme));
        return savedShop;
    };

    let savedShop;
    if (supportsTransactions()) {
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                savedShop = await execute(session);
            });
        } finally {
            await session.endSession();
        }
    } else {
        savedShop = await execute();
    }

    try {
        const oldRevisions = await StoreBuilderRevision.find({ shop_id: shopId })
            .sort({ revision: -1 })
            .skip(REVISION_RETENTION)
            .select('_id')
            .lean();
        if (oldRevisions.length) {
            await StoreBuilderRevision.deleteMany({ _id: { $in: oldRevisions.map(item => item._id) } });
        }
    } catch (error) {
        publishWarnings.push('REVISION_RETENTION_PENDING');
        logger.warn('store_builder_revision_retention_pending', {
            shopId,
            revision,
            requestId: req?.id,
            error
        });
    }

    const access = await getShopPlanAccess(savedShop);
    return {
        ...savedShop,
        planAccess: safePlanAccess(access),
        changeSummary,
        warnings: publishWarnings
    };
};

const restoreStoreBuilderRevision = async ({ shopId, revisionId, expectedRevision, req }) => {
    const revision = await StoreBuilderRevision.findOne({ _id: revisionId, shop_id: shopId }).lean();
    if (!revision) return null;
    let theme = revision.theme;
    let customDomain = revision.customDomain;
    let storewideDiscount = revision.storewideDiscount;
    let draftCleanupScope = 'all';
    if (revision.changeScope === 'homepage-seo') {
        const current = await Shop.findById(shopId).select('theme customDomain storewideDiscount').lean();
        if (!current) return null;
        theme = {
            ...(current.theme || {}),
            seo: revision.theme?.seo || {}
        };
        customDomain = current.customDomain;
        storewideDiscount = current.storewideDiscount;
        draftCleanupScope = 'seo';
    }
    return publishStoreBuilder({
        shopId,
        req,
        theme,
        searchAliases: revision.searchAliases,
        customDomain,
        storewideDiscount,
        expectedRevision,
        source: 'restore',
        changeScope: revision.changeScope || 'storefront',
        draftCleanupScope,
        restoredFromRevision: revision.revision,
        audit: {
            action: 'store_builder.revision_restored',
            entityType: 'ShopTheme',
            metadata: {
                restoredRevisionId: revisionId,
                restoredFromRevision: revision.revision,
                changeScope: revision.changeScope || 'storefront'
            }
        }
    });
};

module.exports = {
    REVISION_RETENTION,
    BUILDER_SHOP_FIELDS,
    normalizeShopAliases,
    normalizeThemeForShop,
    safePlanAccess,
    getStoreBuilderBootstrap,
    saveStoreBuilderDraft,
    publishStoreBuilder,
    restoreStoreBuilderRevision
};
