const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const mongoose = require('mongoose');
const { createOrderSchema,updateOrderStatusSchema } = require('../validations/orderValidation');



/**
 * @desc    Create a new order (Storefront)
 * @route   POST /api/orders
 */

exports.createOrder = async (req, res) => {
    try {
        // ✨ 1. REAL-TIME SECURITY CHECK: Is the user banned? ✨
        // We use .select('status') to make this query incredibly fast
        const customerCheck = await User.findById(req.user._id).select('status');

        if (!customerCheck) {
            return res.status(404).json({ error: "Customer account not found." });
        }

        if (customerCheck.status === 'Suspended') {
            return res.status(403).json({
                error: "Your account has been suspended by the store admin. You cannot place orders."
            });
        }

        // ==========================================
        //  If they pass the check, process the order
        // ==========================================

        const { items, shippingZone, shippingAddress } = req.body;
        const tenantId = req.tenantId;

        let itemsWithPrice = [];
        let subtotal = 0;

        // 2. Fetch current prices from the DB for every item sent by the user
        for (const item of items) {
            const product = await Product.findOne({ _id: item.product, shop_id: tenantId });

            if (!product) {
                return res.status(404).json({ error: `Product ${item.product} not found.` });
            }

            // Check stock while we are at it
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for ${product.title}` });
            }

            // Use the prices FROM THE DATABASE
            const sellingPriceAtPurchase = product.sellingPrice;
            const buyingPriceAtPurchase = product.buyingPrice;

            itemsWithPrice.push({
                product: product._id,
                quantity: item.quantity,
                price: sellingPriceAtPurchase,        // What the customer pays
                buyingPrice: buyingPriceAtPurchase    // Saved for your Profit Chart
            });

            subtotal += sellingPriceAtPurchase * item.quantity;
        }

        // 3. Shipping logic
        const shippingCost = shippingZone === 'Inside Dhaka' ? 80 : 130;

        // 4. Create the Order
        const newOrder = new Order({
            shop_id: tenantId,
            customer: req.user._id,
            items: itemsWithPrice,
            shippingZone,
            shippingCost,
            totalAmount: subtotal + shippingCost,
            shippingAddress,
            status: 'Pending'
        });

        // Save the order to the database
        await newOrder.save();

        // ✨ 5. THE FIX: Reduce the stock for each product ✨
        // We do this AFTER the order saves successfully so we don't reduce stock if the order fails.
        const stockUpdatePromises = itemsWithPrice.map(item =>
            Product.findByIdAndUpdate(
                item.product,
                { $inc: { stock: -item.quantity } }, // Subtracts the ordered amount
                { new: true }
            )
        );

        // Run all stock updates in parallel for maximum speed
        await Promise.all(stockUpdatePromises);

        res.status(201).json({ success: true, order: newOrder });

    } catch (err) {
        console.error("Order Creation Error:", err);
        res.status(500).json({ error: "Checkout failed." });
    }
};
/**
 * @desc    Get all orders for the logged-in vendor's shop
 * @route   GET /api/admin/orders
 */
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