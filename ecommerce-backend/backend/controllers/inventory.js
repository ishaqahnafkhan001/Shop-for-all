const mongoose = require('mongoose');
const InventoryLog = require('../models/InventoryLog');
const InventoryMutation = require('../models/InventoryMutation');
const Product = require('../models/Product');
const cache = require('../services/cacheService');
const Order = require('../models/Order');
const { enqueueLowStockAlertFromStockChange } = require('../services/inventoryLowStockAlertService');


/**
 * @desc    Manually adjust stock for a variant
 * @route   PATCH /api/admin/inventory/stock
 * @access  Private (Admin)
 */
exports.updateStock = async (req, res) => {
    const { productId, variantId, mode = 'adjust', quantity, expectedCurrentStock, reason = '', note = '', idempotencyKey = '' } = req.body;
    const amount = Number(quantity);
    const isNumericInput = value => typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
    if (!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(variantId) || !isNumericInput(quantity) || !Number.isSafeInteger(amount) || !['adjust', 'set'].includes(mode) || (mode === 'adjust' && amount === 0) || (mode === 'set' && amount < 0)) {
        return res.status(400).json({ success: false, error: 'Choose a valid variant and a whole-number stock quantity.' });
    }
    const key = String(idempotencyKey || '').trim();
    if (key.length > 160) return res.status(400).json({ success: false, error: 'Inventory request key is too long.' });
    const shopId = req.tenantId;
    const fingerprint = require('crypto').createHash('sha256').update(JSON.stringify([String(productId), String(variantId), mode, amount, mode === 'set' ? Number(expectedCurrentStock) : null])).digest('hex');
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            if (key) {
                const previous = await InventoryMutation.findOne({ shop_id: shopId, idempotencyKey: key }).session(session).lean();
                if (previous) {
                    if (previous.requestFingerprint && previous.requestFingerprint !== fingerprint) throw Object.assign(new Error('This inventory request key was used for a different adjustment.'), { statusCode: 409, code: 'IDEMPOTENCY_MISMATCH' });
                    if (previous.status !== 'completed') throw Object.assign(new Error('This inventory request is pending or previously failed. Refresh before retrying.'), { statusCode: 409, code: previous.status === 'processing' ? 'IDEMPOTENCY_IN_PROGRESS' : 'IDEMPOTENCY_FAILED' });
                    result = { beforeStock: previous.beforeStock, afterStock: previous.afterStock, idempotent: true };
                    return;
                }
            }
            const product = await Product.findOne({ _id: productId, shop_id: shopId, isDeleted: false }).select('title variants').session(session);
            const variant = product?.variants.id(variantId);
            if (!variant) throw Object.assign(new Error('Product or variant not found'), { statusCode: 404 });
            const beforeStock = Number(variant.stock || 0);
            if (mode === 'set' && (!isNumericInput(expectedCurrentStock) || !Number.isSafeInteger(Number(expectedCurrentStock)) || Number(expectedCurrentStock) !== beforeStock)) throw Object.assign(new Error('Stock changed. Refresh before setting a new value.'), { statusCode: 409, code: 'STALE_STOCK' });
            const afterStock = mode === 'set' ? amount : beforeStock + amount;
            if (!Number.isSafeInteger(afterStock) || afterStock < Number(variant.inventory?.reservedStock || 0)) throw Object.assign(new Error('Stock cannot become negative or fall below reserved stock.'), { statusCode: 400 });
            await Product.updateOne({ _id: productId, shop_id: shopId, 'variants._id': variantId }, { $set: { 'variants.$.stock': afterStock, 'variants.$.inventory.stock': afterStock } }, { session, runValidators: true });
            const [log] = await InventoryLog.create([{
                shop_id: shopId, productId, variantId, change: afterStock - beforeStock, type: mode === 'adjust' && amount > 0 ? 'RESTOCK' : 'MANUAL',
                beforeStock, afterStock, user: req.user._id, note: String(note || 'Manual stock adjustment').trim().slice(0, 500),
                reason: String(reason || mode).trim().slice(0, 80), ...(key ? { idempotencyKey: key } : {})
            }], { session });
            if (key) await InventoryMutation.create([{ shop_id: shopId, idempotencyKey: key, requestFingerprint: fingerprint, status: 'completed', beforeStock, afterStock, inventoryLogId: log._id }], { session });
            result = { beforeStock, afterStock, mode };
        });
    } catch (error) {
        return res.status(error.statusCode || (error.code === 11000 ? 409 : 500)).json({ success: false, ...(error.statusCode ? { code: error.code } : {}), error: error.statusCode ? error.message : 'Failed to update stock. Retry using the same request.' });
    } finally {
        await session.endSession();
    }
    if (!result.idempotent) await enqueueLowStockAlertFromStockChange({ shopId, productId, variantId, beforeStock: result.beforeStock, afterStock: result.afterStock, source: 'MANUAL', referenceId: key || `${productId}:${variantId}:${result.afterStock}` });
    await Promise.all([cache.delPattern(`admin:dashboard-overview:${shopId}:*`), cache.delPattern(`storefront:*:${shopId}:*`)]);
    return res.status(200).json({ success: true, ...(result.idempotent ? { idempotent: true } : {}), message: `Stock updated. New stock: ${result.afterStock}`, data: result });
};


/**
 * @desc    Get recent inventory logs for a shop
 * @route   GET /api/admin/inventory/logs
 * @access  Private (Admin)
 */
