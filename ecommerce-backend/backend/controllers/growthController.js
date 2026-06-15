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
const defaultLocationFocus = ['Dhaka', 'Chattogram', 'Gazipur', 'Narayanganj', 'Sylhet'];

const uniqueList = (items, limit = 8) => [
    ...new Set((items || []).map(item => String(item || '').trim()).filter(Boolean))
].slice(0, limit);

const textIncludes = (text, keywords) => keywords.some(keyword => text.includes(keyword));

const getProductAudienceBase = (product) => {
    const tags = Array.isArray(product.tags) ? product.tags : [];
    const haystack = `${product.title || ''} ${product.category || ''} ${tags.join(' ')} ${product.description || ''}`.toLowerCase();

    if (textIncludes(haystack, ['saree', 'women', 'female', 'beauty', 'cosmetic', 'jewelry', 'makeup'])) {
        return {
            targetedCustomer: 'Women shopping for fashion, beauty, gifts, and occasion-ready products',
            targetedAgeRange: '18-44',
            suggestedInterests: ['Women fashion', 'Online shopping', 'Eid collection', 'Beauty products', 'Lifestyle shopping'],
            adAngle: 'Style, occasion, and confidence-focused offer'
        };
    }

    if (textIncludes(haystack, ['panjabi', 't-shirt', 'men', 'wallet', 'sneaker', 'shoe', 'footwear'])) {
        return {
            targetedCustomer: 'Men and gift buyers looking for practical fashion and daily-use products',
            targetedAgeRange: '18-45',
            suggestedInterests: ['Men fashion', 'Casual wear', 'Online shopping', 'Eid shopping', 'Lifestyle products'],
            adAngle: 'Daily use, comfort, and value-focused offer'
        };
    }

    if (textIncludes(haystack, ['phone', 'mobile', 'electronics', 'gadget', 'laptop', 'charger', 'speaker', 'headphone'])) {
        return {
            targetedCustomer: 'Tech shoppers comparing gadgets, accessories, and useful everyday electronics',
            targetedAgeRange: '18-40',
            suggestedInterests: ['Mobile phones', 'Gadgets', 'Electronics', 'Tech accessories', 'Online deals'],
            adAngle: 'Feature, price, and convenience-focused offer'
        };
    }

    if (textIncludes(haystack, ['home', 'living', 'decor', 'kitchen', 'furniture', 'lamp', 'bottle'])) {
        return {
            targetedCustomer: 'Home and lifestyle shoppers looking for useful, good-looking everyday items',
            targetedAgeRange: '22-50',
            suggestedInterests: ['Home decor', 'Home improvement', 'Lifestyle shopping', 'Kitchen products', 'Online shopping'],
            adAngle: 'Home upgrade and daily convenience-focused offer'
        };
    }

    if (textIncludes(haystack, ['baby', 'kids', 'toy', 'school'])) {
        return {
            targetedCustomer: 'Parents and family shoppers buying safe, useful, and giftable products',
            targetedAgeRange: '24-45',
            suggestedInterests: ['Parenting', 'Kids products', 'Family shopping', 'Baby care', 'Online shopping'],
            adAngle: 'Trust, safety, and family value-focused offer'
        };
    }

    return {
        targetedCustomer: 'Online shoppers in Bangladesh interested in trusted products and Cash on Delivery',
        targetedAgeRange: '18-45',
        suggestedInterests: ['Online shopping', 'Cash on Delivery', 'E-commerce', 'Discount offers', 'New arrivals'],
        adAngle: 'Trust, value, and easy ordering-focused offer'
    };
};

