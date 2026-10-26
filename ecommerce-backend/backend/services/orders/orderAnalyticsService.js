const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const InventoryLog = require('../../models/InventoryLog');
const cache = require('../cacheService');
const { getSalesReport, getComparedSalesReport } = require('./salesReportService');
const { ACTIVE_ORDER_STATUSES, reportInterval } = require('./reportingMetrics');

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
    const [report, activeOrders, totalProducts, totalCustomers] = await Promise.all([
        getSalesReport({ tenantId }),
        Order.countDocuments({ shop_id: tenantId, isDeleted: false, status: { $in: ACTIVE_ORDER_STATUSES } }),
        Product.countDocuments({ shop_id: tenantId, isDeleted: false }),
        User.countDocuments({ shop_id: tenantId, role: 'Customer' })
    ]);
    return { totalRevenue: report.summary.revenue, totalItemsSold: report.summary.units,
        netProfit: report.summary.profit, activeOrders, totalProducts, totalCustomers };
};

const getLowStockRows = async tenantId => {
    const products = await Product.aggregate([
        { $match: { shop_id: new mongoose.Types.ObjectId(String(tenantId)), isDeleted: false } },
        { $unwind: '$variants' },
        { $match: { 'variants.isActive': { $ne: false }, 'variants.status': { $ne: 'archived' } } },
        { $set: { threshold: { $ifNull: ['$variants.inventory.lowStockThreshold', { $ifNull: ['$lowStockThreshold', 5] }] } } },
        { $match: { $expr: { $lte: ['$variants.stock', '$threshold'] } } },
        { $sort: { 'variants.stock': 1, _id: 1, 'variants._id': 1 } },
        { $limit: 15 },
        { $project: { title: 1, lowStockThreshold: 1, variants: ['$variants'] } }
    ]);
    return buildLowStockRows(products);
};

const getDashboardOverviewResponse = async (
    tenantId,
    capabilities = {
        topProducts: true,
        lowStockAlerts: true,
        revenueTrends: true,
        customerMetrics: true
    },
    query = {}
) => {
    const shopId = new mongoose.Types.ObjectId(tenantId);
    const interval = reportInterval(query);
    const topProductsEnabled = capabilities.topProducts !== false;
    const lowStockEnabled = capabilities.lowStockAlerts !== false;
    const revenueTrendsEnabled = capabilities.revenueTrends !== false;
    const customerMetricsEnabled = capabilities.customerMetrics !== false;
    const cacheKey = `admin:dashboard-overview:${shopId}:${interval.from.toISOString()}:${query.to || 'current'}:v2:top-${Number(topProductsEnabled)}:stock-${Number(lowStockEnabled)}:trends-${Number(revenueTrendsEnabled)}:customers-${Number(customerMetricsEnabled)}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const report = await getComparedSalesReport({ tenantId, ...interval });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orderMatch = { shop_id: shopId, isDeleted: false };

    const [
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
        Order.countDocuments({
            ...orderMatch,
            status: { $in: ACTIVE_ORDER_STATUSES }
        }),
        Product.countDocuments({ shop_id: shopId, isDeleted: false }),
        customerMetricsEnabled
            ? User.countDocuments({ shop_id: shopId, role: 'Customer' })
            : Promise.resolve(0),
        Promise.resolve(revenueTrendsEnabled ? report.salesByMonth.slice(-12) : []),
        InventoryLog.aggregate([
            { $match: { shop_id: shopId, createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Dhaka' } } },
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
        Promise.resolve(topProductsEnabled ? [...report.products].sort((a, b) => b.quantity - a.quantity).slice(0, 10).map(row => ({
            productId: row._id, title: row.title, totalSold: row.quantity, revenue: row.revenue,
            price: row.quantity ? (row.gross - row.discount) / row.quantity : 0
        })) : []),
        lowStockEnabled ? getLowStockRows(shopId) : Promise.resolve([])
    ]);

    const stats = {
        totalRevenue: report.summary.revenue,
        totalItemsSold: report.summary.units,
        completedOrders: report.summary.orders,
        netProfit: report.summary.profit,
        activeOrders,
        totalProducts,
        totalCustomers
    };
    const response = {
        success: true,
        data: {
            capabilities: {
                topProducts: topProductsEnabled,
                lowStockAlerts: lowStockEnabled,
                revenueTrends: revenueTrendsEnabled,
                customerMetrics: customerMetricsEnabled,
                recentActivity: true
            },
            stats,
            revenue: {
                overview: stats,
                monthlyData: revenueAnalytics
            },
            movement,
            recentMovements: buildRecentMovementRows(recentMovementLogs),
            adjustments,
            topProducts,
            lowStock: lowStockProducts,
            comparison: report.comparison,
            meta: report.meta
        }
    };

    await cache.set(cacheKey, response, 30);
    return response;
};

const getRevenueAnalyticsData = async ({ tenantId, month, year }) => {
    const interval = month && year ? reportInterval({
        from: `${year}-${String(month).padStart(2, '0')}-01`,
        to: new Date(Date.UTC(Number(year), Number(month), 1) - 6 * 3600000).toISOString()
    }) : {};
    const report = await getSalesReport({ tenantId, ...interval });
    return { overview: { totalRevenue: report.summary.revenue, totalCost: report.summary.cost,
        totalItemsSold: report.summary.units, netProfit: report.summary.profit }, monthlyData: report.salesByMonth, meta: report.meta };
};

module.exports = {
    getLowStockRows,
    getDashboardStatsData,
    getDashboardOverviewResponse,
    getRevenueAnalyticsData
};
