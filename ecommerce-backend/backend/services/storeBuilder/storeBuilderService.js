const mongoose = require('mongoose');
const {
    assertSupportedThemeVersion,
    assertReadableThemeVersion,
    normalizeStoredTheme,
    mergeThemePatch,
    getThemeCapabilityMetadata,
    normalizeSearchAliases,
    normalizeSearchText,
    normalizeTheme,
    summarizeThemeChanges,
    validateTheme
} = require('@scaleup/storefront-theme');
const { collectAdaptiveReferences } = require('@scaleup/storefront-theme/storage');

const Shop = require('../../models/Shop');
const { preserveThemeExtensions } = require('./themeCompatibilityService');
const { getThemeAvailability, assertThemeAvailability } = require('./themeAvailabilityService');
const { resolveStoreBranding } = require('../shops/storeBrandingService');
const Product = require('../../models/Product');
const Review = require('../../models/Review');
const Collection = require('../../models/Collection');
const Category = require('../../models/Category');
const StoreBuilderDraft = require('../../models/StoreBuilderDraft');
const StoreBuilderRevision = require('../../models/StoreBuilderRevision');
const StoreBuilderAsset = require('../../models/StoreBuilderAsset');
const { fillMissingPolicyDefaults } = require('../policies/defaultPolicyTemplates');
const { buildPublicProductQuery } = require('../products/publicProductQueryService');
const { ensureThemeSectionArchitecture } = require('../themeSectionService');
const { getShopPlanAccess } = require('../billing/planAccessService');
const { assertStoreBuilderUpdateAllowed } = require('../billing/storeBuilderPlanService');
const logger = require('../logger');
const adaptivePolicy = require('./adaptivePersistencePolicy');
const { assertCompleteThemeWrite, themeError } = require('../../models/storeBuilderThemeContract');
const { logAudit } = require('../auditLogService');
const {
    assertThemeAssetOwnership,
    attachAssetsToDraft,
    promotePublishedAssets,
    getThemeAssetIds
} = require('./storeBuilderAssetService');
const { mergeCategoryDetails, normalizeCategoryKey } = require('../categories/categoryService');
const { sanitizePublicProducts } = require('../publicProductSerializer');
const { getStorefrontPreviewCards } = require('../products/storefrontPreviewDataService');
const { applyScheduledSalesToProducts } = require('../sales/scheduledSaleService');
const { getPublicTrustedBadge } = require('../verification/publicTrustedBadgeService');
const { buildPublicShopVerification } = require('../verification/vendorVerificationStatusService');
const { buildPagination } = require('../../utils/pagination');

const REVISION_RETENTION = 20;
const BUILDER_SHOP_FIELDS = [
    'shopName', 'subdomain', 'branding', 'theme', 'themeRevision', 'lastPublishedAt', 'lastPublishedBy',
    'customDomain', 'plan', 'featureFlags', 'storewideDiscount', 'isActive', 'approvalStatus',
    'suspensionReason', 'searchAliases', 'searchAliasesNormalized', 'searchNameNormalized', 'updatedAt',
    'badgeStatus', 'badgeType', 'badgeApprovedAt', 'badgeExpiresAt', 'badgeRevokedAt',
    'verification.status', 'verification.phoneVerified', 'verification.phoneVerifiedAt', 'verification.isVendorVerified', 'verification.verifiedAt'
].join(' ');
const PREVIEW_PRODUCT_FIELDS = '_id title slug category tags images imageAltText coverMediaId entitlementMedia pricing.sellingPrice pricing.discount pricing.salePrice pricing.compareAtPrice averageRating numReviews variants._id variants.stock variants.priceOverride variants.pricing.price variants.attributes variants.image variants.isActive variants.status options features specifications comments status isActive';

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

