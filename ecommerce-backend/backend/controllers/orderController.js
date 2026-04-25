const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const mongoose = require('mongoose');
const { createOrderSchema,updateOrderStatusSchema } = require('../validations/orderValidation');
const InventoryLog = require('../models/InventoryLog');



/**
 * @desc    Create a new order (Storefront)
 * @route   POST /api/orders
 */

exports.createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { items, shipping, payment } = req.body;
        const shopId = req.tenantId;

        // 🔐 1. Security check
        const customer = await User.findById(req.user.id).select('status').session(session);

        if (!customer) {
            throw new Error("Customer not found");
        }

        if (customer.status === 'Suspended') {
            return res.status(403).json({
                error: "Account suspended"
            });
        }

        let subtotal = 0;
        const orderItems = [];

        // 🔁 2. Process each item safely
        for (const item of items) {

            const product = await Product.findOne({
                _id: item.productId,
                shop_id: shopId,
                isDeleted: false
            }).session(session);

            if (!product) {
                throw new Error("Product not found");
            }

            const variant = product.variants.id(item.variantId);

            if (!variant) {
                throw new Error("Variant not found");
            }

            // 🔐 Stock check
            if (variant.stock < item.quantity) {
                throw new Error(`Out of stock for ${product.title}`);
            }

            const beforeStock = variant.stock;

            // 🔻 Reduce stock
            variant.stock -= item.quantity;

            await product.save({ session });

            const afterStock = variant.stock;

            // 💰 Pricing
            const price = product.finalPrice;
            const total = price * item.quantity;

            subtotal += total;

            // 📦 Order snapshot
            orderItems.push({
                productId: product._id,
                variantId: variant._id,
                title: product.title,
                sku: variant.sku,
                attributes: variant.attributes,
                quantity: item.quantity,
                price,
                buyingPrice: product.pricing.buyingPrice,
                total
            });

            // 🧾 🔥 INVENTORY LOG (ORDER)
            await InventoryLog.create([{
                shop_id: shopId,
                productId: product._id,
                variantId: variant._id,

                change: -item.quantity,
                type: 'ORDER',
                referenceId: null, // will update after order created

                beforeStock,
                afterStock,

                user: req.user._id,
                note: 'Order placed'
            }], { session });
        }
        // 🚚 Shipping
        const shippingCost =
            shipping.zone === "Inside Dhaka" ? 80 : 130;

        const totalAmount = subtotal + shippingCost;

        // 🧾 Create Order
        const order = await Order.create([{
            shop_id: shopId,
            customer: req.user.id,
            items: orderItems,

            pricing: {
                subtotal,
                shipping: shippingCost,
                total: totalAmount
            },

            payment: {
                method: payment.method,
                status: "Pending"
            },

            shipping: {
                zone: shipping.zone,
                cost: shippingCost,
                address: shipping.address
            },

            status: "Pending"
        }], { session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            order: order[0]
        });

    } catch (err) {
        await session.abortTransaction();

        res.status(400).json({
            error: err.message
        });

    } finally {
        session.endSession();
    }
};

/**
 * @desc    Get all orders for the logged-in vendor's shop
 * @route   GET /api/admin/orders
 */

exports.cancelOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const orderId = req.params.id;
        const shopId = req.user.shopId;

        // 🔍 1. Find order
        const order = await Order.findOne({
            _id: orderId,
            shop_id: shopId,
            isDeleted: false
        }).session(session);

        if (!order) {
            throw new Error("Order not found");
        }

        // 🔒 2. Prevent double cancel
        if (order.status === 'Cancelled') {
            throw new Error("Order already cancelled");
        }

        // 🔒 3. Prevent invalid cancel
        if (['Shipped', 'Delivered'].includes(order.status)) {
            throw new Error("Cannot cancel after shipment");
        }

        // 🔁 4. Restore stock
        for (const item of order.items) {

            // 🔍 Get product WITH session
            const product = await Product.findOne({
                _id: item.productId
            }).session(session);

            if (!product) {
                throw new Error("Product not found during restore");
            }

            const variant = product.variants.id(item.variantId);

            if (!variant) {
                throw new Error("Variant not found during restore");
            }

            const beforeStock = variant.stock;

            // 🔄 Restore stock
            variant.stock += item.quantity;

            await product.save({ session });

            // 🧾 LOG INVENTORY CHANGE
            await InventoryLog.create([{
                shop_id: shopId,
                productId: product._id,
                variantId: variant._id,

                change: +item.quantity,
                type: 'CANCEL',
                referenceId: order._id,

                beforeStock,
                afterStock: variant.stock,

                user: req.user._id,
                note: 'Order cancelled'
            }], { session });
        }

        // 🔄 5. Update order status
        order.status = 'Cancelled';

        // 💳 Optional: mark payment refunded
        if (order.payment?.status === 'Paid') {
            order.payment.status = 'Refunded';
        }

        await order.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: "Order cancelled and stock restored"
        });

    } catch (err) {

        await session.abortTransaction();

        res.status(400).json({
            error: err.message
        });

    } finally {
        session.endSession();
    }
};


exports.updateStock = async (req, res) => {
    const { productId, variantId, quantity } = req.body;

    const product = await Product.findById(productId);
    const variant = product.variants.id(variantId);

    const beforeStock = variant.stock;

    variant.stock += quantity;

    await product.save();

    await InventoryLog.create({
        shop_id: req.user.shopId,
        productId,
        variantId,

        change: quantity,
        type: 'MANUAL',

        beforeStock,
        afterStock: variant.stock,

        user: req.user._id
    });

    res.json({ success: true });
};

