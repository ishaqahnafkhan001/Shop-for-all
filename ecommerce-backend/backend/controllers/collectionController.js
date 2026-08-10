const Collection = require('../models/Collection');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const mongoose = require('mongoose');
const {
    PUBLIC_PRODUCT_CARD_PROJECT,
    sanitizePublicProducts
} = require('../services/publicProductSerializer');
const {
    getProductSort
} = require('../services/products/productQueryService');
const {
    generateCollectionSuggestion
} = require('../services/collections/collectionAiService');
const {
    applyScheduledSalesToProducts
} = require('../services/sales/scheduledSaleService');
const { buildPagination } = require('../utils/pagination');
const { cloudinary } = require('../config/cloudinary');
const cache = require('../services/cacheService');
const { buildLimitError, getShopPlanAccess } = require('../services/billing/planAccessService');
const { getWeeklyAiUsage } = require('../services/billing/planUsageService');
const {
    beginAiGeneration,
    completeAiGeneration,
    failAiGeneration,
    getReplayResponse
} = require('../services/ai/aiGenerationPolicyService');
const {
    assertHistoricalSlugAvailable,
    recordSlugRedirect,
    resolveSlugRedirect
} = require('../services/seo/slugRedirectService');

const slugify = (value = '') =>
    value
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

const PUBLIC_COLLECTION_FIELDS = '_id title slug description image seo productIds isActive createdAt updatedAt';
const MAX_PUBLIC_COLLECTION_PRODUCTS = 48;

const cleanText = (value = '', max = 300) => String(value || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const parseProductIds = (value = []) => {
    const source = Array.isArray(value)
        ? value
        : String(value || '').split(',');

    return [...new Set(source
        .map(id => String(id || '').trim())
        .filter(id => mongoose.Types.ObjectId.isValid(id)))]
        .slice(0, 500);
};

const parseJsonField = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const parseBoolean = (value, fallback = true) => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true';
};

const normalizeImageUrl = (value = '') => {
    const url = String(value || '').trim().slice(0, 1000);
    return /^https?:\/\//i.test(url) ? url : '';
};

const destroyImage = async (publicId) => {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
        console.warn('Collection cover cleanup failed:', { publicId, message: error.message });
    }
};

const invalidateCollectionCaches = async (shopId) => {
    await cache.delPattern(`storefront:bootstrap:${shopId}:*`);
};

const buildCollectionPayload = (body = {}, { partial = false } = {}) => {
    const payload = {};
    if (!partial || body.title !== undefined) payload.title = cleanText(body.title, 100);
    if (!partial || body.slug !== undefined || body.title !== undefined) {
        payload.slug = slugify(body.slug || body.title);
    }
    if (!partial || body.description !== undefined) payload.description = cleanText(body.description, 1000);
    if (!partial || body.isActive !== undefined) payload.isActive = parseBoolean(body.isActive, true);
    if (body.productIds !== undefined) payload.productIds = parseProductIds(parseJsonField(body.productIds, []));

    if (!partial || body.seo !== undefined || body.seoTitle !== undefined || body.seoDescription !== undefined) {
        const seo = parseJsonField(body.seo, {});
        payload.seo = {
            title: cleanText(seo?.title ?? body.seoTitle, 70),
            description: cleanText(seo?.description ?? body.seoDescription, 170)
        };
    }
    if (body.image !== undefined && typeof body.image === 'string') payload.image = normalizeImageUrl(body.image);
    return payload;
};

const sanitizePublicCollection = (collection = {}, productCount = 0) => ({
    _id: collection._id,
    title: collection.title,
    slug: collection.slug,
    description: collection.description || '',
    image: collection.image || '',
    seo: collection.seo || {},
    productCount,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt
});

const serializeAdminCollection = (collection = {}) => {
    const value = typeof collection.toObject === 'function' ? collection.toObject() : collection;
    return {
        _id: value._id,
        title: value.title,
        slug: value.slug,
        description: value.description || '',
        image: value.image || '',
        productIds: value.productIds || [],
        isActive: value.isActive !== false,
        seo: value.seo || {},
        createdAt: value.createdAt,
        updatedAt: value.updatedAt
    };
};

const getPublicProductMatch = (shopId, extra = {}) => ({
    shop_id: new mongoose.Types.ObjectId(shopId),
    isDeleted: false,
    isActive: true,
    status: 'Published',
    ...extra
});

const getCollectionProductCounts = async ({ shopId, collectionIds }) => {
    if (!collectionIds.length) return new Map();

    const counts = await Product.aggregate([
        {
            $match: getPublicProductMatch(shopId, {
                collections: { $in: collectionIds }
            })
        },
        { $unwind: '$collections' },
        { $match: { collections: { $in: collectionIds } } },
        { $group: { _id: '$collections', count: { $sum: 1 } } }
    ]);

    return new Map(counts.map(item => [String(item._id), item.count]));
};

exports.getCollections = async (req, res) => {
    try {
        const collections = await Collection.find({
            shop_id: req.tenantId
        }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: collections.map(serializeAdminCollection) });
    } catch (err) {
        console.error('Get collections error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch collections' });
    }
};