const getMetricStrategy = (label) => {
    const normalizedLabel = label === 'needs_data' ? 'not_enough_data' : label;
    const strategies = {
        winner: {
            adAngle: 'Best-performing product with proven customer interest',
            audienceReason: 'This product already gets engagement and orders, so it is safer to test with a broader buyer audience.',
            improvementSuggestions: [
                'Keep stock ready before increasing ad spend',
                'Use best-seller or popular product wording',
                'Send traffic directly to the product page'
            ]
        },
        hidden_gem: {
            adAngle: 'High-converting product that needs more reach',
            audienceReason: 'Current traffic is limited, but the product shows buying intent when people see it.',
            improvementSuggestions: [
                'Run a small test campaign first',
                'Feature the product on the homepage',
                'Use clear product benefits in the first line'
            ]
        },
        fix_before_ads: {
            adAngle: 'Improve trust and product presentation before scaling ads',
            audienceReason: 'People view this product but do not add it to cart, so creative or product-page clarity may be weak.',
            improvementSuggestions: [
                'Improve the first product image',
                'Make price, delivery, and return details clearer',
                'Add stronger short description and benefit bullets'
            ]
        },
        checkout_problem: {
            adAngle: 'Fix checkout friction before spending more',
            audienceReason: 'Customers add this product to cart but do not finish orders, which points to checkout, delivery, or trust friction.',
            improvementSuggestions: [
                'Review delivery charge and checkout fields',
                'Show COD, return, and support information clearly',
                'Check stock, coupon, and payment issues'
            ]
        },
        low_interest: {
            adAngle: 'Test a sharper offer before running a larger campaign',
            audienceReason: 'The product has not shown enough interest yet, so use a small test and improve the creative first.',
            improvementSuggestions: [
                'Improve title and thumbnail',
                'Test a discount or bundle angle',
                'Compare demand with similar products'
            ]
        },
        not_enough_data: {
            adAngle: 'Collect more traffic before making a strong ad decision',
            audienceReason: 'There is not enough store activity yet to confidently judge this product.',
            improvementSuggestions: [
                'Share organically before paid ads',
                'Add it to featured products',
                'Wait for more views, carts, and orders'
            ]
        }
    };

    return strategies[normalizedLabel] || strategies.not_enough_data;
};

const getTopBuyerLocations = async ({ shopId, productId, from }) => {
    const shopObjectId = asObjectId(shopId);
    const productObjectId = asObjectId(productId);

    const locations = await Order.aggregate([
        {
            $match: {
                shop_id: shopObjectId,
                isDeleted: false,
                createdAt: { $gte: from },
                'items.productId': productObjectId
            }
        },
        { $unwind: '$items' },
        { $match: { 'items.productId': productObjectId } },
        {
            $project: {
                city: { $trim: { input: { $ifNull: ['$shipping.address.city', ''] } } }
            }
        },
        { $match: { city: { $ne: '' } } },
        {
            $group: {
                _id: { $toLower: '$city' },
                city: { $first: '$city' },
                orders: { $sum: 1 }
            }
        },
        { $sort: { orders: -1, city: 1 } },
        { $limit: 5 }
    ]);

    return uniqueList(locations.map(item => item.city), 5);
};

const getProductAudienceSuggestion = ({ product, metrics, campaignType, language, locations }) => {
    const base = getProductAudienceBase(product);
    const strategy = getMetricStrategy(metrics?.label || metrics?.recommendation?.label || 'not_enough_data');
    const price = product.pricing?.sellingPrice;
    const title = product.title;
    const campaignText = String(campaignType || 'general').replace(/_/g, ' ');
    const locationFocus = uniqueList(locations, 5);
    const suggestedLocationFocus = locationFocus.length ? locationFocus : defaultLocationFocus;
    const interests = uniqueList([
        ...(Array.isArray(product.tags) ? product.tags : []),
        product.category,
        ...base.suggestedInterests
    ], 8);

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

    return {
        ...(templates[language] || templates.en),
        targetedCustomer: base.targetedCustomer,
        targetedAgeRange: base.targetedAgeRange,
        suggestedInterests: interests,
        suggestedLocationFocus,
        adAngle: strategy.adAngle || base.adAngle,
        audienceReason: strategy.audienceReason,
        improvementSuggestions: strategy.improvementSuggestions
    };
};

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
        const { from } = getRangeStart(req.body.range);

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, error: 'Valid productId is required' });
        }

        const product = await Product.findOne({
            _id: productId,
            shop_id: req.tenantId,
            isDeleted: false
        }).select('title category tags description pricing').lean();

        if (!product) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }

        const [[metrics], locations] = await Promise.all([
            getProductMetrics({ shopId: req.tenantId, from, productId }),
            getTopBuyerLocations({ shopId: req.tenantId, productId, from })
        ]);

        res.status(200).json({
            success: true,
            data: getProductAudienceSuggestion({
                product,
                metrics: metrics || {
                    label: 'not_enough_data',
                    recommendation: classifyProduct({ views: 0, addToCarts: 0, orders: 0 })
                },
                campaignType,
                language,
                locations
            })
        });
    } catch (err) {
        console.error('Generate ad copy error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate ad copy' });
    }
};
