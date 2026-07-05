const mongoose = require('mongoose');
const InventoryLog = require('../models/InventoryLog');
const InventoryMutation = require('../models/InventoryMutation');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { enqueueLowStockAlertFromStockChange } = require('../services/inventoryLowStockAlertService');


/**
 * @desc    Manually adjust stock for a variant
 * @route   PATCH /api/admin/inventory/stock
 * @access  Private (Admin)
 */
exports.updateStock = async (req, res) => {
    let mutationReservation = null;
    try {
        const {
            productId,
            variantId,
            mode = 'adjust',
            quantity,
            expectedCurrentStock,
            reason = '',
            note = '',
            idempotencyKey = ''
        } = req.body;
        const normalizedMode = ['adjust', 'set'].includes(String(mode)) ? String(mode) : 'adjust';
        const numericQuantity = Number(quantity);
        const cleanReason = String(reason || '').trim().slice(0, 80);
        const cleanNote = String(note || '').trim().slice(0, 500);
        const cleanIdempotencyKey = String(idempotencyKey || '').trim().slice(0, 160);

        // ✅ Basic input validation
        if (!productId || !variantId || quantity === undefined) {
            return res.status(400).json({ success: false, error: "productId, variantId, and quantity are required" });
        }
        if (!Number.isFinite(numericQuantity)) {
            return res.status(400).json({ success: false, error: "quantity must be a valid number" });
        }
        if (normalizedMode === 'adjust' && numericQuantity === 0) {
            return res.status(400).json({ success: false, error: "quantity must be a non-zero adjustment" });
        }
        if (normalizedMode === 'set' && numericQuantity < 0) {
            return res.status(400).json({ success: false, error: "stock cannot be set below 0" });
        }

        const shopId = req.tenantId;

        if (cleanIdempotencyKey) {
            const existingMutation = await InventoryMutation.findOne({
                shop_id: shopId,
                idempotencyKey: cleanIdempotencyKey
            }).lean();
            if (existingMutation?.status === 'completed') {
                return res.status(200).json({
                    success: true,
                    idempotent: true,
                    message: `Stock update already applied. Current stock: ${existingMutation.afterStock}`,
                    data: {
                        beforeStock: existingMutation.beforeStock,
                        afterStock: existingMutation.afterStock
                    }
                });
            }
            if (existingMutation?.status === 'processing') {
                return res.status(409).json({
                    success: false,
                    code: 'IDEMPOTENCY_IN_PROGRESS',
                    error: 'This stock update is already being processed.'
                });
            }
            if (existingMutation?.status === 'failed') {
                return res.status(409).json({
                    success: false,
                    code: 'IDEMPOTENCY_FAILED',
                    error: 'This stock update previously failed. Refresh and submit a new adjustment.'
                });
            }

            try {
                mutationReservation = await InventoryMutation.create({
                    shop_id: shopId,
                    idempotencyKey: cleanIdempotencyKey,
                    status: 'processing'
                });
            } catch (reservationError) {
                if (reservationError?.code === 11000) {
                    return res.status(409).json({
                        success: false,
                        code: 'IDEMPOTENCY_IN_PROGRESS',
                        error: 'This stock update is already being processed.'
                    });
                }
                throw reservationError;
            }
        }

        const product = await Product.findOne({
            _id: productId,
            shop_id: shopId,
            isDeleted: false
        }).select('title variants');

        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }

        const variant = product.variants.id(variantId);
        if (!variant) {
            return res.status(404).json({ success: false, error: "Variant not found" });
        }

        const beforeStock = Number(variant.stock || 0);
        const afterStock = normalizedMode === 'set'
            ? numericQuantity
            : beforeStock + numericQuantity;

        // ✅ Prevent stock going negative on manual adjustment
        if (afterStock < 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot reduce stock below 0. Current stock: ${beforeStock}`
            });
        }

        if (normalizedMode === 'set') {
            const expected = Number(expectedCurrentStock);
            if (!Number.isFinite(expected)) {
                return res.status(400).json({
                    success: false,
                    error: "expectedCurrentStock is required when setting stock"
                });
            }
            if (expected !== beforeStock) {
                return res.status(409).json({
                    success: false,
                    code: 'STALE_STOCK',
                    error: `Stock changed from ${expected} to ${beforeStock}. Refresh before setting a new value.`,
                    data: { currentStock: beforeStock }
                });
            }
        }

        const updateQuery = {
            _id: productId,
            shop_id: shopId,
            isDeleted: false
        };
        if (normalizedMode === 'adjust' && numericQuantity < 0) {
            updateQuery.variants = {
                $elemMatch: {
                    _id: variantId,
                    stock: { $gte: Math.abs(numericQuantity) }
                }
            };
        } else if (normalizedMode === 'set') {
            updateQuery.variants = {
                $elemMatch: {
                    _id: variantId,
                    stock: beforeStock
                }
            };
        } else {
            updateQuery['variants._id'] = variantId;
        }

        const update = normalizedMode === 'set'
            ? {
                $set: {
                    'variants.$.stock': afterStock,
                    'variants.$.inventory.stock': afterStock
                }
            }
            : {
                $inc: {
                    'variants.$.stock': numericQuantity,
                    'variants.$.inventory.stock': numericQuantity
                }
            };

        const updatedProduct = await Product.findOneAndUpdate(
            updateQuery,
            update,
            { new: true, runValidators: true }
        ).select('variants');

        if (!updatedProduct) {
            return res.status(409).json({
                success: false,
                code: 'STOCK_UPDATE_CONFLICT',
                error: 'Stock changed before this update could be applied. Refresh and try again.'
            });
        }

        const logPayload = {
            shop_id: shopId,
            productId,
            variantId,
            change: afterStock - beforeStock,
            type: normalizedMode === 'adjust' && numericQuantity > 0 ? 'RESTOCK' : 'MANUAL',
            beforeStock,
            afterStock,
            user: req.user._id,
            note: cleanNote || (afterStock - beforeStock > 0 ? 'Manual stock addition' : 'Manual stock reduction'),
            reason: cleanReason || normalizedMode
        };
        if (cleanIdempotencyKey) {
            logPayload.idempotencyKey = cleanIdempotencyKey;
        }

        const inventoryLog = await InventoryLog.create(logPayload);

        if (mutationReservation?._id) {
            await InventoryMutation.updateOne(
                { _id: mutationReservation._id },
                {
                    $set: {
                        status: 'completed',
                        beforeStock,
                        afterStock,
                        inventoryLogId: inventoryLog._id,
                        lastError: ''
                    }
                }
            );
        }

        await enqueueLowStockAlertFromStockChange({
            shopId,
            productId,
            variantId,
            beforeStock,
            afterStock,
            source: 'MANUAL',
            referenceId: cleanIdempotencyKey || `${productId}:${variantId}:${beforeStock}:${afterStock}`
        });

        res.status(200).json({
            success: true,
            message: `Stock updated. New stock: ${afterStock}`,
            data: { beforeStock, afterStock, mode: normalizedMode }
        });

    } catch (err) {
        console.error("Update stock error:", err);
        if (mutationReservation?._id) {
            await InventoryMutation.updateOne(
                { _id: mutationReservation._id, status: 'processing' },
                {
                    $set: {
                        status: 'failed',
                        lastError: String(err?.message || err || 'Failed to update stock').slice(0, 500)
                    }
                }
            ).catch(() => null);
        }
        res.status(500).json({ success: false, error: "Failed to update stock" });
    }
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