exports.suggestCollectionAi = async (req, res) => {
    let generationState = null;
    try {
        const productIds = parseProductIds(req.body?.productIds);
        const [shop, products] = await Promise.all([
            Shop.findById(req.tenantId).select('shopName businessType theme.header.storeName theme.seo.siteName').lean(),
            productIds.length
                ? Product.find({
                    _id: { $in: productIds.map(id => new mongoose.Types.ObjectId(id)) },
                    shop_id: req.tenantId,
                    isDeleted: false
                })
                    .select('title category tags seo description')
                    .limit(30)
                    .lean()
                : []
        ]);

        const context = {
            title: cleanText(req.body?.title, 100),
            description: cleanText(req.body?.description, 1000),
            seoTitle: cleanText(req.body?.seo?.title || req.body?.seoTitle, 90),
            seoDescription: cleanText(req.body?.seo?.description || req.body?.seoDescription, 190),
            shopName: cleanText(shop?.theme?.seo?.siteName || shop?.theme?.header?.storeName || shop?.shopName, 100),
            shopType: cleanText(req.body?.shopType || shop?.businessType, 80),
            language: cleanText(req.body?.language || 'auto', 20),
            targetCustomer: cleanText(req.body?.targetCustomer, 120),
            products: products.map(product => ({
                title: cleanText(product.title, 120),
                category: cleanText(product.category, 80),
                tags: Array.isArray(product.tags) ? product.tags.map(tag => cleanText(tag, 40)).filter(Boolean).slice(0, 8) : []
            }))
        };

        generationState = await beginAiGeneration({ req, feature: 'catalog.collection' });
        const suggestion = await generateCollectionSuggestion(context);

        const payload = {
            success: true,
            fallback: Boolean(suggestion.fallback),
            ...(suggestion.errorCode ? { errorCode: suggestion.errorCode } : {}),
            data: suggestion.data,
            meta: suggestion.meta
        };
        const usage = await completeAiGeneration({
            req,
            state: generationState,
            result: payload,
            meta: suggestion.meta
        });
        generationState = null;
        return res.status(200).json({ ...payload, usage });
    } catch (err) {
        const replay = getReplayResponse(err);
        if (replay) return res.status(200).json({ ...replay, replayed: true });
        await failAiGeneration({ req, state: generationState, error: err });
        if (err?.code === 'AI_REQUEST_IN_PROGRESS') {
            return res.status(409).json({ success: false, code: err.code, message: err.message });
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
        if (err?.code === 'AI_NOT_CONFIGURED') {
            return res.status(503).json({
                success: false,
                configured: false,
                message: 'AI collection suggestions are not configured yet. Please add GEMINI_API_KEY on the backend server.'
            });
        }

        if (err?.code === 'AI_PROVIDER_FAILED') {
            console.warn('Collection AI provider failure:', {
                requestId: req.id,
                causeCode: err.causeCode || 'AI_PROVIDER_ERROR'
            });

            return res.status(200).json({
                success: false,
                configured: true,
                message: 'AI collection suggestions could not be generated right now. Please try again later.',
                errorCode: 'AI_PROVIDER_FAILED'
            });
        }

        console.warn('Collection AI suggestion failure:', {
            requestId: req.id,
            message: err.message
        });

        return res.status(200).json({
            success: false,
            configured: true,
            message: 'AI collection suggestions could not be generated right now. Please try again.',
            errorCode: 'AI_RESPONSE_PARSE_FAILED'
        });
    }
};

exports.getPublicCollections = async (req, res) => {
    try {
        const collections = await Collection.find({
            shop_id: req.tenantId,
            isActive: true
        })
            .select(PUBLIC_COLLECTION_FIELDS)
            .sort({ createdAt: -1 })
            .lean();
        const collectionIds = collections.map(collection => collection._id);
        const countMap = await getCollectionProductCounts({ shopId: req.tenantId, collectionIds });

        res.status(200).json({
            success: true,
            data: collections.map(collection => sanitizePublicCollection(
                collection,
                countMap.get(String(collection._id)) || 0
            ))
        });
    } catch (err) {
        console.error('Get public collections error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch collections' });
    }
};

exports.getPublicCollectionBySlug = async (req, res) => {
    try {
        const slug = String(req.params.slug || '').trim().toLowerCase();
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), MAX_PUBLIC_COLLECTION_PRODUCTS);
        const skip = (page - 1) * limit;

        let collection = await Collection.findOne({
            shop_id: req.tenantId,
            slug,
            isActive: true
        })
            .select(PUBLIC_COLLECTION_FIELDS)
            .lean();

        if (!collection) {
            const historical = await resolveSlugRedirect({
                shopId: req.tenantId,
                resourceType: 'collection',
                oldSlug: slug
            });
            if (historical) {
                collection = await Collection.findOne({
                    _id: historical.resourceId,
                    shop_id: req.tenantId,
                    isActive: true
                }).select(PUBLIC_COLLECTION_FIELDS).lean();
            }
        }

        if (!collection) {
            return res.status(404).json({ success: false, error: 'Collection not found' });
        }

        const productMatch = getPublicProductMatch(req.tenantId, {
            collections: collection._id
        });
        const sortQuery = getProductSort(req.query.sort);
        const [products, total] = await Promise.all([
            Product.aggregate([
                { $match: productMatch },
                { $sort: sortQuery },
                { $skip: skip },
                { $limit: limit },
                { $project: PUBLIC_PRODUCT_CARD_PROJECT }
            ]),
            Product.countDocuments(productMatch)
        ]);

        const pricedProducts = await applyScheduledSalesToProducts({
            shopId: req.tenantId,
            products
        });

        res.status(200).json({
            success: true,
            data: {
                collection: sanitizePublicCollection(collection, total),
                products: sanitizePublicProducts(pricedProducts),
                pagination: buildPagination({ total, page, limit })
            }
        });
    } catch (err) {
        console.error('Get public collection error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch collection' });
    }
};

