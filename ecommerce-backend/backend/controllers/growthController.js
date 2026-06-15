const mongoose = require('mongoose');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const Product = require('../models/Product');
const Order = require('../models/Order');

const validRanges = new Set(['7', '30', '90']);
const eventTypes = {
    views: 'product_view',
    carts: 'add_to_cart',
    checkouts: 'begin_checkout',
    orders: 'order_placed'
};

const asObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const getRangeStart = (queryRange) => {
    const range = validRanges.has(String(queryRange)) ? Number(queryRange) : 30;
    return {
        range,
        from: new Date(Date.now() - range * 24 * 60 * 60 * 1000)
    };
};

const roundRate = (value) => Math.round((Number(value || 0)) * 100) / 100;
const rate = (part, total) => total > 0 ? roundRate((part / total) * 100) : 0;

const classifyProduct = (metrics) => {
    const addToCartRate = metrics.addToCartRate || 0;
    const conversionRate = metrics.conversionRate || 0;
    const cartToOrderRate = metrics.cartToOrderRate || 0;

    if (metrics.views < 10 && metrics.addToCarts < 3 && metrics.orders < 2) {
        return {
            label: 'not_enough_data',
            message: 'This product needs more traffic before making a decision.',
            suggestedActions: [
                'Share this product with existing customers',
                'Add it to a featured section',
                'Wait for more visits before running ads'
            ]
        };
    }

    if (metrics.views >= 20 && addToCartRate >= 8 && conversionRate >= 2) {
        return {
            label: 'winner',
            message: 'Visitors are engaging with this product and buying it.',
            suggestedActions: [
                'Consider running ads for this product',
                'Keep stock available',
                'Feature it on the homepage'
            ]
        };
    }

    if (metrics.views < 25 && metrics.orders >= 1 && conversionRate >= 4) {
        return {
            label: 'hidden_gem',
            message: 'This product converts well but does not get enough traffic.',
            suggestedActions: [
                'Promote it in banners or featured products',
                'Test a small ad budget',
                'Use it in social posts'
            ]
        };
    }

    if (metrics.views >= 20 && addToCartRate < 3) {
        return {
            label: 'fix_before_ads',
            message: 'Many visitors view this product but do not add it to cart.',
            suggestedActions: [
                'Improve product image',
                'Add a clearer description',
                'Check price and discount',
                'Show delivery and return information clearly'
            ]
        };
    }

    if (addToCartRate >= 8 && cartToOrderRate < 15) {
        return {
            label: 'checkout_problem',
            message: 'Customers add this product to cart but do not complete orders.',
            suggestedActions: [
                'Check delivery charge',
                'Make checkout fields easier',
                'Add trust and return details',
                'Review coupon or stock issues'
            ]
        };
    }

    if (metrics.views < 25 && metrics.addToCarts === 0) {
        return {
            label: 'low_interest',
            message: 'This product is not getting strong interest yet.',
            suggestedActions: [
                'Improve title and thumbnail',
                'Move it lower in ads priority',
                'Test a different offer'
            ]
        };
    }

    return {
        label: 'not_enough_data',
        message: 'Performance is mixed. Keep monitoring this product.',
        suggestedActions: [
            'Improve product content',
            'Watch conversion trends',
            'Compare it with similar products'
        ]
    };
};

