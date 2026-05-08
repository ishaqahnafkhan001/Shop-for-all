const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const mongoose = require('mongoose');
const { createOrderSchema, updateOrderStatusSchema } = require('../validations/orderValidation');
const InventoryLog = require('../models/InventoryLog');
const { getPathaoToken, createPathaoOrder } = require('../services/pathaoService');


exports.syncOrderToPathao = async (req, res) => {
    try {
        const { id } = req.params;
        const { recipient_name, recipient_phone, recipient_address, item_weight, amount_to_collect, special_instruction } = req.body;
        const shopId = req.tenantId;

        const order = await Order.findOne({ _id: id, shop_id: shopId, isDeleted: false });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        if (order.isPathaoSynced) return res.status(400).json({ success: false, error: 'Order already synced to Pathao' });

        // Generate Pathao Sandbox Token
        const token = await getPathaoToken();

        // Prepare Pathao Payload
        const pathaoPayload = {
            store_id: process.env.PATHAO_STORE_ID || 12345, // IMPORTANT: Put your Pathao Store ID here
            merchant_order_id: order._id.toString(),
            recipient_name,
            recipient_phone,
            recipient_address,
            delivery_type: 48, // Normal Delivery
            item_type: 2, // Parcel
            special_instruction: special_instruction || '',
            item_quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
            item_weight: item_weight || "0.5",
            amount_to_collect: amount_to_collect !== undefined ? amount_to_collect : (order.payment?.method === 'COD' ? order.pricing.total : 0)
        };

        // Create Order in Pathao
        const pathaoRes = await createPathaoOrder(token, pathaoPayload);

        if (pathaoRes.type === 'success') {
            order.pathaoConsignmentId = pathaoRes.data.consignment_id;
            order.isPathaoSynced = true;
            // Ensure status is at least confirmed
            if (order.status === 'Pending') order.status = 'Confirmed';
            await order.save();

            return res.status(200).json({
                success: true,
                data: order,
                message: 'Successfully synced to Pathao!'
            });
        } else {
            throw new Error('Pathao sync failed');
        }

    } catch (err) {
        console.error("Pathao Sync Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        // req.user._id comes from your JWT auth middleware
        const customerId = req.user._id;

        // Find all orders for this customer, sorted by newest first
        const orders = await Order.find({
            customer: customerId
            // If you want to strictly tie it to the current shop, add:
            // shop_id: req.tenant._id
        })
            .sort({ createdAt: -1 }); // -1 means descending (newest at the top)

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error("Error fetching customer orders:", error);
        res.status(500).json({
            success: false,
            error: 'Could not fetch orders at this time.'
        });
    }
};

// @desc    Get a single order by its ID (for the invoice view)
// @route   GET /api/v1/storefront/:subdomain/my-orders/:orderId
// @access  Private (Customer only)
exports.getOrderById = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const customerId = req.user._id;

        const order = await Order.findOne({
            _id: orderId,
            customer: customerId // Security check: Ensure they own this order!
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error("Error fetching single order:", error);
        res.status(500).json({
            success: false,
            error: 'Could not fetch order details.'
        });
    }
};

exports.createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // ✅ Validate request body first
        const { error, value } = createOrderSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, error: error.details[0].message });
        }
        console.log(JSON.stringify(req.body.items, null, 2));
        const { items, shipping, payment } = value;
        const shopId = req.tenantId;
        const userId = req.user?._id;

        if (!userId) throw new Error("Authentication failed. Please log in again.");

        // ✅ Customer existence + status check
        const customer = await User.findById(userId).select('status').session(session);
        if (!customer) throw new Error("Customer not found");
        if (customer.status === 'Suspended') throw new Error("Your account is suspended.");

        let subtotal = 0;
        const orderItems = [];
        const inventoryLogs = [];

        // ✅ Process each item
        for (const item of items) {
            const product = await Product.findOne({
                _id: item.productId,
                shop_id: shopId,
                isDeleted: false
            }).session(session);

            if (!product) throw new Error(`Product not found: ${item.productId}`);

            const variant = product.variants.id(item.variantId);
            if (!variant) throw new Error(`Variant not found for product: ${product.title}`);

            if (variant.stock < item.quantity) {
                throw new Error(`Insufficient stock for "${product.title}" (SKU: ${variant.sku}). Available: ${variant.stock}`);
            }

            const beforeStock = variant.stock;

            // ✅ Deduct stock
            variant.stock -= item.quantity;
            await product.save({ session });

            const afterStock = variant.stock;

            // ✅ Price calculation: variant override takes priority over base price
            const basePrice = variant.priceOverride || product.pricing.sellingPrice;
            const discount = product.pricing.discount || 0;
            const unitPrice = Math.round(basePrice - (basePrice * discount / 100));
            const totalItemPrice = unitPrice * item.quantity;

            subtotal += totalItemPrice;

            // ✅ Snapshot item for order (prices locked at time of purchase)
            orderItems.push({
                productId: product._id,
                variantId: variant._id,
                title: product.title,
                sku: variant.sku,
                attributes: variant.attributes,
                quantity: item.quantity,
                price: unitPrice,
                buyingPrice: product.pricing.buyingPrice,
                total: totalItemPrice
            });

            // ✅ Stage inventory log (referenceId filled after order created)
            inventoryLogs.push({
                shop_id: shopId,
                productId: product._id,
                variantId: variant._id,
                change: -item.quantity,
                type: 'ORDER',
                referenceId: null,
                beforeStock,
                afterStock,
                user: userId,
                note: 'Order placed'
            });
        }

        // ✅ Shipping cost (Dhaka-based)
        const shippingCost = shipping.zone === 'Inside Dhaka' ? 80 : 130;
        const totalAmount = subtotal + shippingCost;

        // ✅ Create order
        const [order] = await Order.create([{
            shop_id: shopId,
            customer: userId,
            items: orderItems,
            pricing: {
                subtotal,
                shipping: shippingCost,
                total: totalAmount
            },
            payment: {
                method: payment.method,
                status: 'Pending'
            },
            shipping: {
                zone: shipping.zone,
                cost: shippingCost,
                address: shipping.address
            },
            status: 'Pending'
        }], { session });

        // ✅ Link inventory logs to the new order
        const logsWithRef = inventoryLogs.map(log => ({
            ...log,
            referenceId: order._id
        }));
        await InventoryLog.insertMany(logsWithRef, { session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            orderId: order._id,
            total: totalAmount
        });

    } catch (err) {
        await session.abortTransaction();
        res.status(400).json({ success: false, error: err.message });
    } finally {
        session.endSession();
    }
};