exports.createCollection = async (req, res) => {
    const uploadedPublicId = req.file?.public_id || req.file?.filename || '';
    let collectionCreated = false;
    try {
        const payload = {
            ...buildCollectionPayload(req.body),
            shop_id: req.tenantId
        };
        await assertHistoricalSlugAvailable({
            shopId: req.tenantId,
            resourceType: 'collection',
            slug: payload.slug
        });
        if (!payload.title) {
            await destroyImage(uploadedPublicId);
            return res.status(400).json({ success: false, error: 'Collection title is required' });
        }
        if (req.file?.path) {
            payload.image = req.file.path;
            payload.imagePublicId = uploadedPublicId;
        }

        const collection = await Collection.create(payload);
        collectionCreated = true;

        if (Array.isArray(payload.productIds) && payload.productIds.length > 0) {
            await Product.updateMany(
                { _id: { $in: payload.productIds }, shop_id: req.tenantId },
                { $addToSet: { collections: collection._id } }
            );
        }

        await invalidateCollectionCaches(req.tenantId);

        res.status(201).json({ success: true, data: serializeAdminCollection(collection) });
    } catch (err) {
        if (!collectionCreated) await destroyImage(uploadedPublicId);
        console.error('Create collection error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to create collection' });
    }
};

exports.updateCollection = async (req, res) => {
    const uploadedPublicId = req.file?.public_id || req.file?.filename || '';
    let uploadedImageSaved = false;
    try {
        const collection = await Collection.findOne({
            _id: req.params.id,
            shop_id: req.tenantId
        }).select('+imagePublicId');
        if (!collection) {
            await destroyImage(uploadedPublicId);
            return res.status(404).json({ success: false, error: 'Collection not found' });
        }

        const payload = buildCollectionPayload(req.body, { partial: true });
        const previousSlug = collection.slug;
        if (payload.slug && payload.slug !== previousSlug) {
            await assertHistoricalSlugAvailable({
                shopId: req.tenantId,
                resourceType: 'collection',
                slug: payload.slug,
                resourceId: collection._id
            });
        }
        const previousPublicId = collection.imagePublicId || '';
        const removeImage = parseBoolean(req.body?.removeImage, false);
        Object.assign(collection, payload);
        if (req.file?.path) {
            collection.image = req.file.path;
            collection.imagePublicId = uploadedPublicId;
        } else if (removeImage) {
            collection.image = '';
            collection.imagePublicId = '';
        }
        await collection.save();
        await recordSlugRedirect({
            shopId: req.tenantId,
            resourceType: 'collection',
            resourceId: collection._id,
            oldSlug: previousSlug,
            newSlug: collection.slug
        });
        uploadedImageSaved = Boolean(req.file?.path);

        if (Array.isArray(payload.productIds)) {
            await Product.updateMany(
                { shop_id: req.tenantId, collections: collection._id },
                { $pull: { collections: collection._id } }
            );
            await Product.updateMany(
                { _id: { $in: payload.productIds }, shop_id: req.tenantId },
                { $addToSet: { collections: collection._id } }
            );
        }

        if ((req.file?.path || removeImage) && previousPublicId && previousPublicId !== uploadedPublicId) {
            await destroyImage(previousPublicId);
        }
        await invalidateCollectionCaches(req.tenantId);

        res.status(200).json({ success: true, data: serializeAdminCollection(collection) });
    } catch (err) {
        if (!uploadedImageSaved) await destroyImage(uploadedPublicId);
        console.error('Update collection error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update collection' });
    }
};

exports.deleteCollection = async (req, res) => {
    try {
        const collection = await Collection.findOneAndDelete({
            _id: req.params.id,
            shop_id: req.tenantId
        }).select('+imagePublicId');

        if (!collection) return res.status(404).json({ success: false, error: 'Collection not found' });

        await Product.updateMany(
            { shop_id: req.tenantId, collections: collection._id },
            { $pull: { collections: collection._id } }
        );
        await destroyImage(collection.imagePublicId);
        await invalidateCollectionCaches(req.tenantId);

        res.status(200).json({ success: true, message: 'Collection deleted' });
    } catch (err) {
        console.error('Delete collection error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete collection' });
    }
};
