const Shop = require('../models/Shop');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Collection = require('../models/Collection');
const mongoose = require('mongoose');
const cache = require('../services/cacheService');
const { invalidateTenantCache } = require('../middlewares/tenant');
const { ensureThemeSectionArchitecture } = require('../services/themeSectionService');
const { fillMissingPolicyDefaults } = require('../services/policies/defaultPolicyTemplates');
const { generateStoreSeoSuggestion } = require('../services/storeSeoAiService');
const { buildPublicProductQuery } = require('../services/products/publicProductQueryService');
const {
    normalizeCustomDomain,
    isValidCustomDomain,
    isPlatformDomain
} = require('../utils/domainUtils');
const {
    buildCustomDomainVerificationFields
} = require('../services/domain/dnsVerificationService');
const { getShopPlanAccess, buildLimitError } = require('../services/billing/planAccessService');
const { getWeeklyAiUsage } = require('../services/billing/planUsageService');
const {
    beginAiGeneration,
    completeAiGeneration,
    failAiGeneration,
    getReplayResponse
} = require('../services/ai/aiGenerationPolicyService');
const {
    assertStoreBuilderUpdateAllowed,
    getPublicThemeForPlan
} = require('../services/billing/storeBuilderPlanService');
const StoreBuilderDraft = require('../models/StoreBuilderDraft');
const StoreBuilderRevision = require('../models/StoreBuilderRevision');
const { logAudit } = require('../services/auditLogService');
const {
    getStoreBuilderBootstrap,
    publishStoreBuilder,
    restoreStoreBuilderRevision,
    saveStoreBuilderDraft
} = require('../services/storeBuilder/storeBuilderService');
const {
    deleteTemporaryAsset,
    registerTemporaryAsset
} = require('../services/storeBuilder/storeBuilderAssetService');
const {
    deleteStoreBuilderSeoDraft,
    getStoreBuilderSeoBootstrap,
    publishStoreBuilderSeo,
    saveStoreBuilderSeoDraft
} = require('../services/storeBuilder/storeBuilderSeoService');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sendStoreBuilderError = (res, err, fallbackMessage) => {
    const message = err.message || fallbackMessage;
    return res.status(err.statusCode || 400).json({
        success: false,
        ...(err.code && { code: err.code }),
        ...(err.validation && { validation: err.validation }),
        ...(err.latestRevision !== undefined && { latestRevision: err.latestRevision }),
        ...(err.lastPublishedAt !== undefined && { lastPublishedAt: err.lastPublishedAt }),
        message,
        error: message
    });
};

const invalidateStoreBuilderSeoCache = async (shopId) => {
    const shop = await Shop.findById(shopId).select('subdomain customDomain.domain').lean();
    await Promise.all([
        cache.del(`storefront:settings:${shopId}`),
        cache.delPattern(`storefront:bootstrap:${shopId}:*`),
        shop?.subdomain ? invalidateTenantCache(shop.subdomain) : Promise.resolve(),
        shop?.customDomain?.domain ? invalidateTenantCache(shop.customDomain.domain) : Promise.resolve()
    ]);
};

const safelyInvalidateStoreBuilderSeoCache = async (shopId, req) => {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            await invalidateStoreBuilderSeoCache(shopId);
            if (attempt > 1) {
                console.info('store_builder_cache_invalidation_recovered', {
                    shopId: String(shopId),
                    requestId: req?.id,
                    attempt
                });
            }
            return null;
        } catch (error) {
            if (attempt === maxAttempts) {
                console.error('store_builder_cache_invalidation_failed', {
                    shopId: String(shopId),
                    requestId: req?.id,
                    attempts: attempt,
                    errorCode: error?.code || 'CACHE_INVALIDATION_FAILED'
                });
                return 'CACHE_INVALIDATION_PENDING';
            }
            await new Promise(resolve => setTimeout(resolve, attempt * 75));
        }
    }
    return 'CACHE_INVALIDATION_PENDING';
};