/**
 * @desc    Cancel an order and restore stock
 * @route   DELETE /api/orders/:id
 * @access  Private (Customer / Admin)
 */
exports.cancelOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const orderId = req.params.id;
        const shopId = req.tenantId;

        const order = await Order.findOne({
            _id: orderId,
            shop_id: shopId,
            isDeleted: false
        }).session(session);

        if (!order) throw new Error("Order not found");
        if (order.status === 'Cancelled') throw new Error("Order is already cancelled");
        if (['Shipped', 'Delivered'].includes(order.status)) {
            throw new Error("Cannot cancel an order that has already been shipped or delivered");
        }

        const logs = [];

        // ✅ Restore stock for each item
        for (const item of order.items) {
            const product = await Product.findOne({
                _id: item.productId,
                shop_id: shopId,
            }).session(session);

            if (!product) throw new Error(`Product not found while restoring stock: ${item.productId}`);

            const variant = product.variants.id(item.variantId);
            if (!variant) throw new Error(`Variant not found while restoring stock: ${item.variantId}`);

            const beforeStock = variant.stock;
            variant.stock += item.quantity;
            await product.save({ session });

            logs.push({
                shop_id: shopId,
                productId: product._id,
                variantId: variant._id,
                change: item.quantity,
                type: 'CANCEL',
                referenceId: order._id,
                beforeStock,
                afterStock: variant.stock,
                user: req.user._id,
                note: 'Order cancelled — stock restored'
            });
        }

        // ✅ Batch insert logs
        if (logs.length > 0) {
            await InventoryLog.insertMany(logs, { session });
        }

        // ✅ Update order status
        order.status = 'Cancelled';
        if (order.payment?.status === 'Paid') {
            order.payment.status = 'Refunded';
        }
        await order.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Order cancelled and stock restored'
        });

    } catch (err) {
        await session.abortTransaction();
        res.status(400).json({ success: false, error: err.message });
    } finally {
        session.endSession();
    }
};


