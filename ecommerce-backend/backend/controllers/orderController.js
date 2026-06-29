const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const mongoose = require('mongoose');
const { createOrderSchema, updateOrderStatusSchema } = require('../validations/orderValidation');
const InventoryLog = require('../models/InventoryLog');
const Shop = require('../models/Shop'); // Make sure to import your Shop model
const { logAudit } = require('../services/auditLogService');
const { decrementVariantStockAtomically } = require('../services/inventoryStockService');
const ConsentLog = require('../models/ConsentLog');
const { enqueueJob } = require('../services/jobQueueService');
const {
    sanitizeOrderForCustomer,
    sanitizeOrdersForCustomer
} = require('../services/orderPrivacyService');
const {
    getCustomerOrders,
    getCustomerOrderById,
    getShopOrdersPage
} = require('../services/orders/orderQueryService');
const {
    getShippingCostForZone,
    buildOrderLineItem,
    applyPromotionToTotals,
    incrementPromotionUsage
} = require('../services/orders/orderPricingService');
const {
    buildStatusUpdate,
    shouldBlockStatusUpdateForStockRestoration
} = require('../services/orders/orderStatusService');
const {
    notifyOrderCreated,
    notifyCustomerOrderStatus
} = require('../services/orders/orderEmailService');
const {
    getDashboardStatsData,
    getDashboardOverviewResponse,
    getRevenueAnalyticsData
} = require('../services/orders/orderAnalyticsService');
const { consumeCheckoutPhoneProof } = require('../services/checkout/checkoutOtpService');