const assertCustomDomainAvailable = async (domain, shopId) => {
    const existingShop = await Shop.findOne({
        _id: { $ne: shopId },
        'customDomain.domain': domain
    }).select('_id').lean();

    if (existingShop) {
        const error = new Error('This domain is already connected to another shop.');
        error.statusCode = 400;
        error.code = 'DOMAIN_ALREADY_IN_USE';
        throw error;
    }
};

exports.getStoreBuilderSettings = async (req, res) => {
    try {
        const bootstrap = await getStoreBuilderBootstrap({ shopId: req.tenantId });
        if (!bootstrap) return res.status(404).json({ success: false, error: 'Shop not found' });

        const shop = bootstrap.shop;
        const domain = normalizeCustomDomain(shop.customDomain?.domain);
        if (domain && !shop.customDomain?.verificationToken) {
            shop.customDomain = {
                ...(shop.customDomain || {}),
                ...buildCustomDomainVerificationFields(shop._id, domain)
            };
        }

        res.status(200).json({
            success: true,
            data: {
                ...shop,
                products: bootstrap.products,
                categories: bootstrap.categories,
                categoryDetails: bootstrap.categoryDetails,
                collections: bootstrap.collections,
                reviews: bootstrap.reviews,
                seoStats: bootstrap.seoStats,
                draft: bootstrap.draft,
                revisions: bootstrap.revisions,
                publication: bootstrap.publication
            },
            bootstrap,
            planAccess: bootstrap.planAccess
        });
    } catch (err) {
        console.error('Get store builder settings error:', err);
        res.status(500).json({ success: false, error: 'Failed to load store builder settings' });
    }
};

exports.updateStoreBuilderSettings = async (req, res) => {
    try {
        const { theme: requestedTheme, searchAliases, customDomain, storewideDiscount, expectedRevision } = req.body;
        let domainCacheKeys = [];
        const currentShopForPlan = await Shop.findById(req.tenantId).select('theme customDomain themeRevision').lean();
        if (!currentShopForPlan) return res.status(404).json({ success: false, error: 'Shop not found' });
        const theme = requestedTheme === undefined ? (currentShopForPlan.theme || {}) : requestedTheme;
        const planAccess = await getShopPlanAccess(req.tenantId);
        assertStoreBuilderUpdateAllowed({
            currentTheme: currentShopForPlan?.theme || {},
            incomingTheme: theme,
            planAccess
        });
        let nextCustomDomain = { ...(currentShopForPlan.customDomain || {}) };

        if (customDomain !== undefined) {
            const normalizedDomain = normalizeCustomDomain(customDomain);
            const currentDomain = normalizeCustomDomain(currentShopForPlan?.customDomain?.domain);
            domainCacheKeys = [currentDomain, normalizedDomain].filter(Boolean);

            if (!normalizedDomain) {
                nextCustomDomain = {
                    domain: '', status: 'NotConfigured', verifiedAt: null, lastCheckedAt: new Date(), adminNote: '',
                    verificationToken: '', verificationMethod: 'TXT', dnsTarget: '', expectedTxtValue: '',
                    ownershipVerified: false, routingVerified: false, manuallyVerifiedRouting: false,
                    lastDnsCheckStatus: '', lastDnsCheckError: '', lastOwnershipCheckStatus: '',
                    lastRoutingCheckStatus: '', lastDnsRecords: { txt: [], cname: [], a: [] }
                };
            } else {
                if (isPlatformDomain(normalizedDomain)) {
                    return res.status(400).json({
                        success: false,
                        code: 'PLATFORM_DOMAIN_NOT_ALLOWED',
                        message: 'Platform domains cannot be used as store custom domains.',
                        error: 'Platform domains cannot be used as store custom domains.'
                    });
                }

                if (!isValidCustomDomain(normalizedDomain)) {
                    return res.status(400).json({
                        success: false,
                        code: 'INVALID_CUSTOM_DOMAIN',
                        message: 'Invalid custom domain.',
                        error: 'Invalid custom domain.'
                    });
                }

                await assertCustomDomainAvailable(normalizedDomain, req.tenantId);
                nextCustomDomain.domain = normalizedDomain;

                if (normalizedDomain !== currentDomain) {
                    nextCustomDomain = {
                        ...nextCustomDomain,
                        domain: normalizedDomain,
                        status: 'PendingVerification',
                        verifiedAt: null,
                        lastCheckedAt: new Date(),
                        adminNote: '',
                        ...buildCustomDomainVerificationFields(req.tenantId, normalizedDomain)
                    };
                }
            }
        }

        const responseShop = await publishStoreBuilder({
            shopId: req.tenantId,
            req,
            theme,
            searchAliases,
            customDomain: nextCustomDomain,
            storewideDiscount,
            expectedRevision,
            audit: {
                action: 'store_builder.published',
                entityType: 'ShopTheme',
                before: { revision: Number(currentShopForPlan.themeRevision || 0) }
            }
        });

        await Promise.all([
            cache.del(`storefront:settings:${req.tenantId}`),
            cache.delPattern(`storefront:bootstrap:${req.tenantId}:*`),
            ...domainCacheKeys.map(domain => invalidateTenantCache(domain))
        ]);
        res.status(200).json({
            success: true,
            message: 'Store settings updated',
            data: responseShop,
            planAccess: responseShop.planAccess
        });
    } catch (err) {
        console.error('Update store builder settings error:', err);
        const duplicateDomain = err?.code === 11000 && String(err?.message || '').includes('customDomain');
        const message = duplicateDomain
            ? 'This domain is already connected to another shop.'
            : err.message || 'Failed to update store builder settings';
        res.status(err.statusCode || 400).json({
            success: false,
            ...((err.code || duplicateDomain) && { code: duplicateDomain ? 'DOMAIN_ALREADY_IN_USE' : err.code }),
            ...(err.capability && { capability: err.capability }),
            ...(err.validation && { validation: err.validation }),
            ...(err.latestRevision !== undefined && { latestRevision: err.latestRevision }),
            ...(err.lastPublishedAt !== undefined && { lastPublishedAt: err.lastPublishedAt }),
            message,
            error: message
        });
    }
};

