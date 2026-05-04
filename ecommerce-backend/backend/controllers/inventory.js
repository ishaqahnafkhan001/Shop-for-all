const mongoose = require('mongoose');
const InventoryLog = require('../models/InventoryLog');
const Product = require('../models/Product');
const Order = require('../models/Order');


/**
 * @desc    Manually adjust stock for a variant
 * @route   PATCH /api/admin/inventory/stock
 * @access  Private (Admin)
 */
exports.updateStock = async (req, res) => {
    try {
        const { productId, variantId, quantity } = req.body;

        // ✅ Basic input validation
        if (!productId || !variantId || quantity === undefined) {
            return res.status(400).json({ success: false, error: "productId, variantId, and quantity are required" });
        }
        if (typeof quantity !== 'number' || quantity === 0) {
            return res.status(400).json({ success: false, error: "quantity must be a non-zero number" });
        }

        const shopId = req.tenantId;

        const product = await Product.findOne({
            _id: productId,
            shop_id: shopId,
            isDeleted: false
        });

        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }

        const variant = product.variants.id(variantId);
        if (!variant) {
            return res.status(404).json({ success: false, error: "Variant not found" });
        }

        // ✅ Prevent stock going negative on manual adjustment
        if (variant.stock + quantity < 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot reduce stock below 0. Current stock: ${variant.stock}`
            });
        }

        const beforeStock = variant.stock;
        variant.stock += quantity;
        await product.save();

        await InventoryLog.create({
            shop_id: shopId,
            productId,
            variantId,
            change: quantity,
            type: 'MANUAL',
            beforeStock,
            afterStock: variant.stock,
            user: req.user._id,
            note: quantity > 0 ? 'Manual stock addition' : 'Manual stock reduction'
        });

        res.status(200).json({
            success: true,
            message: `Stock updated. New stock: ${variant.stock}`,
            data: { beforeStock, afterStock: variant.stock }
        });

    } catch (err) {
        console.error("Update stock error:", err);
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
        // FIX: Use req.tenantId (set by auth middleware) instead of req.user?.shopId
        // to be consistent with every other function in this file and avoid a 400
        // on requests where shopId is only on the token via tenantId, not re-exposed on req.user
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
                                price: 1,
                                thumbnail: 1
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
                    price: '$product.price',
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