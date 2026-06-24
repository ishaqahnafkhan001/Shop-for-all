const Collection = require('../models/Collection');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const {
    PUBLIC_PRODUCT_CARD_PROJECT,
    sanitizePublicProducts
} = require('../services/publicProductSerializer');
const {
    getProductSort
} = require('../services/products/productQueryService');

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

        res.status(200).json({
            success: true,
            data: {
                collection: sanitizePublicCollection(collection, total),
                products: sanitizePublicProducts(products),
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