exports.suggestStoreSeo = async (req, res) => {
    let generationState = null;
    try {
        const shop = await Shop.findById(req.tenantId)
            .select('shopName subdomain theme')
            .lean();

        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        const currentTheme = req.body?.currentTheme || {};
        const theme = {
            ...(shop.theme || {}),
            ...currentTheme,
            seo: {
                ...(shop.theme?.seo || {}),
                ...(currentTheme.seo || {})
            },
            hero: {
                ...(shop.theme?.hero || {}),
                ...(currentTheme.hero || {})
            },
            navigation: Array.isArray(currentTheme.navigation)
                ? currentTheme.navigation
                : (shop.theme?.navigation || [])
        };

        const [products, collections] = await Promise.all([
            Product.find(buildPublicProductQuery(req.tenantId))
                .select('title category tags')
                .sort({ createdAt: -1 })
                .limit(20)
                .lean(),
            Collection.find({ shop_id: req.tenantId, isActive: true })
                .select('title')
                .sort({ updatedAt: -1 })
                .limit(10)
                .lean()
        ]);

        generationState = await beginAiGeneration({ req, feature: 'seo.homepage' });
        const suggestion = await generateStoreSeoSuggestion({
            shop,
            theme,
            products,
            collections,
            requestPreferences: {
                language: req.body?.language,
                spellingPreference: req.body?.spellingPreference,
                tone: req.body?.tone
            }
        });
        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'store_builder.seo_ai_suggested',
            entityType: 'ShopTheme',
            entityId: req.tenantId,
            entityLabel: shop.shopName,
            metadata: {
                alternativeCount: suggestion.alternatives?.length || 0,
                generatedFromHash: suggestion.generatedFromHash || '',
                fallback: Boolean(suggestion.fallback)
            }
        });
        const payload = { success: true, data: suggestion };
        const usage = await completeAiGeneration({
            req,
            state: generationState,
            result: payload,
            meta: suggestion.meta
        });
        generationState = null;
        res.status(200).json({ ...payload, usage });
    } catch (err) {
        const replay = getReplayResponse(err);
        if (replay) return res.status(200).json({ ...replay, replayed: true });
        await failAiGeneration({ req, state: generationState, error: err });
        if (err?.code === 'AI_REQUEST_IN_PROGRESS') {
            return res.status(409).json({ success: false, code: err.code, error: err.message });
        }
        if (err?.code === 'PLAN_LIMIT_REACHED') {
            const planContext = req.planAccess || await getShopPlanAccess(req.tenantId);
            const usage = err.usage || await getWeeklyAiUsage({
                shopId: req.tenantId,
                limit: planContext.limits.aiProductCreationsPerWeek
            });
            return res.status(403).json(await buildLimitError(
                planContext,
                'aiProductCreationsPerWeek',
                usage,
                planContext.limits.aiProductCreationsPerWeek
            ));
        }
        const isMissingConfig = err?.code === 'AI_NOT_CONFIGURED';
        if (!isMissingConfig) {
            console.error('Store SEO AI suggestion error:', err.message);
        }
        res.status(isMissingConfig ? 503 : 502).json({
            success: false,
            code: isMissingConfig ? 'SEO_AI_CONTEXT_UNAVAILABLE' : (err.code || 'AI_PROVIDER_FAILED'),
            error: isMissingConfig
                ? 'AI SEO suggestions are not configured yet. Please add GEMINI_API_KEY on the backend server.'
                : 'AI SEO suggestions could not be generated right now. Please try again later.'
        });
    }
};