const getProductMetrics = async ({ shopId, from, productId = null }) => {
    const shopObjectId = asObjectId(shopId);
    const match = {
        shop_id: shopObjectId,
        createdAt: { $gte: from },
        product_id: { $ne: null },
        eventType: { $in: Object.values(eventTypes) }
    };

    if (productId) match.product_id = asObjectId(productId);

    const [eventMetrics, statusMetrics] = await Promise.all([
        AnalyticsEvent.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$product_id',
                    views: { $sum: { $cond: [{ $eq: ['$eventType', eventTypes.views] }, 1, 0] } },
                    addToCarts: { $sum: { $cond: [{ $eq: ['$eventType', eventTypes.carts] }, 1, 0] } },
                    checkouts: { $sum: { $cond: [{ $eq: ['$eventType', eventTypes.checkouts] }, 1, 0] } },
                    orders: { $sum: { $cond: [{ $eq: ['$eventType', eventTypes.orders] }, 1, 0] } },
                    revenue: { $sum: { $cond: [{ $eq: ['$eventType', eventTypes.orders] }, '$value', 0] } }
                }
            }
        ]),
        Order.aggregate([
            {
                $match: {
                    shop_id: shopObjectId,
                    isDeleted: false,
                    createdAt: { $gte: from },
                    ...(productId ? { 'items.productId': asObjectId(productId) } : {})
                }
            },
            { $unwind: '$items' },
            ...(productId ? [{ $match: { 'items.productId': asObjectId(productId) } }] : []),
            {
                $group: {
                    _id: '$items.productId',
                    confirmedOrders: { $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] } },
                    deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] } },
                    cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
                    returnedOrders: { $sum: { $cond: [{ $eq: ['$status', 'Returned'] }, 1, 0] } },
                    deliveredRevenue: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, '$items.total', 0] } }
                }
            }
        ])
    ]);

    const productIds = [
        ...new Set([
            ...eventMetrics.map(item => String(item._id)),
            ...statusMetrics.map(item => String(item._id))
        ])
    ].filter(Boolean);

    const products = productIds.length
        ? await Product.find({
            _id: { $in: productIds.map(asObjectId) },
            shop_id: shopObjectId,
            isDeleted: false
        }).select('title slug category images pricing averageRating numReviews').lean()
        : [];

    const productMap = new Map(products.map(product => [String(product._id), product]));
    const statusMap = new Map(statusMetrics.map(item => [String(item._id), item]));
    const eventMap = new Map(eventMetrics.map(item => [String(item._id), item]));

    return productIds
        .map(id => {
            const product = productMap.get(id);
            if (!product) return null;

            const event = eventMap.get(id) || {};
            const status = statusMap.get(id) || {};
            const metrics = {
                _id: id,
                product,
                views: event.views || 0,
                addToCarts: event.addToCarts || 0,
                checkouts: event.checkouts || 0,
                orders: event.orders || 0,
                revenue: event.revenue || 0,
                confirmedOrders: status.confirmedOrders || 0,
                deliveredOrders: status.deliveredOrders || 0,
                cancelledOrders: status.cancelledOrders || 0,
                returnedOrders: status.returnedOrders || 0,
                deliveredRevenue: status.deliveredRevenue || 0
            };

            metrics.addToCartRate = rate(metrics.addToCarts, metrics.views);
            metrics.conversionRate = rate(metrics.orders, metrics.views);
            metrics.cartToOrderRate = rate(metrics.orders, metrics.addToCarts);
            metrics.recommendation = classifyProduct(metrics);
            metrics.label = metrics.recommendation.label;

            return metrics;
        })
        .filter(Boolean)
        .sort((a, b) => (b.orders - a.orders) || (b.views - a.views));
};

exports.getGrowthOverview = async (req, res) => {
    try {
        const { range, from } = getRangeStart(req.query.range);
        const shopId = req.tenantId;

        const [summary] = await AnalyticsEvent.aggregate([
            {
                $match: {
                    shop_id: asObjectId(shopId),
                    createdAt: { $gte: from },
                    eventType: { $in: Object.values(eventTypes) }
                }
            },
            {
                $group: {
                    _id: null,
                    views: { $sum: { $cond: [{ $eq: ['$eventType', eventTypes.views] }, 1, 0] } },
                    addToCarts: { $sum: { $cond: [{ $eq: ['$eventType', eventTypes.carts] }, 1, 0] } },
                    checkouts: { $sum: { $cond: [{ $eq: ['$eventType', eventTypes.checkouts] }, 1, 0] } },
                    orders: { $sum: { $cond: [{ $eq: ['$eventType', eventTypes.orders] }, 1, 0] } },
                    revenue: { $sum: { $cond: [{ $eq: ['$eventType', eventTypes.orders] }, '$value', 0] } }
                }
            }
        ]);

        const products = await getProductMetrics({ shopId, from });
        const bestProduct = products[0] || null;
        const needsAttention = products.find(item => ['fix_before_ads', 'checkout_problem'].includes(item.label)) || null;

        const totals = summary || { views: 0, addToCarts: 0, checkouts: 0, orders: 0, revenue: 0 };

        res.status(200).json({
            success: true,
            data: {
                range,
                summary: {
                    ...totals,
                    addToCartRate: rate(totals.addToCarts, totals.views),
                    conversionRate: rate(totals.orders, totals.views),
                    cartToOrderRate: rate(totals.orders, totals.addToCarts)
                },
                bestProduct,
                needsAttention
            }
        });
    } catch (err) {
        console.error('Growth overview error:', err);
        res.status(500).json({ success: false, error: 'Failed to load growth overview' });
    }
};

exports.getGrowthProducts = async (req, res) => {
    try {
        const { range, from } = getRangeStart(req.query.range);
        const products = await getProductMetrics({ shopId: req.tenantId, from });

        res.status(200).json({ success: true, data: { range, products } });
    } catch (err) {
        console.error('Growth products error:', err);
        res.status(500).json({ success: false, error: 'Failed to load product growth analytics' });
    }
};

exports.getGrowthProductDetail = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
            return res.status(400).json({ success: false, error: 'Invalid product ID' });
        }

        const { range, from } = getRangeStart(req.query.range);
        const product = await Product.findOne({
            _id: req.params.productId,
            shop_id: req.tenantId,
            isDeleted: false
        }).select('title slug category images pricing averageRating numReviews').lean();

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        const [metrics] = await getProductMetrics({
            shopId: req.tenantId,
            from,
            productId: req.params.productId
        });

        const daily = await AnalyticsEvent.aggregate([
            {
                $match: {
                    shop_id: asObjectId(req.tenantId),
                    product_id: asObjectId(req.params.productId),
                    createdAt: { $gte: from },
                    eventType: { $in: Object.values(eventTypes) }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' },
                        eventType: '$eventType'
                    },
                    count: { $sum: 1 },
                    revenue: { $sum: { $cond: [{ $eq: ['$eventType', eventTypes.orders] }, '$value', 0] } }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                range,
                product,
                metrics: metrics || {
                    _id: String(product._id),
                    product,
                    views: 0,
                    addToCarts: 0,
                    checkouts: 0,
                    orders: 0,
                    revenue: 0,
                    addToCartRate: 0,
                    conversionRate: 0,
                    cartToOrderRate: 0,
                    recommendation: classifyProduct({ views: 0, addToCarts: 0, orders: 0 })
                },
                daily: daily.map(item => ({
                    date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
                    eventType: item._id.eventType,
                    count: item.count,
                    revenue: item.revenue
                }))
            }
        });
    } catch (err) {
        console.error('Growth product detail error:', err);
        res.status(500).json({ success: false, error: 'Failed to load product insight' });
    }
};

