const Category = require('../models/Category');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { cloudinary } = require('../config/cloudinary');
const cache = require('../services/cacheService');
const {
    cleanCategoryName,
    normalizeCategoryKey,
    mergeCategoryDetails,
    serializeCategoryDetail
} = require('../services/categories/categoryService');
const { normalizeSourceIdentity } = require('../services/products/productMediaService');

const MAX_CATEGORY_PRODUCT_IMAGES = 60;
const escapeRegex = (value = '') => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isSafeRemoteImageUrl = (value = '') => {
    try {
        const url = new URL(String(value || '').trim());
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
};

const getProductImageSources = (product = {}) => {
    const images = [
        ...(Array.isArray(product.images) ? product.images : []),
        ...(Array.isArray(product.variants) ? product.variants.map(variant => variant?.image) : [])
    ].map(value => String(value || '').trim()).filter(isSafeRemoteImageUrl);
    const cover = String(product.coverMediaId || '').trim();
    const ordered = images.includes(cover) ? [cover, ...images] : images;
    const seen = new Set();

    return ordered.filter(value => {
        const identity = normalizeSourceIdentity(value);
        if (!identity || seen.has(identity)) return false;
        seen.add(identity);
        return true;
    });
};

const destroyImage = async (publicId) => {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
        console.warn('Category cover cleanup failed:', { publicId, message: error.message });
    }
};

const invalidateCategoryCaches = async (shopId) => {
    await cache.delPattern(`storefront:bootstrap:${shopId}:*`);
};

const getCategoryCounts = async (shopId) => {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const rows = await Product.aggregate([
        { $match: { shop_id: shopObjectId, isDeleted: false } },
        { $match: { category: { $type: 'string', $ne: '' } } },
        { $group: { _id: { $toLower: { $trim: { input: '$category' } } }, name: { $first: '$category' }, count: { $sum: 1 } } },
        { $sort: { name: 1 } }
    ]);

    return {
        names: rows.map(row => row.name),
        counts: new Map(rows.map(row => [normalizeCategoryKey(row.name), row.count]))
    };
};

exports.getCategories = async (req, res) => {
    try {
        const [{ names, counts }, metadata] = await Promise.all([
            getCategoryCounts(req.tenantId),
            Category.find({ shop_id: req.tenantId }).select('+coverImage.publicId').lean()
        ]);

        res.status(200).json({
            success: true,
            data: mergeCategoryDetails({ names, metadata, counts })
        });
    } catch (error) {
        console.error('Get category metadata error:', error);
        res.status(500).json({ success: false, error: 'Failed to load categories' });
    }
};

exports.getCategoryProductImages = async (req, res) => {
    try {
        const name = cleanCategoryName(req.query?.category);
        if (!name) {
            return res.status(400).json({ success: false, error: 'Select a category first.' });
        }

        const escapedName = escapeRegex(name);
        const products = await Product.find({
            shop_id: req.tenantId,
            isDeleted: false,
            category: { $regex: `^${escapedName}$`, $options: 'i' }
        })
            .select('title category images coverMediaId imageAltText variants.image status updatedAt')
            .sort({ status: -1, updatedAt: -1, _id: 1 })
            .limit(100)
            .lean();

        const seen = new Set();
        const images = [];
        for (const product of products) {
            for (const url of getProductImageSources(product)) {
                const identity = normalizeSourceIdentity(url);
                if (seen.has(identity)) continue;
                seen.add(identity);
                images.push({
                    url,
                    productId: product._id,
                    productTitle: String(product.title || '').trim().slice(0, 160),
                    altText: String(product.imageAltText || product.title || `${name} category`).trim().slice(0, 140)
                });
                if (images.length >= MAX_CATEGORY_PRODUCT_IMAGES) break;
            }
            if (images.length >= MAX_CATEGORY_PRODUCT_IMAGES) break;
        }

        res.status(200).json({ success: true, data: images });
    } catch (error) {
        console.error('Get category product images error:', error);
        res.status(500).json({ success: false, error: 'Failed to load product photos' });
    }
};