exports.getStoreBuilderSeoBootstrap = async (req, res) => {
    try {
        const data = await getStoreBuilderSeoBootstrap({ shopId: req.tenantId });
        if (!data) return res.status(404).json({ success: false, error: 'Shop not found' });
        return res.status(200).json({ success: true, data });
    } catch (err) {
        console.error('Get Store Builder SEO bootstrap error:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to load Homepage SEO settings' });
    }
};

exports.saveStoreBuilderSeoDraft = async (req, res) => {
    try {
        const data = await saveStoreBuilderSeoDraft({
            shopId: req.tenantId,
            req,
            seo: req.body?.seo,
            searchAliases: req.body?.searchAliases,
            basedOnRevision: req.body?.basedOnRevision
        });
        if (!data) return res.status(404).json({ success: false, error: 'Shop not found' });
        return res.status(200).json({ success: true, message: 'SEO draft saved', data });
    } catch (err) {
        return sendStoreBuilderError(res, err, 'Failed to save Homepage SEO draft');
    }
};

exports.deleteStoreBuilderSeoDraft = async (req, res) => {
    try {
        const data = await deleteStoreBuilderSeoDraft({ shopId: req.tenantId, req });
        if (!data) return res.status(404).json({ success: false, error: 'Shop not found' });
        return res.status(200).json({
            success: true,
            message: data.rebased ? 'SEO draft discarded; other Store Builder draft changes were kept.' : 'SEO draft discarded',
            data
        });
    } catch (err) {
        return sendStoreBuilderError(res, err, 'Failed to discard Homepage SEO draft');
    }
};

exports.publishStoreBuilderSeo = async (req, res) => {
    try {
        const data = await publishStoreBuilderSeo({
            shopId: req.tenantId,
            req,
            seo: req.body?.seo,
            searchAliases: req.body?.searchAliases,
            expectedRevision: req.body?.expectedRevision
        });
        if (!data) return res.status(404).json({ success: false, error: 'Shop not found' });
        const cacheWarning = await safelyInvalidateStoreBuilderSeoCache(req.tenantId, req);
        if (cacheWarning) data.warnings = [...new Set([...(data.warnings || []), cacheWarning])];
        return res.status(200).json({ success: true, message: 'Homepage SEO published', data });
    } catch (err) {
        return sendStoreBuilderError(res, err, 'Failed to publish Homepage SEO');
    }
};