exports.getGrowthSearch = async (req, res) => {
    try {
        const { range, from } = getRangeStart(req.query.range);
        const searchTerms = await AnalyticsEvent.aggregate([
            {
                $match: {
                    shop_id: asObjectId(req.tenantId),
                    eventType: 'search',
                    createdAt: { $gte: from }
                }
            },
            {
                $project: {
                    query: { $toLower: { $ifNull: ['$metadata.query', ''] } },
                    resultCount: { $ifNull: ['$metadata.resultCount', null] },
                    createdAt: 1
                }
            },
            { $match: { query: { $ne: '' } } },
            {
                $group: {
                    _id: '$query',
                    searchCount: { $sum: 1 },
                    lastSearchedAt: { $max: '$createdAt' },
                    zeroResultCount: { $sum: { $cond: [{ $eq: ['$resultCount', 0] }, 1, 0] } },
                    averageResults: { $avg: '$resultCount' }
                }
            },
            { $sort: { searchCount: -1, lastSearchedAt: -1 } },
            { $limit: 25 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                range,
                terms: searchTerms.map(item => ({
                    query: item._id,
                    searchCount: item.searchCount,
                    lastSearchedAt: item.lastSearchedAt,
                    zeroResultCount: item.zeroResultCount,
                    averageResults: Number.isFinite(item.averageResults) ? roundRate(item.averageResults) : null
                }))
            }
        });
    } catch (err) {
        console.error('Growth search error:', err);
        res.status(500).json({ success: false, error: 'Failed to load search analytics' });
    }
};

exports.getGrowthRecommendations = async (req, res) => {
    try {
        const { range, from } = getRangeStart(req.query.range);
        const products = await getProductMetrics({ shopId: req.tenantId, from });
        const recommendations = products
            .filter(item => ['winner', 'hidden_gem', 'fix_before_ads', 'checkout_problem'].includes(item.label))
            .slice(0, 12)
            .map(item => ({
                product: item.product,
                label: item.label,
                reason: item.recommendation.message,
                adRecommendation: ['winner', 'hidden_gem'].includes(item.label)
                    ? 'Recommended for ads'
                    : 'Fix before running ads',
                suggestedAdAngle: item.label === 'hidden_gem'
                    ? 'Show this product to more people because current buyers respond well.'
                    : item.label === 'winner'
                        ? 'Lead with social proof, best-seller angle, and fast delivery.'
                        : 'Improve product page trust, images, price, or checkout before spending on ads.',
                suggestedActions: item.recommendation.suggestedActions
            }));

        res.status(200).json({ success: true, data: { range, recommendations } });
    } catch (err) {
        console.error('Growth recommendations error:', err);
        res.status(500).json({ success: false, error: 'Failed to load recommendations' });
    }
};

exports.generateAdCopy = async (req, res) => {
    try {
        const { productId, language = 'en', campaignType = 'general' } = req.body;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, error: 'Valid productId is required' });
        }

        const product = await Product.findOne({
            _id: productId,
            shop_id: req.tenantId,
            isDeleted: false
        }).select('title category pricing').lean();

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        const price = product.pricing?.sellingPrice;
        const campaignText = String(campaignType || 'general').replace(/_/g, ' ');
        const title = product.title;

        const templates = {
            en: {
                primaryText: `Discover ${title} today. Order with Cash on Delivery across Bangladesh${price ? ` from BDT ${price}` : ''}.`,
                headline: title,
                description: campaignText === 'general' ? 'Limited stock available.' : `Perfect for your ${campaignText} campaign.`,
                callToAction: 'Shop Now'
            },
            bn: {
                primaryText: `${title} ekhoni order korun. Bangladesh jure Cash on Delivery available${price ? `, price BDT ${price}` : ''}.`,
                headline: title,
                description: 'Limited stock available.',
                callToAction: 'Order Now'
            },
            banglish: {
                primaryText: `${title} niye nin ajkei. Cash on Delivery available, stock limited.`,
                headline: `${title} - order now`,
                description: campaignText === 'general' ? 'Fast delivery and easy ordering.' : `${campaignText} er jonno perfect offer.`,
                callToAction: 'Shop Now'
            }
        };

        res.status(200).json({
            success: true,
            data: templates[language] || templates.en
        });
    } catch (err) {
        console.error('Generate ad copy error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate ad copy' });
    }
};
