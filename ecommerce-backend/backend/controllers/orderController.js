const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { createOrderSchema,updateOrderStatusSchema } = require('../validations/orderValidation');



/**
 * @desc    Create a new order (Storefront)
 * @route   POST /api/orders
 */

exports.createOrder = async (req, res) => {
    try {
        const { items, shippingZone, shippingAddress } = req.body;
        const tenantId = req.tenantId;

        let itemsWithPrice = [];
        let subtotal = 0;

        // 1. Fetch current prices from the DB for every item sent by the user
        for (const item of items) {
            const product = await Product.findOne({ _id: item.product, shop_id: tenantId });

            if (!product) {
                return res.status(404).json({ error: `Product ${item.product} not found.` });
            }

            // Check stock while we are at it
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for ${product.title}` });
            }

            // Use the price FROM THE DATABASE, not from the user's request
            const priceAtTimeOfPurchase = product.price;

            itemsWithPrice.push({
                product: product._id,
                quantity: item.quantity,
                price: priceAtTimeOfPurchase // SNAPSHOT: Saving the price forever
            });

            subtotal += priceAtTimeOfPurchase * item.quantity;
        }

        // 2. Shipping logic
        const shippingCost = shippingZone === 'Inside Dhaka' ? 80 : 130;

        // 3. Create the Order
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

        await newOrder.save();

        // 4. (Optional but recommended) Reduce stock in the Product model
        // We can do this now or after the order moves to "Processing"

        res.status(201).json({ success: true, order: newOrder });

    } catch (err) {
        res.status(500).json({ error: "Checkout failed." });
    }
};/**
 * @desc    Get all orders for the logged-in vendor's shop
 * @route   GET /api/admin/orders
 */
exports.getShopOrders = async (req, res) => {
    try {
        const shopId = req.user.shop_id || req.user.shopId;

        // Fetch orders AND pull in the customer's name/email using Mongoose 'populate'
        const orders = await Order.find({ shop_id: shopId })
            .populate('customer', 'fullName email') // Injects the actual user data
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
            { new: true }
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