exports.getStoreBuilderReviews = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const rating = Math.min(Math.max(Number(req.query.rating) || 5, 1), 5);
        const search = escapeRegex(String(req.query.search || '').trim().slice(0, 80));
        const selectedIds = String(req.query.ids || '')
            .split(',')
            .map(id => id.trim())
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .slice(0, 50);
        const limit = selectedIds.length > 0
            ? Math.min(Math.max(parseInt(req.query.limit, 10) || selectedIds.length, 1), 50)
            : Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 10);
        const shopObjectId = new mongoose.Types.ObjectId(req.tenantId);
        const match = {
            shop_id: shopObjectId,
            rating
        };
        if (selectedIds.length > 0) {
            match._id = { $in: selectedIds.map(id => new mongoose.Types.ObjectId(id)) };
        }
        const searchMatch = search
            ? {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { comment: { $regex: search, $options: 'i' } },
                    { 'product.title': { $regex: search, $options: 'i' } }
                ]
            }
            : null;

        const [result] = await Review.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'products',
                    localField: 'product_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    $or: [
                        { product: null },
                        { 'product.shop_id': shopObjectId }
                    ]
                }
            },
            ...(searchMatch ? [{ $match: searchMatch }] : []),
            { $sort: { createdAt: -1, _id: -1 } },
            {
                $facet: {
                    data: [
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                rating: 1,
                                comment: 1,
                                createdAt: 1,
                                product_id: 1,
                                product: {
                                    _id: '$product._id',
                                    title: '$product.title'
                                }
                            }
                        }
                    ],
                    total: [{ $count: 'count' }]
                }
            }
        ]);

        const total = result?.total?.[0]?.count || 0;

        res.status(200).json({
            success: true,
            data: result?.data || [],
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit) || 1
            }
        });
    } catch (err) {
        console.error('Get store builder reviews error:', err);
        res.status(500).json({ success: false, error: 'Failed to load reviews' });
    }
};

exports.uploadStoreBuilderLogo = async (req, res) => {
    try {
        if (!req.file?.path) {
            return res.status(400).json({ success: false, error: 'Logo image is required' });
        }

        const target = ['checkout', 'favicon'].includes(req.body?.target) ? req.body.target : 'storefront';
        const asset = await registerTemporaryAsset({ req, file: req.file, target });

        res.status(200).json({
            success: true,
            message: req.body?.target === 'favicon' ? 'Browser icon uploaded' : 'Logo uploaded',
            data: {
                url: req.file.path,
                assetId: asset._id,
                status: asset.status,
                expiresAt: asset.expiresAt,
                width: asset.width || 0,
                height: asset.height || 0,
                mimeType: asset.mimeType || '',
                format: asset.format || ''
            }
        });
    } catch (err) {
        console.error('Upload store builder logo error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to upload logo' });
    }
};

exports.uploadStoreBuilderImage = async (req, res) => {
    try {
        if (!req.file?.path) {
            return res.status(400).json({ success: false, error: 'Image is required' });
        }

        const asset = await registerTemporaryAsset({
            req,
            file: req.file,
            target: req.body?.target || 'theme'
        });

        res.status(200).json({
            success: true,
            message: 'Image uploaded',
            data: {
                url: req.file.path,
                assetId: asset._id,
                status: asset.status,
                expiresAt: asset.expiresAt,
                width: asset.width || 0,
                height: asset.height || 0,
                mimeType: asset.mimeType || '',
                format: asset.format || ''
            }
        });
    } catch (err) {
        console.error('Upload store builder image error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to upload image' });
    }
};

