const mongoose = require('mongoose');
const Product = require('../../models/Product');
const { PUBLIC_PRODUCT_CARD_PROJECT } = require('../publicProductSerializer');

const slugify = (value = '') =>
    value
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

const getUniqueSlug = async ({ shopId, requestedSlug, title, session }) => {
    const baseSlug = (slugify(requestedSlug || title) || `product-${Date.now()}`).slice(0, 80);
    let candidate = baseSlug;
    let suffix = 2;

    while (await Product.findOne({
        shop_id: shopId,
        slug: candidate,
        isDeleted: false
    }).select('_id').session(session || null)) {
        const suffixText = `-${suffix}`;
        candidate = `${baseSlug.slice(0, 80 - suffixText.length)}${suffixText}`;
        suffix += 1;
    }

    return candidate;
};

const productCategoryCache = new Map();
const CATEGORY_CACHE_TTL = 5 * 60 * 1000;

const getCachedCategories = async (shopId, categoryQuery) => {
    const key = `${shopId}:${JSON.stringify(categoryQuery)}`;
    const cached = productCategoryCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    const value = await Product.distinct('category', categoryQuery);
    productCategoryCache.set(key, {
        value,
        expiresAt: Date.now() + CATEGORY_CACHE_TTL
    });

    return value;
};

const addComputedProductFields = (product) => {
    if (product.finalPrice !== undefined || product.salePrice !== undefined || product.pricing?.salePrice !== undefined) {
        return {
            ...product,
            finalPrice: Number(product.finalPrice ?? product.salePrice ?? product.pricing?.salePrice)
        };
    }

    const sellingPrice = Number(product.pricing?.sellingPrice) || 0;
    const discount = Number(product.pricing?.discount) || 0;

    return {
        ...product,
        finalPrice: discount > 0
            ? Math.round(sellingPrice - ((sellingPrice * discount) / 100))
            : sellingPrice
    };
};

const buildProductListQuery = ({ shopId, filters, isStorefrontRequest }) => {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const query = {
        shop_id: shopObjectId,
        isDeleted: false
    };

    if (isStorefrontRequest) {
        query.isActive = true;
        query.status = 'Published';
    } else if (filters.status && filters.status !== 'All') {
        query.status = filters.status;
    }

    if (filters.category && filters.category !== 'All') query.category = filters.category;
    if (filters.collection) query.collections = filters.collection;
    if (filters.tag) query.tags = filters.tag.toLowerCase();
    if (filters.search) query.$text = { $search: filters.search };
    const needsEffectivePriceFiltering = isStorefrontRequest && (
        filters.sale === 'true' ||
        filters.sale === true ||
        filters.effectivePrice === 'true' ||
        Boolean(filters.minPrice || filters.maxPrice)
    );
    if ((filters.minPrice || filters.maxPrice) && !needsEffectivePriceFiltering) {
        query['pricing.sellingPrice'] = {};
        if (filters.minPrice) query['pricing.sellingPrice'].$gte = Number(filters.minPrice);
        if (filters.maxPrice) query['pricing.sellingPrice'].$lte = Number(filters.maxPrice);
    }
    if (filters.minRating) query.averageRating = { $gte: Math.min(Math.max(Number(filters.minRating) || 0, 0), 5) };
    if (filters.rating) query.averageRating = { $gte: Math.min(Math.max(Number(filters.rating) || 0, 0), 5) };
    if (isStorefrontRequest && filters.stock === 'in') {
        query.$expr = { $gt: [{ $sum: '$variants.stock' }, 0] };
    }
    if (isStorefrontRequest && filters.stock === 'out') {
        query.$expr = { $lte: [{ $sum: '$variants.stock' }, 0] };
    }
    if (filters.lowStock === 'true') {
        query.$expr = {
            $lt: [
                { $sum: '$variants.stock' },
                '$lowStockThreshold'
            ]
        };
    }

    return query;
};

const getProductSort = (sort) => {
    if (sort === 'priceAsc' || sort === 'price_asc') return { 'pricing.sellingPrice': 1, _id: 1 };
    if (sort === 'priceDesc' || sort === 'price_desc') return { 'pricing.sellingPrice': -1, _id: 1 };
    if (sort === 'nameAsc') return { title: 1, _id: 1 };
    if (sort === 'nameDesc') return { title: -1, _id: 1 };
    if (sort === 'ratingDesc' || sort === 'rating_desc') return { averageRating: -1, numReviews: -1, _id: 1 };
    if (sort === 'ratingAsc' || sort === 'rating_asc') return { averageRating: 1, numReviews: 1, _id: 1 };
    if (sort === 'oldest') return { createdAt: 1, _id: 1 };
    return { createdAt: -1, _id: 1 };
};

const getSummaryProjection = (isStorefrontRequest) => {
    const adminSummaryProjection = {
        title: 1,
        slug: 1,
        category: 1,
        tags: 1,
        collections: 1,
        imageAltText: 1,
        coverMediaId: 1,
        images: { $slice: ['$images', 1] },
        status: 1,
        publicationStatus: 1,
        publishAt: 1,
        isActive: 1,
        pricing: 1,
        averageRating: 1,
        numReviews: 1,
        lowStockThreshold: 1,
        createdAt: 1,
        totalStock: { $sum: '$variants.stock' },
        variantCount: { $size: { $ifNull: ['$variants', []] } }
    };

    return isStorefrontRequest ? PUBLIC_PRODUCT_CARD_PROJECT : adminSummaryProjection;
};

module.exports = {
    slugify,
    getUniqueSlug,
    getCachedCategories,
    addComputedProductFields,
    buildProductListQuery,
    getProductSort,
    getSummaryProjection
};
