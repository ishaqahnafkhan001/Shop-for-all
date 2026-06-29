const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const InventoryLog = require('../../models/InventoryLog');
const cache = require('../cacheService');

const DEFAULT_LOW_STOCK_LIMIT = 5;

const formatVariantLabel = (variant = {}) => {
    const attributes = Array.isArray(variant.attributes) ? variant.attributes : [];
    const label = attributes
        .map(attribute => `${attribute.name}: ${attribute.value}`)
        .filter(Boolean)
        .join(', ');

    return label || variant.sku || 'Default variant';
};

const getVariantThreshold = (product, variant = {}) => {
    const variantThreshold = variant.inventory?.lowStockThreshold;
    if (variantThreshold !== undefined && variantThreshold !== null) return Number(variantThreshold);
    if (product.lowStockThreshold !== undefined && product.lowStockThreshold !== null) return Number(product.lowStockThreshold);
    return DEFAULT_LOW_STOCK_LIMIT;
};

const buildLowStockRows = (products = []) => {
    const rows = [];

    for (const product of products) {
        for (const variant of product.variants || []) {
            const stock = Number(variant.stock || 0);
            const threshold = getVariantThreshold(product, variant);
            if (stock <= threshold) {
                rows.push({
                    productId: product._id,
                    variantId: variant._id,
                    title: product.title,
                    productTitle: product.title,
                    variantLabel: formatVariantLabel(variant),
                    sku: variant.sku || '',
                    stock,
                    threshold,
                    currentStock: stock,
                    isOutOfStock: stock <= 0
                });
            }
        }
    }

    return rows
        .sort((a, b) => (a.stock - b.stock) || (b.threshold - a.threshold))
        .slice(0, 15);
};

const buildRecentMovementRows = (logs = []) => logs.map((log) => {
    const product = log.productId || {};
    const variant = (product.variants || []).find(item => String(item._id) === String(log.variantId)) || {};
    const productTitle = product.title || 'Unknown product';
    const variantLabel = formatVariantLabel(variant);
    const orderShortId = log.referenceId ? `#${String(log.referenceId).slice(-6).toUpperCase()}` : '';
    const stockDirection = Number(log.change || 0) > 0 ? 'increased' : 'decreased';
    const absChange = Math.abs(Number(log.change || 0));

    const typeLabels = {
        ORDER: 'Order stock movement',
        CANCEL: 'Order cancellation stock restore',
        RETURN: 'Return stock restore',
        RESTOCK: 'Product stock added',
        MANUAL: 'Product stock updated'
    };

    return {
        type: log.type,
        title: typeLabels[log.type] || 'Inventory movement',
        message: `${productTitle} — ${variantLabel} ${stockDirection} by ${absChange}.`,
        productId: product._id || log.productId,
        productTitle,
        variantId: log.variantId,
        variantLabel,
        orderShortId,
        change: log.change,
        beforeStock: log.beforeStock,
        afterStock: log.afterStock,
        timestamp: log.createdAt,
        severity: Number(log.afterStock || 0) <= getVariantThreshold(product, variant) ? 'warning' : 'info'
    };
});

