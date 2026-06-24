const Shop = require('../models/Shop');
const Review = require('../models/Review');
const mongoose = require('mongoose');
const cache = require('../services/cacheService');
const { ensureThemeSectionArchitecture, normalizeDynamicSections } = require('../services/themeSectionService');

const allowedThemeKeys = [
    'version',
    'logoUrl',
    'faviconUrl',
    'fontFamily',
    'productGridStyle',
    'colors',
    'header',
    'typography',
    'hero',
    'layout',
    'productCard',
    'checkoutBranding',
    'mobile',
    'paymentSettings',
    'seo',
    'homepageSections',
    'allProducts',
    'migrations',
    'navigation',
    'footer',
    'policies'
];

const URL_FIELD_PATTERN = /(url|href|link|image|images|logo|favicon)$/i;
const UNSAFE_URL_PATTERN = /^(javascript|data|vbscript):/i;

const cleanTextValue = (value = '') => String(value)
    .replace(/\0/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .trim();

const sanitizeUrlValue = (value = '') => {
    const raw = cleanTextValue(value).slice(0, 1000);
    if (!raw) return '';

    const compact = raw.replace(/[\u0000-\u001F\u007F\s]+/g, '');
    if (UNSAFE_URL_PATTERN.test(compact)) return '#';
    if (raw.startsWith('#')) return raw;
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(raw)) return raw;
    if (/^tel:\+?[0-9().\-\s]{4,30}$/i.test(raw)) return raw;

    return '#';
};

const sanitizeGoogleSiteVerification = (value = '') => {
    const raw = cleanTextValue(value).slice(0, 500);
    if (!raw) return '';

    const contentMatch = raw.match(/content\s*=\s*["']([^"']+)["']/i);
    const content = contentMatch ? contentMatch[1] : raw;

    return String(content)
        .replace(/[<>"'`]/g, '')
        .replace(/\s+/g, '')
        .slice(0, 200);
};

const sanitizeThemeValue = (value, key = '') => {
    if (Array.isArray(value)) {
        return value.map(item => sanitizeThemeValue(item, key));
    }

    if (value && typeof value === 'object') {
        return Object.entries(value).reduce((acc, [childKey, childValue]) => {
            acc[childKey] = sanitizeThemeValue(childValue, childKey);
            return acc;
        }, {});
    }

    if (typeof value !== 'string') return value;

    return URL_FIELD_PATTERN.test(key)
        ? sanitizeUrlValue(value)
        : cleanTextValue(value);
};

const sanitizeThemePayload = (theme = {}) => {
    const cleanTheme = sanitizeThemeValue(theme);
    if (cleanTheme?.seo && typeof cleanTheme.seo === 'object') {
        cleanTheme.seo.googleSiteVerification = sanitizeGoogleSiteVerification(cleanTheme.seo.googleSiteVerification);
    }
    return cleanTheme;
};

const pickThemePayload = (payload = {}) => {
    return allowedThemeKeys.reduce((acc, key) => {
        if (payload[key] !== undefined) acc[key] = payload[key];
        return acc;
    }, {});
};

exports.getStoreBuilderSettings = async (req, res) => {
    try {
        const shop = await Shop.findById(req.tenantId)
            .select('shopName subdomain theme customDomain plan featureFlags storewideDiscount')
            .lean();

        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        await ensureThemeSectionArchitecture(shop);

        res.status(200).json({ success: true, data: shop });
    } catch (err) {
        console.error('Get store builder settings error:', err);
        res.status(500).json({ success: false, error: 'Failed to load store builder settings' });
    }
};

exports.updateStoreBuilderSettings = async (req, res) => {
    try {
        const { theme = {}, customDomain, storewideDiscount } = req.body;
        const update = {};
        const cleanTheme = sanitizeThemePayload(pickThemePayload(theme));
        if (cleanTheme.homepageSections !== undefined) {
            cleanTheme.homepageSections = normalizeDynamicSections(cleanTheme.homepageSections);
        }

        for (const [key, value] of Object.entries(cleanTheme)) {
            update[`theme.${key}`] = value;
        }

        if (customDomain !== undefined) {
            update['customDomain.domain'] = customDomain.domain || '';
            update['customDomain.status'] = customDomain.domain ? 'PendingVerification' : 'NotConfigured';
            update['customDomain.lastCheckedAt'] = new Date();
        }

        if (storewideDiscount !== undefined) {
            update.storewideDiscount = Math.max(0, Math.min(100, Number(storewideDiscount) || 0));
        }

        const shop = await Shop.findByIdAndUpdate(
            req.tenantId,
            { $set: update },
            { new: true, runValidators: true }
        ).select('shopName subdomain theme customDomain plan featureFlags storewideDiscount');

        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        await ensureThemeSectionArchitecture(shop);

        await Promise.all([
            cache.del(`storefront:settings:${req.tenantId}`),
            cache.delPattern(`storefront:bootstrap:${req.tenantId}:*`)
        ]);

        res.status(200).json({
            success: true,
            message: 'Store settings updated',
            data: shop
        });
    } catch (err) {
        console.error('Update store builder settings error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update store builder settings' });
    }
};

exports.getStoreBuilderReviews = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const rating = Math.min(Math.max(Number(req.query.rating) || 5, 1), 5);
        const search = String(req.query.search || '').trim();
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

        const target = req.body?.target === 'checkout' ? 'theme.checkoutBranding.logoUrl' : 'theme.logoUrl';
        const shop = await Shop.findByIdAndUpdate(
            req.tenantId,
            { $set: { [target]: req.file.path } },
            { new: true, runValidators: true }
        ).select('shopName subdomain theme customDomain plan featureFlags storewideDiscount');

        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        await Promise.all([
            cache.del(`storefront:settings:${req.tenantId}`),
            cache.delPattern(`storefront:bootstrap:${req.tenantId}:*`)
        ]);

        res.status(200).json({
            success: true,
            message: 'Logo uploaded',
            data: {
                url: req.file.path,
                shop
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

        res.status(200).json({
            success: true,
            message: 'Image uploaded',
            data: {
                url: req.file.path
            }
        });
    } catch (err) {
        console.error('Upload store builder image error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to upload image' });
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

        const response = { success: true, data: shop };
        await cache.set(cacheKey, response, 60);
        res.status(200).json(response);
    } catch (err) {
        console.error('Get public storefront settings error:', err);
        res.status(500).json({ success: false, error: 'Failed to load storefront settings' });
    }
};