exports.saveCategoryCover = async (req, res) => {
    const uploadedPublicId = req.file?.public_id || req.file?.filename || '';
    try {
        const name = cleanCategoryName(req.body?.categoryName);
        if (!name) {
            await destroyImage(uploadedPublicId);
            return res.status(400).json({ success: false, error: 'Select a category first.' });
        }
        const normalizedName = normalizeCategoryKey(name);
        let coverUrl = String(req.file?.path || '').trim();
        let coverPublicId = uploadedPublicId;
        let coverAltText = cleanCategoryName(req.body?.altText || `${name} category`);

        if (!coverUrl) {
            const sourceProductId = String(req.body?.sourceProductId || '').trim();
            const requestedImageUrl = String(req.body?.imageUrl || '').trim();
            if (!mongoose.isValidObjectId(sourceProductId) || !isSafeRemoteImageUrl(requestedImageUrl)) {
                return res.status(400).json({ success: false, error: 'Choose a valid product photo.' });
            }

            const sourceProduct = await Product.findOne({
                _id: sourceProductId,
                shop_id: req.tenantId,
                isDeleted: false
            }).select('title category images coverMediaId imageAltText variants.image').lean();
            if (!sourceProduct || normalizeCategoryKey(sourceProduct.category) !== normalizedName) {
                return res.status(404).json({ success: false, error: 'Product photo not found in this category.' });
            }

            const requestedIdentity = normalizeSourceIdentity(requestedImageUrl);
            coverUrl = getProductImageSources(sourceProduct)
                .find(url => normalizeSourceIdentity(url) === requestedIdentity) || '';
            if (!coverUrl) {
                return res.status(400).json({ success: false, error: 'This photo does not belong to the selected product.' });
            }

            coverPublicId = '';
            coverAltText = cleanCategoryName(req.body?.altText || sourceProduct.imageAltText || `${name} category`);
        }

        const [existing, productExists] = await Promise.all([
            Category.findOne({ shop_id: req.tenantId, normalizedName }).select('+coverImage.publicId'),
            Product.exists({
                shop_id: req.tenantId,
                isDeleted: false,
                category: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
            })
        ]);
        if (!existing && !productExists) {
            await destroyImage(uploadedPublicId);
            return res.status(404).json({ success: false, error: 'Category not found for this shop.' });
        }

        const previousPublicId = existing?.coverImage?.publicId || '';
        const category = await Category.findOneAndUpdate(
            { shop_id: req.tenantId, normalizedName },
            {
                $set: {
                    name,
                    normalizedName,
                    coverImage: {
                        url: coverUrl,
                        publicId: coverPublicId,
                        altText: coverAltText
                    }
                }
            },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        ).select('+coverImage.publicId');

        if (previousPublicId && previousPublicId !== coverPublicId) await destroyImage(previousPublicId);
        await invalidateCategoryCaches(req.tenantId);

        res.status(200).json({ success: true, data: serializeCategoryDetail(category.toObject()) });
    } catch (error) {
        await destroyImage(uploadedPublicId);
        console.error('Save category cover error:', error);
        res.status(400).json({ success: false, error: error.message || 'Failed to save category cover' });
    }
};

exports.removeCategoryCover = async (req, res) => {
    try {
        const category = await Category.findOne({
            _id: req.params.id,
            shop_id: req.tenantId
        }).select('+coverImage.publicId');
        if (!category) return res.status(404).json({ success: false, error: 'Category cover not found.' });

        const publicId = category.coverImage?.publicId || '';
        category.coverImage = { url: '', publicId: '', altText: '' };
        await category.save();
        await destroyImage(publicId);
        await invalidateCategoryCaches(req.tenantId);

        res.status(200).json({ success: true, data: serializeCategoryDetail(category.toObject()) });
    } catch (error) {
        console.error('Remove category cover error:', error);
        res.status(500).json({ success: false, error: 'Failed to remove category cover' });
    }
};