exports.syncOrderToPathao = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Identify the Vendor Shop
        const shopId = req.tenantId;
        const shop = await Shop.findById(shopId);

        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        if (!shop.pathaoStoreId) {
            return res.status(400).json({
                success: false,
                error: 'Please set up your Pathao Store Location in your Shipping Settings first.'
            });
        }

        // 2. Fetch the specific Order
        const order = await Order.findOne({ _id: id, shop_id: shopId, isDeleted: false });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        if (order.isPathaoSynced) return res.status(400).json({ success: false, error: 'Order already synced to Pathao' });
        if (['queued', 'syncing'].includes(order.pathaoSyncStatus)) {
            return res.status(202).json({
                success: true,
                status: order.pathaoSyncStatus,
                data: order,
                message: 'Pathao sync is already queued'
            });
        }

        const job = await enqueueJob({
            queue: 'courier',
            name: 'pathao.sync_order',
            shop_id: shopId,
            payload: {
                orderId: order._id,
                request: {
                    recipient_name: req.body.recipient_name,
                    recipient_phone: req.body.recipient_phone,
                    recipient_address: req.body.recipient_address,
                    item_weight: req.body.item_weight,
                    amount_to_collect: req.body.amount_to_collect,
                    special_instruction: req.body.special_instruction
                }
            }
        });

        order.pathaoSyncStatus = 'queued';
        order.pathaoLastError = '';
        await order.save();

        return res.status(202).json({
            success: true,
            status: 'queued',
            jobId: job?._id,
            data: order,
            message: 'Pathao sync queued'
        });

    } catch (err) {
        console.error("Pathao Sync Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        // req.user._id comes from your JWT auth middleware
        const customerId = req.user._id;

        const orders = await getCustomerOrders({
            customerId,
            shopId: req.tenantId
        });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: sanitizeOrdersForCustomer(orders)
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

        const order = await getCustomerOrderById({
            orderId,
            customerId,
            shopId: req.tenantId
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: sanitizeOrderForCustomer(order)
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
        const { error, value } = createOrderSchema.validate(req.body);
        if (error) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: error.details[0].message });
        }
        const { items, shipping, payment, promotionCode, source, consent, checkoutSessionId, phoneVerificationToken } = value;
        const shopId = req.tenantId;
        const userId = req.user?._id;

        if (!userId) throw new Error("Authentication failed. Please log in again.");

        // ✅ Customer existence + status check
        const customer = await User.findById(userId).select('status fullName email phone').session(session);
        if (!customer) throw new Error("Customer not found");
        if (customer.status === 'Suspended') throw new Error("Your account is suspended.");

        await consumeCheckoutPhoneProof({
            shopId,
            phone: shipping.address.phone,
            checkoutSessionId,
            items,
            verificationToken: phoneVerificationToken,
            session
        });

        let subtotal = 0;
        const orderItems = [];
        const promotionItems = [];
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

            const stockUpdate = await decrementVariantStockAtomically({
                product,
                shopId,
                variantId: variant._id,
                quantity: item.quantity,
                session
            });

            const beforeStock = stockUpdate.beforeStock;
            const afterStock = stockUpdate.afterStock;

            const lineItem = buildOrderLineItem({
                product,
                variant,
                item
            });
            subtotal += lineItem.subtotal;
            promotionItems.push(lineItem.promotionItem);
            orderItems.push(lineItem.orderItem);

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

        const promotionTotals = await applyPromotionToTotals({
            shopId,
            code: promotionCode,
            subtotal,
            items: promotionItems,
            customerId: userId,
            shippingCost: getShippingCostForZone(shipping.zone),
            session
        });
        const { discountAmount, shippingCost, promotionSnapshot } = promotionTotals;

        const totalAmount = Math.max(0, subtotal - discountAmount) + shippingCost;

        // ✅ Create order
        const [order] = await Order.create([{
            shop_id: shopId,
            customer: userId,
            items: orderItems,
            pricing: {
                subtotal,
                discount: discountAmount,
                shipping: shippingCost,
                total: totalAmount
            },
            promotion: promotionSnapshot,
            payment: {
                method: payment.method,
                status: 'Pending'
            },
            shipping: {
                zone: shipping.zone,
                cost: shippingCost,
                address: shipping.address
            },
            status: 'Pending',
            source: source || 'direct'
        }], { session });
        await ConsentLog.create([{
            shop_id: shopId,
            customer_id: userId,
            order_id: order._id,
            type: 'checkout_policy',
            version: consent.version || 'checkout_policy_v1',
            acceptedAt: new Date(),
            ip: req.ip || req.headers['x-forwarded-for'] || '',
            userAgent: req.headers['user-agent'] || ''
        }], { session });

        await incrementPromotionUsage({ shopId, promotionSnapshot, session });

        // ✅ Link inventory logs to the new order
        const logsWithRef = inventoryLogs.map(log => ({
            ...log,
            referenceId: order._id
        }));
        await InventoryLog.insertMany(logsWithRef, { session });

        await session.commitTransaction();

        notifyOrderCreated({
            shop_id: shopId,
            order,
            customer
        });

        logAudit({
            req,
            shop_id: shopId,
            action: 'order.created_after_phone_verification',
            entityType: 'Order',
            entityId: order._id,
            entityLabel: `Order #${String(order._id).slice(-6).toUpperCase()}`,
            severity: 'info'
        }).catch(() => {});

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            orderId: order._id,
            total: totalAmount
        });

    } catch (err) {
        await session.abortTransaction();
        res.status(err.statusCode || 400).json({
            success: false,
            error: err.message,
            ...(err.code ? { code: err.code } : {})
        });
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
        const { orders, pagination } = await getShopOrdersPage({
            shopId,
            page: req.query.page,
            limit: req.query.limit
        });

        res.status(200).json({
            success: true,
            data: orders,
            pagination
        });

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
        const { status, notifyCustomer, emailSubject, emailMessage } = value;

        // ✅ Prevent bypassing the stock restoration logic
        if (shouldBlockStatusUpdateForStockRestoration(status)) {
            return res.status(400).json({
                success: false,
                error: "To cancel or return an order, please use the dedicated cancel/return endpoints so stock is properly restored."
            });
        }

        const previousOrder = await Order.findOne({
            _id: req.params.id,
            shop_id: shopId,
            isDeleted: false
        }).select('status').lean();

        const update = buildStatusUpdate(status);

        const order = await Order.findOneAndUpdate(
            { _id: req.params.id, shop_id: shopId, isDeleted: false },
            { $set: update },
            { new: true }
        ).populate('customer', 'fullName email');

        if (!order) {
            return res.status(404).json({ success: false, error: "Order not found or access denied" });
        }

        const statusChanged = previousOrder?.status !== order.status;
        let emailResult = { sent: false };

        if (statusChanged && notifyCustomer) {
            try {
                emailResult = await notifyCustomerOrderStatus({
                    shopId,
                    order,
                    status: order.status,
                    subject: emailSubject,
                    message: emailMessage
                });
            } catch (emailError) {
                emailResult = { sent: false, reason: emailError.message };
                console.warn('Order status email failed:', emailError.message);
            }
        }

        await logAudit({
            req,
            shop_id: shopId,
            action: 'order.status_updated',
            entityType: 'Order',
            entityId: order._id,
            entityLabel: `Order #${String(order._id).slice(-6).toUpperCase()}`,
            before: { status: previousOrder?.status },
            after: {
                status: order.status,
                customerNotified: Boolean(emailResult.sent)
            }
        });

        res.status(200).json({
            success: true,
            message: `Order status updated to "${status}"`,
            notification: emailResult,
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
        const result = await getDashboardStatsData(req.tenantId);
        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (err) {
        console.error("Dashboard stats error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch dashboard statistics"
        });
    }
};

exports.getDashboardOverview = async (req, res) => {
    try {
        const response = await getDashboardOverviewResponse(req.tenantId);
        res.status(200).json(response);
    } catch (err) {
        console.error("Dashboard overview error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch dashboard overview" });
    }
};


/**
 * @desc    Get detailed revenue analytics with optional month/year filter
 * @route   GET /api/admin/inventory/revenue/analytics?month=3&year=2025
 * @access  Private (Admin)
 */
exports.getRevenueAnalytics = async (req, res) => {
    try {
        const { month, year } = req.query;
        const analytics = await getRevenueAnalyticsData({
            tenantId: req.tenantId,
            month,
            year
        });

        return res.status(200).json({
            success: true,
            data: analytics
        });

    } catch (err) {
        console.error("Revenue analytics error:", err);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch revenue analytics"
        });
    }
};
