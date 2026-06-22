require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const Order = require('../models/Order');
const ProductDailyMetric = require('../models/ProductDailyMetric');
const ShopDailyMetric = require('../models/ShopDailyMetric');
const logger = require('../services/logger');

const startOfDay = (date) => {
    const value = new Date(date);
    value.setUTCHours(0, 0, 0, 0);
    return value;
};

const addDays = (date, days) => new Date(date.getTime() + (days * 24 * 60 * 60 * 1000));

const getRollupDate = () => {
    if (process.env.ROLLUP_DATE) return startOfDay(new Date(process.env.ROLLUP_DATE));
    return startOfDay(addDays(new Date(), -1));
};

const safeRate = (part, total) => (total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0);

const aggregateEvents = async (start, end) => AnalyticsEvent.aggregate([
    {
        $match: {
            createdAt: { $gte: start, $lt: end }
        }
    },
    {
        $group: {
            _id: {
                shop_id: '$shop_id',
                product_id: '$product_id'
            },
            views: { $sum: { $cond: [{ $eq: ['$eventType', 'product_view'] }, 1, 0] } },
            addToCarts: { $sum: { $cond: [{ $eq: ['$eventType', 'add_to_cart'] }, 1, 0] } },
            checkouts: { $sum: { $cond: [{ $eq: ['$eventType', 'begin_checkout'] }, 1, 0] } },
            orderEvents: { $sum: { $cond: [{ $eq: ['$eventType', 'order_placed'] }, 1, 0] } }
        }
    }
]);

const aggregateOrders = async (start, end) => Order.aggregate([
    {
        $match: {
            createdAt: { $gte: start, $lt: end },
            isDeleted: false
        }
    },
    { $unwind: '$items' },
    {
        $group: {
            _id: {
                shop_id: '$shop_id',
                product_id: '$items.productId'
            },
            orders: { $sum: 1 },
            deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, 1, 0] } },
            revenue: { $sum: '$items.total' },
            deliveredRevenue: { $sum: { $cond: [{ $eq: ['$status', 'Delivered'] }, '$items.total', 0] } }
        }
    }
]);

const keyFor = ({ shop_id, product_id }) => `${shop_id || 'shop'}:${product_id || 'none'}`;

const rollupDay = async (date = getRollupDate()) => {
    const start = startOfDay(date);
    const end = addDays(start, 1);
    const rolledUpAt = new Date();
    const [events, orders] = await Promise.all([
        aggregateEvents(start, end),
        aggregateOrders(start, end)
    ]);

    const productMetrics = new Map();
    const shopMetrics = new Map();

    const ensureProduct = (shop_id, product_id) => {
        const key = keyFor({ shop_id, product_id });
        if (!productMetrics.has(key)) {
            productMetrics.set(key, {
                shop_id,
                product_id,
                date: start,
                views: 0,
                addToCarts: 0,
                checkouts: 0,
                orders: 0,
                deliveredOrders: 0,
                revenue: 0,
                deliveredRevenue: 0,
                rolledUpAt
            });
        }
        return productMetrics.get(key);
    };

    const ensureShop = (shop_id) => {
        const key = String(shop_id);
        if (!shopMetrics.has(key)) {
            shopMetrics.set(key, {
                shop_id,
                date: start,
                views: 0,
                addToCarts: 0,
                checkouts: 0,
                orders: 0,
                deliveredOrders: 0,
                revenue: 0,
                deliveredRevenue: 0,
                rolledUpAt
            });
        }
        return shopMetrics.get(key);
    };

    for (const row of events) {
        const shop_id = row._id.shop_id;
        const product_id = row._id.product_id;
        const shop = ensureShop(shop_id);
        shop.views += row.views || 0;
        shop.addToCarts += row.addToCarts || 0;
        shop.checkouts += row.checkouts || 0;

        if (product_id) {
            const product = ensureProduct(shop_id, product_id);
            product.views += row.views || 0;
            product.addToCarts += row.addToCarts || 0;
            product.checkouts += row.checkouts || 0;
        }
    }

    for (const row of orders) {
        const shop_id = row._id.shop_id;
        const product_id = row._id.product_id;
        const shop = ensureShop(shop_id);
        shop.orders += row.orders || 0;
        shop.deliveredOrders += row.deliveredOrders || 0;
        shop.revenue += row.revenue || 0;
        shop.deliveredRevenue += row.deliveredRevenue || 0;

        if (product_id) {
            const product = ensureProduct(shop_id, product_id);
            product.orders += row.orders || 0;
            product.deliveredOrders += row.deliveredOrders || 0;
            product.revenue += row.revenue || 0;
            product.deliveredRevenue += row.deliveredRevenue || 0;
        }
    }

    for (const metric of productMetrics.values()) {
        metric.conversionRate = safeRate(metric.orders, metric.views);
        metric.checkoutRate = safeRate(metric.checkouts, metric.views);
        await ProductDailyMetric.updateOne(
            { shop_id: metric.shop_id, product_id: metric.product_id, date: start },
            { $set: metric },
            { upsert: true }
        );
    }

    for (const metric of shopMetrics.values()) {
        metric.conversionRate = safeRate(metric.orders, metric.views);
        metric.checkoutRate = safeRate(metric.checkouts, metric.views);
        await ShopDailyMetric.updateOne(
            { shop_id: metric.shop_id, date: start },
            { $set: metric },
            { upsert: true }
        );
    }

    return {
        date: start.toISOString().slice(0, 10),
        productMetrics: productMetrics.size,
        shopMetrics: shopMetrics.size
    };
};

if (require.main === module) {
    connectDB()
        .then(() => rollupDay())
        .then((result) => {
            logger.info('analytics_rollup_completed', result);
            return mongoose.disconnect();
        })
        .then(() => process.exit(0))
        .catch(async (error) => {
            logger.error('analytics_rollup_failed', { error });
            await mongoose.disconnect().catch(() => {});
            process.exit(1);
        });
}

module.exports = { rollupDay };