const getDashboardStatsData = async (tenantId) => {
    const shopId = new mongoose.Types.ObjectId(tenantId);

    const [result] = await Order.aggregate([
        {
            $match: {
                shop_id: shopId,
                isDeleted: false
            }
        },
        {
            $facet: {
                revenue: [
                    { $match: { status: 'Delivered' } },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$pricing.total' }
                        }
                    }
                ],
                profitAndItems: [
                    { $match: { status: 'Delivered' } },
                    { $unwind: '$items' },
                    {
                        $group: {
                            _id: null,
                            totalCost: {
                                $sum: { $multiply: ['$items.buyingPrice', '$items.quantity'] }
                            },
                            itemsRevenue: {
                                $sum: { $multiply: ['$items.price', '$items.quantity'] }
                            },
                            totalItemsSold: { $sum: '$items.quantity' }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            totalItemsSold: 1,
                            netProfit: { $subtract: ['$itemsRevenue', '$totalCost'] }
                        }
                    }
                ],
                activeOrders: [
                    {
                        $match: {
                            status: { $in: ['Pending', 'Processing', 'Shipped'] }
                        }
                    },
                    { $count: 'count' }
                ],
                products: [
                    {
                        $lookup: {
                            from: 'products',
                            let: { shopId: '$shop_id' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ['$shop_id', '$$shopId'] },
                                                { $eq: ['$isDeleted', false] }
                                            ]
                                        }
                                    }
                                },
                                { $count: 'count' }
                            ],
                            as: 'products'
                        }
                    },
                    { $unwind: '$products' },
                    { $replaceRoot: { newRoot: '$products' } }
                ],
                customers: [
                    {
                        $lookup: {
                            from: 'users',
                            let: { shopId: '$shop_id' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ['$shop_id', '$$shopId'] },
                                                { $eq: ['$role', 'Customer'] }
                                            ]
                                        }
                                    }
                                },
                                { $count: 'count' }
                            ],
                            as: 'customers'
                        }
                    },
                    { $unwind: '$customers' },
                    { $replaceRoot: { newRoot: '$customers' } }
                ]
            }
        },
        {
            $project: {
                totalRevenue: {
                    $ifNull: [{ $arrayElemAt: ['$revenue.total', 0] }, 0]
                },
                activeOrders: {
                    $ifNull: [{ $arrayElemAt: ['$activeOrders.count', 0] }, 0]
                },
                totalProducts: {
                    $ifNull: [{ $arrayElemAt: ['$products.count', 0] }, 0]
                },
                totalCustomers: {
                    $ifNull: [{ $arrayElemAt: ['$customers.count', 0] }, 0]
                },
                totalItemsSold: {
                    $ifNull: [{ $arrayElemAt: ['$profitAndItems.totalItemsSold', 0] }, 0]
                },
                netProfit: {
                    $ifNull: [{ $arrayElemAt: ['$profitAndItems.netProfit', 0] }, 0]
                }
            }
        }
    ]);

    return result || {
        totalRevenue: 0,
        activeOrders: 0,
        totalProducts: 0,
        totalCustomers: 0,
        totalItemsSold: 0,
        netProfit: 0
    };
};