exports.getStoreBuilderDraft = async (req, res) => {
    try {
        const [draft, shop] = await Promise.all([
            StoreBuilderDraft.findOne({ shop_id: req.tenantId }).select('-__v').lean(),
            Shop.findById(req.tenantId).select('themeRevision').lean()
        ]);
        res.status(200).json({
            success: true,
            data: draft ? { ...draft, stale: Number(draft.basedOnRevision || 0) !== Number(shop?.themeRevision || 0) } : null
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load Store Builder draft' });
    }
};

exports.saveStoreBuilderDraft = async (req, res) => {
    try {
        const draft = await saveStoreBuilderDraft({
            shopId: req.tenantId,
            req,
            theme: req.body?.theme || {},
            searchAliases: req.body?.searchAliases,
            customDomain: req.body?.customDomain || {},
            storewideDiscount: req.body?.storewideDiscount,
            basedOnRevision: req.body?.basedOnRevision,
            planAccess: req.planAccess
        });
        if (!draft) return res.status(404).json({ success: false, error: 'Shop not found' });
        res.status(200).json({ success: true, message: 'Draft saved', data: draft });
    } catch (err) {
        const message = err.message || 'Failed to save Store Builder draft';
        res.status(err.statusCode || 400).json({
            success: false,
            code: err.code || 'INVALID_THEME',
            message,
            error: message,
            ...(err.validation && { validation: err.validation })
        });
    }
};

exports.deleteStoreBuilderDraft = async (req, res) => {
    try {
        await StoreBuilderDraft.deleteOne({ shop_id: req.tenantId });
        res.status(200).json({ success: true, message: 'Draft discarded' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to discard Store Builder draft' });
    }
};

exports.getStoreBuilderRevisions = async (req, res) => {
    try {
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 20);
        const [data, total] = await Promise.all([
            StoreBuilderRevision.find({ shop_id: req.tenantId })
                .select('revision publishedByName source changeScope restoredFromRevision changeSummary createdAt')
                .sort({ revision: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            StoreBuilderRevision.countDocuments({ shop_id: req.tenantId })
        ]);
        res.status(200).json({
            success: true,
            data,
            pagination: { page, limit, totalItems: total, totalPages: Math.ceil(total / limit) || 1, hasNextPage: page * limit < total, hasPrevPage: page > 1 }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to load Store Builder revisions' });
    }
};

exports.getStoreBuilderRevision = async (req, res) => {
    try {
        const revision = await StoreBuilderRevision.findOne({ _id: req.params.id, shop_id: req.tenantId }).select('-__v').lean();
        if (!revision) return res.status(404).json({ success: false, error: 'Store Builder revision not found' });
        res.status(200).json({ success: true, data: revision });
    } catch (err) {
        res.status(400).json({ success: false, error: 'Invalid Store Builder revision' });
    }
};

exports.restoreStoreBuilderRevision = async (req, res) => {
    try {
        const restored = await restoreStoreBuilderRevision({
            shopId: req.tenantId,
            revisionId: req.params.id,
            expectedRevision: req.body?.expectedRevision,
            req
        });
        if (!restored) return res.status(404).json({ success: false, error: 'Store Builder revision not found' });
        await Promise.all([
            cache.del(`storefront:settings:${req.tenantId}`),
            cache.delPattern(`storefront:bootstrap:${req.tenantId}:*`)
        ]);
        res.status(200).json({ success: true, message: 'Revision restored as a new published revision', data: restored });
    } catch (err) {
        const message = err.message || 'Failed to restore Store Builder revision';
        res.status(err.statusCode || 400).json({
            success: false,
            code: err.code,
            message,
            error: message,
            ...(err.latestRevision !== undefined && { latestRevision: err.latestRevision }),
            ...(err.lastPublishedAt !== undefined && { lastPublishedAt: err.lastPublishedAt })
        });
    }
};

exports.deleteStoreBuilderAsset = async (req, res) => {
    try {
        await deleteTemporaryAsset({ shopId: req.tenantId, assetId: req.params.id });
        res.status(200).json({ success: true, message: 'Temporary asset deleted' });
    } catch (err) {
        const message = err.message || 'Failed to delete asset';
        res.status(err.statusCode || 400).json({ success: false, code: err.code, message, error: message });
    }
};

exports.getPublicStorefrontSettings = async (req, res) => {
    try {
        const cacheKey = `storefront:settings:${req.tenantId}`;
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);

        const shop = await Shop.findById(req.tenantId)
            .select('shopName subdomain theme storewideDiscount')
            .lean();

        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        await ensureThemeSectionArchitecture(shop);
        const planAccess = await getShopPlanAccess(req.tenantId);
        shop.theme = getPublicThemeForPlan(shop.theme || {}, planAccess);
        const policyDefaults = fillMissingPolicyDefaults(shop.theme?.policies || {}, { storeName: shop.shopName });
        shop.theme = {
            ...(shop.theme || {}),
            policies: policyDefaults.policies
        };

        const response = { success: true, data: shop };
        await cache.set(cacheKey, response, 60);
        res.status(200).json(response);
    } catch (err) {
        console.error('Get public storefront settings error:', err);
        res.status(500).json({ success: false, error: 'Failed to load storefront settings' });
    }
};