/**
 * @desc    Get all orders for a shop (admin view)
 * @route   GET /api/admin/orders
 * @access  Private (Admin)
 */
exports.getShopOrders = async (req, res) => {
    try {
        const shopId = req.tenantId;

        const orders = await Order.find({ shop_id: shopId, isDeleted: false })
            .populate('customer', 'fullName email')
            .populate('items.productId', 'title')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: orders });

    } catch (err) {
        console.error("Error fetching orders:", err);
        res.status(500).json({ success: false, error: "Failed to fetch orders" });
    }
};


/**
 * @desc    Update the status of a specific order
 * @route   PATCH /api/admin/orders/:id/status
 * @access  Private (Admin)
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        // FIX: actually run the Joi validation that was previously only commented about
        const { error, value } = updateOrderStatusSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        const shopId = req.tenantId;
        const { status } = value;

        // ✅ Prevent bypassing the stock restoration logic
        if (['Cancelled', 'Returned'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: "To cancel or return an order, please use the dedicated cancel/return endpoints so stock is properly restored."
            });
        }

        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, shop_id: shopId, isDeleted: false },
            { status },
            { new: true }
        ).populate('customer', 'fullName email');

        if (!order) {
            return res.status(404).json({ success: false, error: "Order not found or access denied" });
        }

        res.status(200).json({
            success: true,
            message: `Order status updated to "${status}"`,
            data: order
        });

    } catch (err) {
        console.error("Error updating order status:", err);
        res.status(500).json({ success: false, error: "Failed to update order status" });
    }
};


/**
 * @desc    Get dashboard overview stats for a shop
 * @route   GET /api/admin/dashboard-stats
 * @access  Private (Admin)
 */
exports.getDashboardStats = async (req, res) => {
    try {
        // FIX: Use req.tenantId (set reliably by auth middleware) instead of
        // req.user?.shopId + manual ObjectId validation, consistent with rest of codebase
        const shopId = new mongoose.Types.ObjectId(req.tenantId);

        const [result] = await Order.aggregate([
            {
                $match: {
                    shop_id: shopId,
                    isDeleted: false
                }
            },

            {
                $facet: {
                    // 💰 Revenue (pricing.total includes shipping/tax/discount)
                    revenue: [
                        { $match: { status: 'Delivered' } },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: '$pricing.total' }
                            }
                        }
                    ],

                    // 📈 Profit + items sold (item-level)
                    profitAndItems: [
                        { $match: { status: 'Delivered' } },
                        { $unwind: '$items' },
                        {
                            $group: {
                                _id: null,
                                totalCost: {
                                    $sum: { $multiply: ['$items.buyingPrice', '$items.quantity'] }
                                },
                                itemsRevenue: {
                                    $sum: { $multiply: ['$items.price', '$items.quantity'] }
                                },
                                totalItemsSold: { $sum: '$items.quantity' }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                totalItemsSold: 1,
                                netProfit: { $subtract: ['$itemsRevenue', '$totalCost'] }
                            }
                        }
                    ],

                    // 📦 Active orders
                    activeOrders: [
                        {
                            $match: {
                                status: { $in: ['Pending', 'Processing', 'Shipped'] }
                            }
                        },
                        { $count: 'count' }
                    ],

                    // 🛒 Products
                    products: [
                        {
                            $lookup: {
                                from: 'products',
                                let: { shopId: '$shop_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$shop_id', '$$shopId'] },
                                                    { $eq: ['$isDeleted', false] }
                                                ]
                                            }
                                        }
                                    },
                                    { $count: 'count' }
                                ],
                                as: 'products'
                            }
                        },
                        { $unwind: '$products' },
                        { $replaceRoot: { newRoot: '$products' } }
                    ],

                    // 👤 Customers
                    customers: [
                        {
                            $lookup: {
                                from: 'users',
                                let: { shopId: '$shop_id' },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$shop_id', '$$shopId'] },
                                                    { $eq: ['$role', 'Customer'] }
                                                ]
                                            }
                                        }
                                    },
                                    { $count: 'count' }
                                ],
                                as: 'customers'
                            }
                        },
                        { $unwind: '$customers' },
                        { $replaceRoot: { newRoot: '$customers' } }
                    ]
                }
            },

            {
                $project: {
                    totalRevenue: {
                        $ifNull: [{ $arrayElemAt: ['$revenue.total', 0] }, 0]
                    },
                    activeOrders: {
                        $ifNull: [{ $arrayElemAt: ['$activeOrders.count', 0] }, 0]
                    },
                    totalProducts: {
                        $ifNull: [{ $arrayElemAt: ['$products.count', 0] }, 0]
                    },
                    totalCustomers: {
                        $ifNull: [{ $arrayElemAt: ['$customers.count', 0] }, 0]
                    },
                    totalItemsSold: {
                        $ifNull: [{ $arrayElemAt: ['$profitAndItems.totalItemsSold', 0] }, 0]
                    },
                    netProfit: {
                        $ifNull: [{ $arrayElemAt: ['$profitAndItems.netProfit', 0] }, 0]
                    }
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            data: result || {
                totalRevenue: 0,
                activeOrders: 0,
                totalProducts: 0,
                totalCustomers: 0,
                totalItemsSold: 0,
                netProfit: 0
            }
        });

    } catch (err) {
        console.error("Dashboard stats error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch dashboard statistics"
        });
    }
};