exports.getInventoryLogs = async (req, res) => {
    const logs = await InventoryLog.find({
        shop_id: req.user.shopId
    })
        .populate('productId', 'title')
        .sort({ createdAt: -1 })
        .limit(50);

    res.json(logs);
};


exports.getShopOrders = async (req, res) => {
    try {
        const shopId = req.user.shop_id || req.user.shopId;

        // Fetch orders AND pull in the customer's name AND product titles
        const orders = await Order.find({ shop_id: shopId })
            .populate('customer', 'fullName email') // Injects the actual user data
            .populate('items.product', 'title')     // ✨ ADD THIS LINE HERE ✨
            .sort({ createdAt: -1 }); // Newest orders at the top

        res.status(200).json(orders);
    } catch (err) {
        console.error("Error fetching orders:", err);
        res.status(500).json({ error: "Failed to fetch orders." });
    }
};

/**
 * @desc    Update the status of a specific order
 * @route   PATCH /api/admin/orders/:id/status
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const shopId = req.user.shop_id || req.user.shopId;

        // 2. Validate the request body using Joi
        const { error, value } = updateOrderStatusSchema.validate(req.body);

        // 3. If validation fails, instantly return a clean 400 Bad Request error
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { status } = value; // Safe to use now!

        // Find the order AND ensure it belongs to this specific vendor
        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, shop_id: shopId },
            { status: status },
            { returnDocument: 'after' } // <--- The modern syntax
        ).populate('customer', 'fullName email');

        if (!order) {
            return res.status(404).json({ error: "Order not found or access denied." });
        }

        res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            order
        });

    } catch (err) {
        console.error("Error updating order status:", err);
        res.status(500).json({ error: "Failed to update order status." });
    }
};

/**
 * @desc    Get dashboard overview stats for a specific shop
 * @route   GET /api/admin/dashboard-stats
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const shopId = req.user.shop_id || req.user.shopId;

        // Run all queries in parallel for maximum speed
        const [revenueData, activeOrders, totalProducts, totalCustomers] = await Promise.all([
            // 1. Calculate Total Revenue using MongoDB Aggregation
            Order.aggregate([
                { $match: { shop_id: shopId, status: { $ne: 'Cancelled' } } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]),
            // 2. Count Active Orders (anything not Delivered or Cancelled)
            Order.countDocuments({ shop_id: shopId, status: { $in: ['Pending', 'Processing', 'Shipped'] } }),
            // 3. Count Total Products
            Product.countDocuments({ shop_id: shopId }),
            // 4. Count Total Customers
            User.countDocuments({ shop_id: shopId, role: 'Customer' })
        ]);

        res.status(200).json({
            totalRevenue: revenueData[0]?.total || 0,
            activeOrders,
            totalProducts,
            totalCustomers
        });
    } catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({ error: "Failed to fetch dashboard statistics." });
    }
};

exports.getRevenueAnalytics = async (req, res) => {
    try {
        const shopId = req.user.shop_id || req.user.shopId;
        const { month, year } = req.query;

        // ✨ THE FIX: Manually convert the string to a MongoDB ObjectId ✨
        let matchQuery = {
            shop_id: new mongoose.Types.ObjectId(shopId),
            status: { $in: ['Delivered', 'Shipped', 'Processing', 'Pending'] }
        };


        // ✨ 3. THE FIX: If they asked for a specific month, filter by Date! ✨
        if (month && year) {
            // JavaScript months are 0-indexed (0 = Jan, 2 = Mar).
            // So if they pass month=3, we subtract 1 to get March.
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 1); // 1st day of the NEXT month

            // Add the date range to our search filter
            matchQuery.createdAt = {
                $gte: startDate, // Greater than or equal to 1st of the month
                $lt: endDate     // Less than 1st of the next month
            };
        }

        const analytics = await Order.aggregate([
            // Pass our dynamic matchQuery here instead of the hardcoded object
            { $match: matchQuery },

            { $unwind: "$items" },

            // ... (The rest of your $facet pipeline stays EXACTLY the same)
            {
                $facet: {
                    overview: [
                        {
                            $group: {
                                _id: null,
                                totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                                totalCost: { $sum: { $multiply: ["$items.buyingPrice", "$items.quantity"] } },
                                totalItemsSold: { $sum: "$items.quantity" }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                totalRevenue: 1,
                                totalCost: 1,
                                totalItemsSold: 1,
                                netProfit: { $subtract: ["$totalRevenue", "$totalCost"] }
                            }
                        }
                    ],
                    monthlyData: [
                        {
                            $group: {
                                _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
                                revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                                cost: { $sum: { $multiply: ["$items.buyingPrice", "$items.quantity"] } }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                year: "$_id.year", month: "$_id.month",
                                revenue: 1, cost: 1,
                                profit: { $subtract: ["$revenue", "$cost"] }
                            }
                        },
                        { $sort: { "year": 1, "month": 1 } }
                    ]
                }
            }
        ]);

        const result = {
            overview: analytics[0]?.overview[0] || { totalRevenue: 0, totalCost: 0, netProfit: 0, totalItemsSold: 0 },
            monthlyData: analytics[0]?.monthlyData || []
        };

        res.status(200).json({ success: true, data: result });

    } catch (err) {
        console.error("Analytics Error:", err);
        res.status(500).json({ error: "Failed to fetch revenue data." });
    }
};

