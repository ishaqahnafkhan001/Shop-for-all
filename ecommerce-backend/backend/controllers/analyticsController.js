const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const AbandonedCart = require('../models/AbandonedCart');

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

exports.getAdvancedAnalytics = async (req, res) => {
    try {
        const shopId = req.tenantId;
        const now = new Date();
        const from = req.query.from ? new Date(req.query.from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const to = req.query.to ? new Date(req.query.to) : now;

        const deliveredMatch = {
            shop_id: shopId,
            isDeleted: false,
            status: 'Delivered'
        };
        const deliveredAnalyticsPrefix = [
            { $match: deliveredMatch },
            {
                $addFields: {
                    analyticsDate: { $ifNull: ['$shipping.deliveredAt', '$updatedAt'] }
                }
            },
            {
                $match: {
                    analyticsDate: { $gte: startOfDay(from), $lte: to }
                }
            }
        ];

        const [
            salesByDay,
            salesByMonth,
            bestSellingProducts,
            trafficSource,
            orderSummary,
            returningCustomers,
            abandonedCarts,
            lowStockProducts,
            totalCustomers
        ] = await Promise.all([
            Order.aggregate([
                ...deliveredAnalyticsPrefix,
                {
                    $group: {
                        _id: {
                            year: { $year: '$analyticsDate' },
                            month: { $month: '$analyticsDate' },
                            day: { $dayOfMonth: '$analyticsDate' }
                        },
                        orders: { $sum: 1 },
                        revenue: { $sum: '$pricing.total' },
                        profit: {
                            $sum: {
                                $subtract: [
                                    '$pricing.total',
                                    {
                                        $sum: {
                                            $map: {
                                                input: '$items',
                                                as: 'item',
                                                in: { $multiply: ['$$item.buyingPrice', '$$item.quantity'] }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]),
            Order.aggregate([
                ...deliveredAnalyticsPrefix,
                {
                    $group: {
                        _id: {
                            year: { $year: '$analyticsDate' },
                            month: { $month: '$analyticsDate' }
                        },
                        orders: { $sum: 1 },
                        revenue: { $sum: '$pricing.total' }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            Order.aggregate([
                ...deliveredAnalyticsPrefix,
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.productId',
                        title: { $first: '$items.title' },
                        quantity: { $sum: '$items.quantity' },
                        revenue: { $sum: '$items.total' }
                    }
                },
                { $sort: { quantity: -1 } },
                { $limit: 10 }
            ]),
            Order.aggregate([
                ...deliveredAnalyticsPrefix,
                {
                    $group: {
                        _id: '$source',
                        orders: { $sum: 1 },
                        revenue: { $sum: '$pricing.total' }
                    }
                },
                { $sort: { orders: -1 } }
            ]),
            Order.aggregate([
                ...deliveredAnalyticsPrefix,
                {
                    $group: {
                        _id: null,
                        orders: { $sum: 1 },
                        revenue: { $sum: '$pricing.total' },
                        discount: { $sum: '$pricing.discount' },
                        averageOrderValue: { $avg: '$pricing.total' },
                        profit: {
                            $sum: {
                                $subtract: [
                                    '$pricing.total',
                                    {
                                        $sum: {
                                            $map: {
                                                input: '$items',
                                                as: 'item',
                                                in: { $multiply: ['$$item.buyingPrice', '$$item.quantity'] }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            ]),
            Order.aggregate([
                ...deliveredAnalyticsPrefix,
                { $group: { _id: '$customer', orders: { $sum: 1 } } },
                { $match: { orders: { $gt: 1 } } },
                { $count: 'count' }
            ]),
            AbandonedCart.countDocuments({
                shop_id: shopId,
                status: 'Open',
                updatedAt: { $gte: startOfDay(from), $lte: to }
            }),
            Product.find({
                shop_id: shopId,
                isDeleted: false,
                $expr: {
                    $lt: [
                        { $sum: '$variants.stock' },
                        '$lowStockThreshold'
                    ]
                }
            }).select('title slug category variants lowStockThreshold').limit(15).lean(),
            User.countDocuments({ shop_id: shopId, role: 'Customer' })
        ]);

        const summary = orderSummary[0] || {
            orders: 0,
            revenue: 0,
            discount: 0,
            averageOrderValue: 0,
            profit: 0
        };
        const returningCustomerCount = returningCustomers[0]?.count || 0;

        const calculatedConversionRate = totalCustomers > 0
            ? ((summary.orders / totalCustomers) * 100).toFixed(2)
            : 0;

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    ...summary,
                    returningCustomers: returningCustomerCount,
                    totalCustomers,
                    abandonedCarts,
                    conversionRate: calculatedConversionRate
                },
                salesByDay: salesByDay.map(item => ({
                    date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
                    orders: item.orders,
                    revenue: item.revenue,
                    profit: item.profit
                })),
                salesByMonth: salesByMonth.map(item => ({
                    year: item._id.year,
                    month: item._id.month,
                    orders: item.orders,
                    revenue: item.revenue
                })),
                bestSellingProducts,
                trafficSource,
                lowStockProducts
            }
        });
    } catch (err) {
        console.error('Advanced analytics error:', err);
        res.status(500).json({ success: false, error: 'Failed to load analytics' });
    }
};