/**
 * @desc    Get detailed revenue analytics with optional month/year filter
 * @route   GET /api/admin/inventory/revenue/analytics?month=3&year=2025
 * @access  Private (Admin)
 */
exports.getRevenueAnalytics = async (req, res) => {
    try {
        // FIX: Use req.tenantId consistently; removed manual ObjectId validation
        // that duplicated what the auth middleware already guarantees
        const shopId = new mongoose.Types.ObjectId(req.tenantId);

        const { month, year } = req.query;

        // FIX: removed debug console.log statements
        const matchQuery = {
            shop_id: shopId,
            status: { $in: ['Delivered'] },
            isDeleted: false
        };

        // 📅 Date filter
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 1);
            matchQuery.createdAt = { $gte: startDate, $lt: endDate };
        }

        const analytics = await Order.aggregate([
            { $match: matchQuery },
            { $unwind: '$items' },

            {
                $facet: {
                    overview: [
                        {
                            $group: {
                                _id: null,
                                totalRevenue: {
                                    $sum: {
                                        $add: [
                                            { $multiply: ['$items.price', '$items.quantity'] },
                                            '$pricing.shipping'
                                        ]
                                    }
                                },
                                totalCost: {
                                    $sum: { $multiply: ['$items.buyingPrice', '$items.quantity'] }
                                },
                                totalItemsSold: { $sum: '$items.quantity' }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                totalRevenue: 1,
                                totalCost: 1,
                                totalItemsSold: 1,
                                netProfit: { $subtract: ['$totalRevenue', '$totalCost'] }
                            }
                        }
                    ],

                    monthlyData: [
                        {
                            $group: {
                                _id: {
                                    year: { $year: '$createdAt' },
                                    month: { $month: '$createdAt' }
                                },
                                revenue: {
                                    $sum: { $multiply: ['$items.price', '$items.quantity'] }
                                },
                                cost: {
                                    $sum: { $multiply: ['$items.buyingPrice', '$items.quantity'] }
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                year: '$_id.year',
                                month: '$_id.month',
                                revenue: 1,
                                cost: 1,
                                profit: { $subtract: ['$revenue', '$cost'] }
                            }
                        },
                        { $sort: { year: 1, month: 1 } }
                    ]
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            data: {
                overview: analytics[0]?.overview[0] || {
                    totalRevenue: 0,
                    totalCost: 0,
                    netProfit: 0,
                    totalItemsSold: 0
                },
                monthlyData: analytics[0]?.monthlyData || []
            }
        });

    } catch (err) {
        console.error("Revenue analytics error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch revenue analytics"
        });
    }
};