const getDashboardOverviewResponse = async (tenantId) => {
    const shopId = new mongoose.Types.ObjectId(tenantId);
    const cacheKey = `admin:dashboard-overview:${shopId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orderMatch = { shop_id: shopId, isDeleted: false };
    const deliveredMatch = { ...orderMatch, status: 'Delivered' };

    const [
        deliveredSummary,
        activeOrders,
        totalProducts,
        totalCustomers,
        revenueAnalytics,
        movement,
        recentMovementLogs,
        adjustments,
        topProducts,
        lowStockProducts
    ] = await Promise.all([
        Order.aggregate([
            { $match: deliveredMatch },
            { $unwind: '$items' },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$pricing.total' },
                    totalItemsSold: { $sum: '$items.quantity' },
                    totalCost: { $sum: { $multiply: ['$items.buyingPrice', '$items.quantity'] } },
                    itemsRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalRevenue: 1,
                    totalItemsSold: 1,
                    netProfit: { $subtract: ['$itemsRevenue', '$totalCost'] }
                }
            }
        ]),
        Order.countDocuments({
            ...orderMatch,
            status: { $in: ['Pending', 'Processing', 'Shipped'] }
        }),
        Product.countDocuments({ shop_id: shopId, isDeleted: false }),
        User.countDocuments({ shop_id: shopId, role: 'Customer' }),
        Order.aggregate([
            { $match: deliveredMatch },
            { $unwind: '$items' },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    revenue: { $sum: '$pricing.total' },
                    totalCost: { $sum: { $multiply: ['$items.buyingPrice', '$items.quantity'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    revenue: 1,
                    profit: { $subtract: ['$revenue', '$totalCost'] }
                }
            },
            { $sort: { year: 1, month: 1 } },
            { $limit: 12 }
        ]),
        InventoryLog.aggregate([
            { $match: { shop_id: shopId, createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
                    stockIn: { $sum: { $cond: [{ $gt: ['$change', 0] }, '$change', 0] } },
                    stockOut: { $sum: { $cond: [{ $lt: ['$change', 0] }, '$change', 0] } }
                }
            },
            { $project: { _id: 0, date: '$_id.date', stockIn: 1, stockOut: 1 } },
            { $sort: { date: 1 } }
        ]),
        InventoryLog.find({ shop_id: shopId, createdAt: { $gte: thirtyDaysAgo } })
            .populate('productId', 'title variants lowStockThreshold')
            .sort({ createdAt: -1 })
            .limit(12)
            .lean(),
        InventoryLog.aggregate([
            { $match: { shop_id: shopId, type: 'MANUAL', createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: '$productId', totalAdjustment: { $sum: '$change' } } },
            { $sort: { totalAdjustment: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            { $project: { _id: 0, productId: '$_id', title: '$product.title', totalAdjustment: 1 } }
        ]),
        InventoryLog.aggregate([
            { $match: { shop_id: shopId, type: 'ORDER', change: { $lt: 0 }, createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: '$productId', totalSold: { $sum: { $multiply: ['$change', -1] } } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    productId: '$_id',
                    title: { $ifNull: ['$product.title', 'Unknown Product'] },
                    price: { $ifNull: ['$product.pricing.sellingPrice', 0] },
                    thumbnail: '$product.thumbnail',
                    totalSold: 1
                }
            }
        ]),
        Product.find({
            shop_id: shopId,
            isDeleted: false
        }).select('title variants lowStockThreshold').limit(500).lean()
    ]);

    const stats = {
        totalRevenue: deliveredSummary[0]?.totalRevenue || 0,
        totalItemsSold: deliveredSummary[0]?.totalItemsSold || 0,
        netProfit: deliveredSummary[0]?.netProfit || 0,
        activeOrders,
        totalProducts,
        totalCustomers
    };
    const response = {
        success: true,
        data: {
            stats,
            revenue: {
                overview: stats,
                monthlyData: revenueAnalytics
            },
            movement,
            recentMovements: buildRecentMovementRows(recentMovementLogs),
            adjustments,
            topProducts,
            lowStock: buildLowStockRows(lowStockProducts)
        }
    };

    await cache.set(cacheKey, response, 30);
    return response;
};

const getRevenueAnalyticsData = async ({ tenantId, month, year }) => {
    const shopId = new mongoose.Types.ObjectId(tenantId);
    const matchQuery = {
        shop_id: shopId,
        status: { $in: ['Delivered'] },
        isDeleted: false
    };

    if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);
        matchQuery.createdAt = { $gte: startDate, $lt: endDate };
    }

    const analytics = await Order.aggregate([
        { $match: matchQuery },
        { $unwind: '$items' },
        {
            $facet: {
                overview: [
                    {
                        $group: {
                            _id: null,
                            totalRevenue: {
                                $sum: {
                                    $add: [
                                        { $multiply: ['$items.price', '$items.quantity'] },
                                        '$pricing.shipping'
                                    ]
                                }
                            },
                            totalCost: {
                                $sum: { $multiply: ['$items.buyingPrice', '$items.quantity'] }
                            },
                            totalItemsSold: { $sum: '$items.quantity' }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            totalRevenue: 1,
                            totalCost: 1,
                            totalItemsSold: 1,
                            netProfit: { $subtract: ['$totalRevenue', '$totalCost'] }
                        }
                    }
                ],
                monthlyData: [
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' }
                            },
                            revenue: {
                                $sum: { $multiply: ['$items.price', '$items.quantity'] }
                            },
                            cost: {
                                $sum: { $multiply: ['$items.buyingPrice', '$items.quantity'] }
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            year: '$_id.year',
                            month: '$_id.month',
                            revenue: 1,
                            cost: 1,
                            profit: { $subtract: ['$revenue', '$cost'] }
                        }
                    },
                    { $sort: { year: 1, month: 1 } }
                ]
            }
        }
    ]);

    return {
        overview: analytics[0]?.overview[0] || {
            totalRevenue: 0,
            totalCost: 0,
            netProfit: 0,
            totalItemsSold: 0
        },
        monthlyData: analytics[0]?.monthlyData || []
    };
};

module.exports = {
    getDashboardStatsData,
    getDashboardOverviewResponse,
    getRevenueAnalyticsData
};
