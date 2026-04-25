const mongoose = require('mongoose');
const InventoryLog = require('../models/InventoryLog');
const Product = require('../models/Product');
const Order = require('../models/Order');

/**
 * 📊 Stock Movement (In vs Out over time)
 * GET /api/admin/inventory/movement
 */
exports.getStockMovement = async (req, res) => {
    try {
        const shopId = new mongoose.Types.ObjectId(req.user.shopId);

        const data = await InventoryLog.aggregate([
            { $match: { shop_id: shopId } },

            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    stockIn: {
                        $sum: {
                            $cond: [{ $gt: ["$change", 0] }, "$change", 0]
                        }
                    },
                    stockOut: {
                        $sum: {
                            $cond: [{ $lt: ["$change", 0] }, "$change", 0]
                        }
                    }
                }
            },

            {
                $project: {
                    _id: 0,
                    date: {
                        $concat: [
                            { $toString: "$_id.year" }, "-",
                            { $toString: "$_id.month" }, "-",
                            { $toString: "$_id.day" }
                        ]
                    },
                    stockIn: 1,
                    stockOut: 1
                }
            },

            { $sort: { date: 1 } }
        ]);

        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stock movement" });
    }
};


/**
 * 🔥 Top Selling Products
 * GET /api/admin/inventory/top-products
 */
exports.getTopProducts = async (req, res) => {
    try {
        const shopId = new mongoose.Types.ObjectId(req.user.shopId);

        const data = await InventoryLog.aggregate([
            {
                $match: {
                    shop_id: shopId,
                    type: 'ORDER'
                }
            },

            {
                $group: {
                    _id: "$productId",
                    totalSold: { $sum: { $abs: "$change" } }
                }
            },

            { $sort: { totalSold: -1 } },
            { $limit: 10 },

            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product"
                }
            },

            { $unwind: "$product" },

            {
                $project: {
                    productId: "$_id",
                    title: "$product.title",
                    totalSold: 1
                }
            }
        ]);

        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch top products" });
    }
};


/**
 * ⚠️ Low Stock Alert
 * GET /api/admin/inventory/low-stock
 */
exports.getLowStock = async (req, res) => {
    try {
        const shopId = req.user.shopId;

        const threshold = Number(req.query.threshold) || 5;

        const products = await Product.find({
            shop_id: shopId,
            isDeleted: false,
            "variants.stock": { $lte: threshold }
        }).select("title variants");

        res.json({ success: true, data: products });

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch low stock" });
    }
};


/**
 * 📉 Manual Adjustments / Loss Tracking
 * GET /api/admin/inventory/adjustments
 */
exports.getStockAdjustments = async (req, res) => {
    try {
        const shopId = new mongoose.Types.ObjectId(req.user.shopId);

        const data = await InventoryLog.aggregate([
            {
                $match: {
                    shop_id: shopId,
                    type: 'MANUAL'
                }
            },

            {
                $group: {
                    _id: "$productId",
                    totalAdjustment: { $sum: "$change" }
                }
            },

            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product"
                }
            },

            { $unwind: "$product" },

            {
                $project: {
                    productId: "$_id",
                    title: "$product.title",
                    totalAdjustment: 1
                }
            }
        ]);

        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch adjustments" });
    }
};


/**
 * 💰 Revenue Overview
 * GET /api/admin/inventory/revenue
 */
exports.getRevenueAnalytics = async (req, res) => {
    try {
        const shopId = new mongoose.Types.ObjectId(req.user.shopId);

        const data = await Order.aggregate([
            {
                $match: {
                    shop_id: shopId,
                    status: { $ne: 'Cancelled' }
                }
            },

            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$pricing.total" },
                    totalOrders: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: data[0] || { totalRevenue: 0, totalOrders: 0 }
        });

    } catch (err) {
        res.status(500).json({ error: "Failed to fetch revenue" });
    }
};