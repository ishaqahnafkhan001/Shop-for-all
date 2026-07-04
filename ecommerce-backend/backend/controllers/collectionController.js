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
        .slice(0, 30);
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

        res.status(200).json({ success: true, data: collections });
    } catch (err) {
        console.error('Get collections error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch collections' });
    }
};

exports.suggestCollectionAi = async (req, res) => {
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

        const suggestion = await generateCollectionSuggestion(context);

        return res.status(200).json({
            success: true,
            fallback: Boolean(suggestion.fallback),
            ...(suggestion.errorCode ? { errorCode: suggestion.errorCode } : {}),
            data: suggestion.data
        });
    } catch (err) {
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

        const collection = await Collection.findOne({
            shop_id: req.tenantId,
            slug,
            isActive: true
        })
            .select(PUBLIC_COLLECTION_FIELDS)
            .lean();

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
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit) || 1
                }
            }
        });
    } catch (err) {
        console.error('Get public collection error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch collection' });
    }
};

exports.createCollection = async (req, res) => {
    try {
        const payload = {
            ...req.body,
            slug: req.body.slug || slugify(req.body.title),
            shop_id: req.tenantId
        };

        const collection = await Collection.create(payload);

        if (Array.isArray(payload.productIds) && payload.productIds.length > 0) {
            await Product.updateMany(
                { _id: { $in: payload.productIds }, shop_id: req.tenantId },
                { $addToSet: { collections: collection._id } }
            );
        }

        res.status(201).json({ success: true, data: collection });
    } catch (err) {
        console.error('Create collection error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to create collection' });
    }
};

exports.updateCollection = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.title && !payload.slug) payload.slug = slugify(payload.title);

        const collection = await Collection.findOneAndUpdate(
            { _id: req.params.id, shop_id: req.tenantId },
            payload,
            { new: true, runValidators: true }
        );

        if (!collection) return res.status(404).json({ success: false, error: 'Collection not found' });

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

        res.status(200).json({ success: true, data: collection });
    } catch (err) {
        console.error('Update collection error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update collection' });
    }
};

exports.deleteCollection = async (req, res) => {
    try {
        const collection = await Collection.findOneAndDelete({
            _id: req.params.id,
            shop_id: req.tenantId
        });

        if (!collection) return res.status(404).json({ success: false, error: 'Collection not found' });

        await Product.updateMany(
            { shop_id: req.tenantId, collections: collection._id },
            { $pull: { collections: collection._id } }
        );

        res.status(200).json({ success: true, message: 'Collection deleted' });
    } catch (err) {
        console.error('Delete collection error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete collection' });
    }
};