const normalizeThemeForShop = async (theme, shop, { readOnly = false, changeScope } = {}) => {
    const adaptive = Number(theme?.version) === 5 && theme?.siteBuilder;
    const currentAdaptive = Number(shop?.theme?.version) === 5 && shop?.theme?.siteBuilder;
    if (!readOnly) {
        if (Object.hasOwn(theme || {}, 'siteBuilder') && !adaptive) assertReadableThemeVersion(theme);
        (currentAdaptive ? assertReadableThemeVersion : assertSupportedThemeVersion)(shop?.theme || {});
        (adaptive ? assertReadableThemeVersion : assertSupportedThemeVersion)(theme || {});
        if (currentAdaptive) assertCompleteThemeWrite(shop.theme, theme);
    }
    if (adaptive) normalizeStoredTheme(toJsonSafeTheme(theme)); // Reject before legacy sanitization.
    // Merge a permitted partial write before defaults/migrations. Otherwise a
    // typography-only draft can synthesize a fallback section and fail limited
    // plan checks, or overwrite omitted merchant content. v5 complete-write
    // fences above still run against the unmerged incoming candidate.
    const previousTheme = toJsonSafeTheme(shop?.theme);
    const presetChanged = Object.hasOwn(theme || {}, 'preset') && theme.preset?.id !== previousTheme?.preset?.id;
    const candidate = readOnly || adaptive || presetChanged ? toJsonSafeTheme(theme) : mergeThemePatch(previousTheme, toJsonSafeTheme(theme));
    const sanitizedTheme = preserveThemeExtensions(candidate, previousTheme);
    const validate = adaptive ? require('@scaleup/storefront-theme').validateStoredTheme : validateTheme;
    const validation = validate({ ...sanitizedTheme,
        ...(Object.hasOwn(theme || {}, 'presentationVariant') ? { presentationVariant: theme.presentationVariant } : {}) });
    if (!validation.valid && !readOnly) {
        const error = new Error(validation.errors[0]?.message || 'The Store Builder theme is invalid.');
        error.statusCode = 400;
        error.code = validation.errors[0]?.code === 'UNSUPPORTED_SECTION' ? 'UNSUPPORTED_SECTION' : 'INVALID_THEME';
        error.validation = validation.errors;
        throw error;
    }

    const normalize = adaptive ? normalizeStoredTheme : normalizeTheme;
    const cleanTheme = normalize(sanitizedTheme);
    if (!readOnly) await assertThemeAvailability({ shop, rawTheme: theme, targetTheme: cleanTheme, changeScope });
    // Existing v5 snapshots already own their fallbacks. A partial SEO update or
    // reader must not migrate homepage/policies while preserving that graph.
    if (adaptive && currentAdaptive) return cleanTheme;
    const holder = { _id: shop?._id, theme: cleanTheme };
    await ensureThemeSectionArchitecture(holder, { persist: false });
    const policyDefaults = fillMissingPolicyDefaults(holder.theme?.policies || {}, { storeName: shop?.shopName });
    return normalize({
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

const getSelectedProductIds = (theme = {}) => [...new Set([...(Number(theme.version) === 5 ? collectAdaptiveReferences(theme).productIds : []), ...(theme.homepageSections || [])
    .filter(section => ['FeaturedProducts', 'Collection', 'CollectionShowcase'].includes(section?.type))
    .flatMap(section => section.settings?.productIds || section.settings?.source?.productIds || section.source?.productIds || [])
    .map(String)
    .filter(id => mongoose.Types.ObjectId.isValid(id))])];

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
    if (Number(shop.theme?.version) >= 5) normalizeStoredTheme(toJsonSafeTheme(shop.theme));

    const migratedHolder = { _id: shop._id, theme: shop.theme || {} };
    await ensureThemeSectionArchitecture(migratedHolder, { persist: false });
    const previewBranding = await resolveStoreBranding(shop);
    shop.theme = await normalizeThemeForShop(migratedHolder.theme, shop, { readOnly: true });
    shop.themeRevision = Number(shop.themeRevision || 0);

    const draft = await StoreBuilderDraft.findOne({ shop_id: shop._id }).select('-__v').lean();
    if (Number(draft?.theme?.version) >= 5) normalizeStoredTheme(toJsonSafeTheme(draft.theme));
    const adaptiveAssetIds = [...new Set([shop.theme, draft?.theme].filter(theme => Number(theme?.version) === 5)
        .flatMap(theme => collectAdaptiveReferences(toJsonSafeTheme(theme)).assetIds))];
    const adaptiveAssets = adaptiveAssetIds.length ? await StoreBuilderAsset.find({ shop_id: shop._id,
        _id: { $in: adaptiveAssetIds }, status: { $in: ['temporary', 'active', 'retired'] } })
        .select('_id url width height status expiresAt').lean() : [];
    const selectedProductIds = [...new Set([...getSelectedProductIds(shop.theme), ...getSelectedProductIds(draft?.theme)])];
    const selectedReviewIds = [...new Set([...getSelectedReviewIds(shop.theme), ...getSelectedReviewIds(draft?.theme)])];
    const productBaseQuery = buildPublicProductQuery(shop._id);
    const [initialProducts, selectedProducts, categories, categoryMetadata, categoryCounts, publicCollections, initialReviews, selectedReviews, seoStats, revisions, access] = await Promise.all([
        Product.find(productBaseQuery)
            .select(PREVIEW_PRODUCT_FIELDS)
            .sort({ createdAt: -1, _id: 1 }).limit(9).lean(),
        selectedProductIds.length
            ? Product.find({ ...productBaseQuery, _id: { $in: selectedProductIds } })
                .select(PREVIEW_PRODUCT_FIELDS).lean()
            : [],
        Product.distinct('category', productBaseQuery),
        Category.find({ shop_id: shop._id }).select('name coverImage updatedAt').lean(),
        Product.aggregate([
            { $match: { ...productBaseQuery, category: { $type: 'string', $ne: '' } } },
            { $group: { _id: '$category', productCount: { $sum: 1 } } }
        ]),
        Collection.find({ shop_id: shop._id, isActive: true }).select('_id title slug').sort({ title: 1 }).limit(50).lean(),
        Review.find({ shop_id: shop._id, rating: 5, ...Review.getEligibilityQuery() }).select('_id product_id name rating comment createdAt').sort({ createdAt: -1 }).limit(10).lean(),
        selectedReviewIds.length
            ? Review.find({ shop_id: shop._id, rating: 5, _id: { $in: selectedReviewIds }, ...Review.getEligibilityQuery() }).select('_id product_id name rating comment createdAt').lean()
            : [],
        getSeoStatistics(shop._id),
        StoreBuilderRevision.find({ shop_id: shop._id }).select('revision publishedByName source restoredFromRevision changeSummary createdAt').sort({ revision: -1 }).limit(10).lean(),
        getShopPlanAccess(shop)
    ]);

    const rawProducts = Array.from(new Map([...initialProducts, ...selectedProducts].map(product => [String(product._id), product])).values());
    // Product-detail previews retain variants. Home cards use exactly the public
    // projection and sale preparation, independent of selected-product lookup limits.
    const [pricedDetails, pricedCards, trustedBadge] = await Promise.all([
        applyScheduledSalesToProducts({ shopId: shop._id, products: rawProducts }),
        getStorefrontPreviewCards({ shopId: shop._id, productIds: rawProducts.map(product => product._id) }),
        getPublicTrustedBadge(shop),
    ]);
    const products = sanitizePublicProducts(pricedDetails);
    const cardsById = Object.fromEntries(pricedCards.map(product => [String(product._id), product]));
    const rawReviews = Array.from(new Map([...initialReviews, ...selectedReviews].map(review => [String(review._id), review])).values());
    const reviewProductIds = [...new Set(rawReviews.map(review => String(review.product_id)).filter(id => mongoose.Types.ObjectId.isValid(id)))];
    const reviewProducts = reviewProductIds.length ? await Product.find({ shop_id: shop._id, isDeleted: false, _id: { $in: reviewProductIds } }).select('title').lean() : [];
    const reviewProductMap = new Map(reviewProducts.map(product => [String(product._id), product]));
    const reviews = rawReviews.map(review => ({ ...review, product: reviewProductMap.get(String(review.product_id)) || null }));
    const planAccess = safePlanAccess(access);

    return {
        adaptiveAvailability: adaptivePolicy.getAdaptiveAvailability({ shopId: shop._id, planAccess: access }),
        adaptiveAssets: adaptiveAssets.map(asset => ({ assetId: String(asset._id), url: asset.url, width: asset.width, height: asset.height,
            status: asset.status, expiresAt: asset.expiresAt })),
        shop: { ...shop, planAccess, previewBranding, trustedBadge, shopVerification: buildPublicShopVerification(shop, { eligible: access.features?.publicVerifiedBadge }) },
        planAccess,
        themeAvailability: getThemeAvailability({ shop, planAccess: access }),
        products,
        previewCatalog: {
            products: initialProducts.map(product => cardsById[String(product._id)]).filter(Boolean),
            productsById: cardsById,
            pagination: buildPagination({ total: seoStats.products.total, page: 1, limit: 9 }),
        },
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

const { draftConflict, draftWriteFilter } = require('./draftConcurrency');

const saveStoreBuilderDraftCandidate = async ({ shopId, req, theme, searchAliases, customDomain, storewideDiscount, basedOnRevision, planAccess, expectedDraftUpdatedAt }, session = null) => {
    let shopQuery = Shop.findById(shopId).select('_id shopName searchAliases theme themeRevision');
    if (session) shopQuery = shopQuery.session(session);
    const shop = await shopQuery.lean();
    if (!shop) return null;
    const adaptive = Number(shop.theme?.version) === 5 || Number(theme?.version) === 5;
    if (adaptive) {
        const previousDraft = await StoreBuilderDraft.findOne({ shop_id: shopId }).select('theme updatedAt').session(session).lean();
        assertCompleteThemeWrite(shop.theme, theme);
        if (previousDraft) assertCompleteThemeWrite(previousDraft.theme, theme);
        if (expectedDraftUpdatedAt === undefined || basedOnRevision === undefined) throw themeError('THEME_CLIENT_UPGRADE_REQUIRED', 'Adaptive saves require explicit draft and published revision tokens.');
    }
    if (expectedDraftUpdatedAt !== undefined && Number(basedOnRevision) !== Number(shop.themeRevision || 0)) throw draftConflict();
    const draftFilter = draftWriteFilter(shopId, expectedDraftUpdatedAt);
    const effectivePlanAccess = planAccess || await getShopPlanAccess(shopId);
    if (!adaptive) assertStoreBuilderUpdateAllowed({
        currentTheme: shop.theme || {},
        incomingTheme: theme || {},
        planAccess: effectivePlanAccess
    });
    const normalizedTheme = await normalizeThemeForShop(theme, shop);
    if (adaptive) await adaptivePolicy.assertAdaptiveThemeMutation({ shop, candidate: normalizedTheme, req });
    if (Number(normalizedTheme.version) === 5) await lockAdaptiveDraftRevision({ shopId, expectedRevision: basedOnRevision, session });
    // Adaptive writes have their own fresh actor, entitlement and rollout checks above.
    if (!adaptive) assertStoreBuilderUpdateAllowed({ currentTheme: shop.theme || {}, incomingTheme: normalizedTheme,
        planAccess: effectivePlanAccess, completeSnapshot: true });
    const aliasResult = await normalizeShopAliases({ aliases: searchAliases === undefined ? shop.searchAliases : searchAliases, shop });
    await assertThemeAssetOwnership({ shopId, theme: normalizedTheme });
    const nextUpdatedAt = new Date(Math.max(Date.now(), new Date(expectedDraftUpdatedAt || 0).getTime() + 1));
    let draft;
    try { draft = await StoreBuilderDraft.findOneAndUpdate(
        draftFilter,
        {
            $set: {
                theme: normalizedTheme,
                searchAliases: aliasResult.aliases,
                customDomain: customDomain || {},
                storewideDiscount: Math.max(0, Math.min(100, Number(storewideDiscount) || 0)),
                basedOnRevision: Math.max(0, Number(basedOnRevision) || 0),
                updatedBy: getActorId(req),
                updatedAt: nextUpdatedAt
            },
            $setOnInsert: { createdAt: nextUpdatedAt }
        },
        { returnDocument: 'after', upsert: expectedDraftUpdatedAt == null, runValidators: true, setDefaultsOnInsert: true, timestamps: false, session }
    ); } catch (error) {
        if (error.code === 11000) throw draftConflict();
        throw error;
    }
    if (!draft) throw draftConflict();
    if (expectedDraftUpdatedAt !== undefined) {
        let latestQuery = Shop.findById(shopId).select('themeRevision');
        if (session) latestQuery = latestQuery.session(session);
        const latest = await latestQuery.lean();
        if (Number(latest?.themeRevision || 0) !== Number(basedOnRevision)) {
            if (!session) await StoreBuilderDraft.deleteOne({ shop_id: shopId, _id: draft._id, updatedAt: nextUpdatedAt });
            throw draftConflict();
        }
    }
    await attachAssetsToDraft({ shopId, draftId: draft._id, theme: normalizedTheme, session });
    return { ...draft.toObject(), stale: Number(draft.basedOnRevision) !== Number(shop.themeRevision || 0) };
};

const buildRevisionFilter = (shopId, expectedRevision) => expectedRevision === 0
    ? { _id: shopId, $or: [{ themeRevision: 0 }, { themeRevision: { $exists: false } }] }
    : { _id: shopId, themeRevision: expectedRevision };

const createRevisionRecord = async ({ shop, revision, req, source, changeScope, restoredFromRevision, changeSummary, session }) => {
    const [record] = await StoreBuilderRevision.create([{
        shop_id: shop._id,
        revision,
        theme: Number(shop.theme?.version) === 5 ? normalizeStoredTheme(toJsonSafeTheme(shop.theme)) : normalizeTheme(shop.theme),
        ...(Number(shop.theme?.version) === 5 ? { assetIds: await getThemeAssetIds({ shopId: shop._id, theme: shop.theme, session }) } : {}),
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
const verifyAdaptiveTransactions = async () => {
    if (!mongoose.connection.db) return false;
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    return Boolean((hello.setName || hello.msg === 'isdbgrid') && hello.logicalSessionTimeoutMinutes != null
        && hello.maxWireVersion >= 7 && (hello.isWritablePrimary || hello.msg === 'isdbgrid'));
};

const withAdaptiveTransaction = async (theme, execute) => {
    if (Number(theme?.version) !== 5) return execute(null);
    if (!await verifyAdaptiveTransactions()) throw Object.assign(themeError('ADAPTIVE_TRANSACTIONS_REQUIRED', 'Adaptive writes require verified MongoDB transaction support.'), { statusCode: 503 });
    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => { result = await execute(session); });
        return result;
    } finally { await session.endSession(); }
};
const lockAdaptiveDraftRevision = async ({ shopId, expectedRevision, session }) => {
    if (!session || !Number.isInteger(Number(expectedRevision)) || Number(expectedRevision) < 0) throw draftConflict();
    const result = await Shop.updateOne(buildRevisionFilter(shopId, Number(expectedRevision)),
        { $inc: { adaptiveWriteLock: 1 } }, { session, timestamps: false });
    if (result.matchedCount !== 1) throw draftConflict();
};
const saveStoreBuilderDraft = async options => withAdaptiveTransaction(options.theme,
    session => saveStoreBuilderDraftCandidate(options, session));

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

    const normalizedTheme = await normalizeThemeForShop(theme, current, { changeScope });
    if (changeScope === 'homepage-seo' && Number(normalizedTheme.version) !== 5) {
        const withoutSeo = value => { const copy = toJsonSafeTheme(value); delete copy.seo; return normalizeTheme(copy); };
        if (JSON.stringify(withoutSeo(theme)) !== JSON.stringify(withoutSeo(current.theme))) throw themeError('INVALID_SEO_CHANGE_SCOPE', 'SEO publication must preserve the storefront design.');
    }
    if (Number(current.theme?.version) === 5 || Number(normalizedTheme.version) === 5) await adaptivePolicy.assertAdaptiveThemeMutation({ shop: current, candidate: normalizedTheme, req, changeScope });
    if (Number(normalizedTheme.version) === 5 && (expectedRevision === undefined || expectedRevision === null)) {
        throw themeError('THEME_CLIENT_UPGRADE_REQUIRED', 'Adaptive publication requires an explicit published revision token.');
    }
    const transactional = Number(normalizedTheme.version) === 5 ? await verifyAdaptiveTransactions() : supportsTransactions();
    if (Number(normalizedTheme.version) === 5 && !audit) audit = { action: 'store_builder.published', entityType: 'ShopTheme' };
    if (Number(normalizedTheme.version) === 5 && !transactional) {
        throw Object.assign(themeError('ADAPTIVE_TRANSACTIONS_REQUIRED', 'Adaptive publication requires a MongoDB replica set with transaction support.'), { statusCode: 503 });
    }
    // Validate the actual snapshot at the persistence boundary, including restore
    // and direct service callers. Homepage SEO has its own independently gated flow.
    let candidateAccess;
    if (changeScope !== 'homepage-seo') {
        const planAccess = await getShopPlanAccess(shopId);
        candidateAccess = planAccess;
        if (Number(normalizedTheme.version) !== 5) assertStoreBuilderUpdateAllowed({ currentTheme: current.theme || {}, incomingTheme: normalizedTheme,
            planAccess, completeSnapshot: true });
    }
    if (Number(normalizedTheme.version) === 5 && !candidateAccess) candidateAccess = await getShopPlanAccess(shopId);
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

        // An old publisher may coexist with a newer unpublished draft. Its
        // cleanup must neither delete nor rebase data that client cannot read.
        const cleanupFilter = { shop_id: shopId, ...(Number(normalizedTheme.version) === 5 ? {} : { 'theme.version': { $ne: 5 } }) };
        const draftCleanup = draftCleanupScope === 'seo'
            ? StoreBuilderDraft.updateOne(
                cleanupFilter,
                {
                    $set: {
                        'theme.seo': normalizedTheme.seo || {},
                        searchAliases: aliasResult.aliases,
                        basedOnRevision: revision,
                        updatedBy: getActorId(req)
                    }
                }
            )
            : StoreBuilderDraft.deleteOne(cleanupFilter);
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
        savedShop.theme = Number(savedShop.theme?.version) === 5 ? normalizeStoredTheme(toJsonSafeTheme(savedShop.theme)) : normalizeTheme(toJsonSafeTheme(savedShop.theme));
        return savedShop;
    };

    let savedShop;
    if (transactional) {
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
            await StoreBuilderRevision.deleteMany({ shop_id: shopId, _id: { $in: oldRevisions.map(item => item._id) } });
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

    const access = Number(normalizedTheme.version) === 5 ? candidateAccess : await getShopPlanAccess(savedShop);
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
    restoreStoreBuilderRevision,
    withAdaptiveTransaction,
    lockAdaptiveDraftRevision
};