exports.getInventoryLogs = async (req, res) => {
    try {
        const shopId = req.tenantId;
        const limit = Math.min(Number(req.query.limit) || 50, 200); // ✅ Configurable, capped at 200

        const logs = await InventoryLog.find({ shop_id: shopId })
            .populate('productId', 'title')
            .populate('user', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(limit);

        res.status(200).json({ success: true, data: logs });

    } catch (err) {
        console.error("Get inventory logs error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch inventory logs" });
    }
};


/**
 * @desc    Stock movement over time (in vs out per day)
 * @route   GET /api/admin/inventory/movement
 * @access  Private (Admin)
 */
exports.getStockMovement = async (req, res) => {
    try {
        const shopId = new mongoose.Types.ObjectId(req.tenantId);

        const data = await InventoryLog.aggregate([
            { $match: { shop_id: shopId } },
            {
                $group: {
                    _id: {
                        // FIX: $dateToString produces zero-padded "2025-01-05" instead of
                        // $concat/$toString which produced un-padded "2025-1-5", breaking sort
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                    },
                    stockIn: {
                        $sum: { $cond: [{ $gt: ['$change', 0] }, '$change', 0] }
                    },
                    stockOut: {
                        $sum: { $cond: [{ $lt: ['$change', 0] }, '$change', 0] }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: '$_id.date',
                    stockIn: 1,
                    stockOut: 1
                }
            },
            { $sort: { date: 1 } }
        ]);

        res.status(200).json({ success: true, data });

    } catch (err) {
        console.error("Stock movement error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch stock movement" });
    }
};


/**
 * @desc    Top 10 best-selling products by units sold
 * @route   GET /api/admin/inventory/top-products
 * @access  Private (Admin)
 */
exports.getTopProducts = async (req, res) => {
    try {
        const shopId = new mongoose.Types.ObjectId(req.tenantId);

        const topProducts = await InventoryLog.aggregate([
            {
                $match: {
                    shop_id: shopId,
                    type: 'ORDER',
                    change: { $lt: 0 }
                }
            },
            {
                $group: {
                    _id: '$productId',
                    totalSold: {
                        $sum: { $multiply: ['$change', -1] }
                    }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    let: { productId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$productId'] }
                            }
                        },
                        {
                            $project: {
                                title: 1,
                                pricing: 1, // <-- FIX 1: Project the entire pricing object (or 'pricing.sellingPrice': 1)
                                thumbnail: 1,
                                sellingPrice: 1 // Just in case it's saved at the root level instead
                            }
                        }
                    ],
                    as: 'product'
                }
            },
            {
                $unwind: {
                    path: '$product',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    productId: '$_id',
                    title: { $ifNull: ['$product.title', 'Unknown Product'] },
                    // <-- FIX 2: Map to the correct nested field, with fallbacks
                    price: {
                        $ifNull: [
                            '$product.pricing.sellingPrice',
                            { $ifNull: ['$product.sellingPrice', 0] }
                        ]
                    },
                    thumbnail: '$product.thumbnail',
                    totalSold: 1
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            count: topProducts.length,
            data: topProducts
        });

    } catch (error) {
        console.error("getTopProducts error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch top products"
        });
    }
};

/**
 * @desc    Products with stock at or below threshold
 * @route   GET /api/admin/inventory/low-stock?threshold=5
 * @access  Private (Admin)
 */
exports.getLowStock = async (req, res) => {
    try {
        const shopId = req.tenantId;
        // FIX: Math.max(0, ...) prevents a negative threshold from matching all products
        const threshold = Math.max(0, Number(req.query.threshold) || 5);

        const products = await Product.find({
            shop_id: shopId,
            isDeleted: false,
            'variants.stock': { $lte: threshold }
        }).select('title variants');

        res.status(200).json({ success: true, data: products });

    } catch (err) {
        console.error("Low stock error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch low stock products" });
    }
};


/**
 * @desc    Manual stock adjustments grouped by product
 * @route   GET /api/admin/inventory/adjustments
 * @access  Private (Admin)
 */
exports.getStockAdjustments = async (req, res) => {
    try {
        const shopId = new mongoose.Types.ObjectId(req.tenantId);

        const data = await InventoryLog.aggregate([
            { $match: { shop_id: shopId, type: 'MANUAL' } },
            {
                $group: {
                    _id: '$productId',
                    totalAdjustment: { $sum: '$change' }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $project: {
                    _id: 0,
                    productId: '$_id',
                    title: '$product.title',
                    totalAdjustment: 1
                }
            }
        ]);

        res.status(200).json({ success: true, data });

    } catch (err) {
        console.error("Stock adjustments error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch stock adjustments" });
    }
};


/**
 * @desc    Simple revenue overview (total revenue + order count)
 * @route   GET /api/admin/inventory/revenue
 * @access  Private (Admin)
 */
exports.getRevenueOverview = async (req, res) => {
    try {
        const shopId = new mongoose.Types.ObjectId(req.tenantId);

        const data = await Order.aggregate([
            { $match: { shop_id: shopId, status: { $ne: 'Cancelled' } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$pricing.total' },
                    totalOrders: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: data[0] || { totalRevenue: 0, totalOrders: 0 }
        });

    } catch (err) {
        console.error("Revenue overview error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch revenue overview" });
    }
};
