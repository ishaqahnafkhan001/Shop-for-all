const Shop = require('../models/Shop'); // Or wherever your Shop model is
const Product = require('../models/Product');
const bcrypt = require('bcryptjs');

const mongoose = require('mongoose');
const Order = require('../models/Order');
const InventoryLog = require('../models/InventoryLog');
const User = require('../models/User'); // We need this to create Guest customers
const Promotion = require('../models/Promotion');
const ReturnRequest = require('../models/ReturnRequest');
const { evaluatePromotion } = require('../services/promotionService');
const { notifyNewOrder } = require('../services/shopEventNotificationService');
const { decrementVariantStockAtomically } = require('../services/inventoryStockService');
const ConsentLog = require('../models/ConsentLog');
const { createNotification } = require('../services/notificationService');
const { logAudit } = require('../services/auditLogService');
const {
    PUBLIC_PRODUCT_CARD_PROJECT,
    sanitizePublicProduct
} = require('../services/publicProductSerializer');
const {
    sanitizeOrderForCustomer
} = require('../services/orderPrivacyService');
const {
    normalizeCustomDomain,
    buildVerifiedCustomDomainQuery
} = require('../utils/domainUtils');

const PUBLIC_SHOP_FIELDS = 'shopName subdomain theme storewideDiscount customDomain.domain customDomain.status customDomain.ownershipVerified customDomain.routingVerified customDomain.manuallyVerifiedRouting';
const RETURN_WINDOW_HOURS = 24;
const RETURN_WINDOW_MS = RETURN_WINDOW_HOURS * 60 * 60 * 1000;
const ACTIVE_RETURN_STATUSES = ['Requested', 'Approved', 'Received'];
const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || ''));
const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
const cleanText = (value, max = 500) => String(value || '').replace(/<[^>]*>/g, '').trim().slice(0, max);

const phonesMatch = (savedPhone, submittedPhone) => {
    const saved = normalizePhone(savedPhone);
    const submitted = normalizePhone(submittedPhone);
    if (!saved || !submitted) return false;

    return saved === submitted || saved.endsWith(submitted) || submitted.endsWith(saved);
};

const getPublicShopBySubdomain = async (subdomain, session = null) => {
    const identifier = normalizeCustomDomain(subdomain);
    if (!identifier) return null;

    const shopQuery = identifier.includes('.')
        ? {
            ...buildVerifiedCustomDomainQuery(identifier),
            isActive: true
        }
        : {
            subdomain: identifier,
            isActive: true
        };

    const query = Shop.findOne(shopQuery).select('_id subdomain');

    if (session) query.session(session);

    return query.lean();
};

const buildPublicOrderQuery = (orderLookup, shopId) => ({
    shop_id: shopId,
    isDeleted: false,
    ...(isObjectId(orderLookup)
        ? { _id: orderLookup }
        : {
            $expr: {
                $regexMatch: {
                    input: { $toString: '$_id' },
                    regex: `${escapeRegex(orderLookup)}$`,
                    options: 'i'
                }
            }
        })
});

const getReturnWindowEndsAt = (order) => {
    const deliveredAt = order?.shipping?.deliveredAt || order?.updatedAt || order?.createdAt;
    if (!deliveredAt) return null;
    return new Date(new Date(deliveredAt).getTime() + RETURN_WINDOW_MS);
};

const summarizeReturnRequest = (request) => {
    if (!request) return null;

    return {
        exists: true,
        id: request._id,
        status: request.status,
        reason: request.reason,
        customerNote: request.customerNote || '',
        refund: {
            status: request.refund?.status || 'Pending',
            amount: request.refund?.amount || 0
        },
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
    };
};

const buildReturnEligibility = ({ order, returnRequest }) => {
    if (!order) {
        return { canRequestReturn: false, reason: 'Order not found.' };
    }

    if (order.status !== 'Delivered') {
        return {
            canRequestReturn: false,
            reason: 'Return is available after delivery.'
        };
    }

    if (returnRequest && ACTIVE_RETURN_STATUSES.includes(returnRequest.status)) {
        return {
            canRequestReturn: false,
            reason: 'A return request is already submitted.'
        };
    }

    const returnWindowEndsAt = getReturnWindowEndsAt(order);
    if (returnWindowEndsAt && returnWindowEndsAt.getTime() < Date.now()) {
        return {
            canRequestReturn: false,
            reason: 'Return window has expired. Returns must be requested within 24 hours of delivery.',
            returnWindowEndsAt
        };
    }

    return {
        canRequestReturn: true,
        reason: null,
        returnWindowEndsAt
    };
};

const restoreCancelledOrderInventory = async ({ order, shopId, userId = null, session }) => {
    const logs = [];

    for (const item of order.items || []) {
        const product = await Product.findOne({
            _id: item.productId,
            shop_id: shopId,
            isDeleted: false
        }).session(session);

        if (!product) {
            throw new Error(`Product not found while restoring stock: ${item.title}`);
        }

        const variant = product.variants.id(item.variantId);
        if (!variant) {
            throw new Error(`Variant not found while restoring stock: ${item.title}`);
        }

        const quantity = Number(item.quantity) || 0;
        const beforeStock = Number(variant.stock || 0);
        variant.stock = beforeStock + quantity;
        if (variant.inventory) variant.inventory.stock = variant.stock;

        await product.save({ session });

        logs.push({
            shop_id: shopId,
            productId: product._id,
            variantId: variant._id,
            change: quantity,
            type: 'CANCEL',
            referenceId: order._id,
            beforeStock,
            afterStock: variant.stock,
            user: userId,
            note: 'Customer cancelled pending order — stock restored'
        });
    }

    if (logs.length > 0) {
        await InventoryLog.insertMany(logs, { session });
    }

    return logs;
};

const buildReturnItemsFromOrder = (order, submittedItems = []) => {
    const requested = Array.isArray(submittedItems) && submittedItems.length > 0
        ? submittedItems
        : order.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity
        }));

    return requested.map(requestedItem => {
        const orderItem = order.items.find(item => (
            String(item.productId?._id || item.productId) === String(requestedItem.productId) &&
            (!requestedItem.variantId || String(item.variantId) === String(requestedItem.variantId))
        ));

        if (!orderItem) {
            throw new Error('Return item does not belong to this order.');
        }

        const quantity = Number(requestedItem.quantity);
        if (!Number.isFinite(quantity) || quantity < 1 || quantity > Number(orderItem.quantity || 0)) {
            throw new Error(`Invalid return quantity for ${orderItem.title}.`);
        }

        return {
            productId: orderItem.productId?._id || orderItem.productId,
            variantId: orderItem.variantId,
            title: orderItem.title,
            sku: orderItem.sku || '',
            quantity,
            refundAmount: Math.max(0, Number(orderItem.price || 0) * quantity)
        };
    });
};

exports.createPublicOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            subdomain,
            customer,
            shippingAddress,
            shippingZone,
            shipping,
            items,
            promotionCode,
            source,
            consent
        } = req.body;

        // =========================
        // BASIC VALIDATION
        // =========================
        if (!subdomain) {
            throw new Error('Subdomain is required');
        }

        if (!customer?.email || !customer?.fullName || !customer?.phone) {
            throw new Error('Customer fullName, email and phone are required');
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('Order must contain at least one item');
        }

        if (consent?.checkoutPolicyAccepted !== true) {
            throw new Error('Policy consent is required before checkout.');
        }

        // =========================
        // SHOP CHECK
        // =========================
        const shop = await Shop.findOne({ subdomain }).session(session);

        if (!shop) {
            throw new Error('Shop not found');
        }

        // =========================
        // SHIPPING NORMALIZATION
        // =========================
        const requestedZone = shipping?.zone || shippingZone;

        if (!requestedZone) {
            throw new Error('Shipping zone is required');
        }

        if (!['Inside Dhaka', 'Outside Dhaka'].includes(requestedZone)) {
            throw new Error('Invalid shipping zone');
        }

        const normalizedShippingCost = requestedZone === 'Inside Dhaka' ? 80 : 120;

        let normalizedAddress = shipping?.address;

        if (!normalizedAddress && shippingAddress && typeof shippingAddress === 'object') {
            normalizedAddress = {
                fullName: shippingAddress.fullName || customer.fullName,
                phone: shippingAddress.phone || customer.phone,
                addressLine: shippingAddress.addressLine || shippingAddress.address,
                city: shippingAddress.city
            };
        }

        if (!normalizedAddress && typeof shippingAddress === 'string') {
            const parts = shippingAddress
                .split(',')
                .map(part => part.trim())
                .filter(Boolean);

            const city = parts.length > 1 ? parts[parts.length - 1] : 'Dhaka';
            const addressLine = parts.length > 1
                ? parts.slice(0, -1).join(', ')
                : parts[0];

            normalizedAddress = {
                fullName: customer.fullName,
                phone: customer.phone,
                addressLine,
                city
            };
        }

        if (
            !normalizedAddress?.fullName ||
            !normalizedAddress?.phone ||
            !normalizedAddress?.addressLine ||
            !normalizedAddress?.city
        ) {
            throw new Error(
                'Shipping address is incomplete. fullName, phone, addressLine and city are required.'
            );
        }

        // =========================
        // CUSTOMER / GUEST USER
        // =========================
        let orderCustomer = await User.findOne({
            email: customer.email,
            shop_id: shop._id,
            role: 'Customer'
        }).session(session);

        if (!orderCustomer) {
            const rawPassword = 'GuestUser_' + Math.random().toString(36).slice(-8);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(rawPassword, salt);

            const [newUser] = await User.create([{
                shop_id: shop._id,
                fullName: customer.fullName,
                email: customer.email,
                phone: customer.phone,
                role: 'Customer',
                password: hashedPassword
            }], { session });

            orderCustomer = newUser;
        }

        if (orderCustomer.status === 'Suspended') {
            throw new Error('This customer account is suspended.');
        }

        // =========================
        // SECURE ITEM PROCESSING
        // =========================
        const itemsWithSecurePrices = [];
        const promotionItems = [];
        const logsToInsert = [];

        let calculatedSubtotal = 0;

        for (const item of items) {
            const productId = item.productId || item.product;
            const quantity = Number(item.quantity);

            if (!productId) {
                throw new Error('Each item must include product or productId');
            }

            if (!Number.isFinite(quantity) || quantity <= 0) {
                throw new Error('Each item must include a valid quantity');
            }

            const product = await Product.findOne({
                _id: productId,
                shop_id: shop._id,
                isDeleted: false
            }).session(session);

            if (!product) {
                throw new Error('Product not found.');
            }

            if (!product.isActive || product.status !== 'Published') {
                throw new Error(`Product "${product.title}" is not available.`);
            }

            const variant = item.variantId
                ? product.variants.id(item.variantId)
                : product.variants.find(v => v.isActive && v.stock >= quantity)
                || product.variants.find(v => v.stock >= quantity)
                || product.variants.find(v => v.isActive)
                || product.variants[0];

            if (!variant) {
                throw new Error(`Variant not found for ${product.title}`);
            }

            if (!variant.isActive) {
                throw new Error(`Selected variant for ${product.title} is not available.`);
            }

            const stockUpdate = await decrementVariantStockAtomically({
                product,
                shopId: shop._id,
                variantId: variant._id,
                quantity,
                session
            });

            const beforeStock = stockUpdate.beforeStock;

            const variantPrice = variant.pricing?.price ?? variant.priceOverride;
            const basePrice = Number.isFinite(Number(variantPrice))
                ? Number(variantPrice)
                : Number(product.pricing?.sellingPrice);

            const discount = Number(product.pricing?.discount) || 0;

            const unitPrice = Math.round(
                basePrice - ((basePrice * discount) / 100)
            );

            const buyingPrice = Number(variant.pricing?.costPrice ?? product.pricing?.buyingPrice);
            const itemTotal = unitPrice * quantity;

            if (!Number.isFinite(unitPrice) || !Number.isFinite(itemTotal)) {
                throw new Error(`Invalid pricing data for ${product.title}`);
            }

            if (!Number.isFinite(buyingPrice)) {
                throw new Error(`Invalid buying price for ${product.title}`);
            }

            itemsWithSecurePrices.push({
                productId: product._id,
                variantId: variant._id,
                title: product.title,
                sku: variant.sku,
                attributes: variant.attributes,
                quantity,
                price: unitPrice,
                buyingPrice,
                total: itemTotal
            });

            promotionItems.push({
                productId: product._id,
                category: product.category,
                collections: product.collections || [],
                quantity,
                price: unitPrice,
                total: itemTotal
            });

            calculatedSubtotal += itemTotal;

            logsToInsert.push({
                shop_id: shop._id,
                productId: product._id,
                variantId: variant._id,
                change: -quantity,
                type: 'ORDER',
                beforeStock,
                afterStock: stockUpdate.afterStock,
                user: orderCustomer._id,
                note: 'Public Storefront Order'
            });
        }

        if (!Number.isFinite(calculatedSubtotal)) {
            throw new Error('Unable to calculate subtotal for this order');
        }

        // =========================
        // PROMOTION / COUPON
        // =========================
        let discountAmount = 0;
        let finalShippingCost = normalizedShippingCost;
        let promotionSnapshot = null;

        const cleanPromotionCode = promotionCode?.trim()?.toUpperCase();

        if (cleanPromotionCode) {
            const promotionResult = await evaluatePromotion({
                shopId: shop._id,
                code: cleanPromotionCode,
                subtotal: calculatedSubtotal,
                items: promotionItems,
                customerId: orderCustomer._id,
                customerEmail: customer.email,
                session
            });

            if (!promotionResult.valid) {
                throw new Error(promotionResult.error || 'Coupon is not valid');
            }

            discountAmount = promotionResult.discountAmount || 0;

            if (promotionResult.freeShipping) {
                finalShippingCost = 0;
            }

            promotionSnapshot = {
                code: promotionResult.promotion.code,
                type: promotionResult.promotion.type,
                discountAmount,
                freeShipping: Boolean(promotionResult.freeShipping)
            };
        }

        // =========================
        // FINAL TOTAL
        // =========================
        const totalAmount =
            Math.max(0, calculatedSubtotal - discountAmount) + finalShippingCost;

        // =========================
        // CREATE ORDER
        // =========================
        const [newOrder] = await Order.create([{
            shop_id: shop._id,
            customer: orderCustomer._id,
            items: itemsWithSecurePrices,
            pricing: {
                subtotal: calculatedSubtotal,
                discount: discountAmount,
                shipping: finalShippingCost,
                tax: 0,
                total: totalAmount
            },
            promotion: promotionSnapshot,
            shipping: {
                zone: requestedZone,
                cost: finalShippingCost,
                address: normalizedAddress
            },
            payment: {
                method: req.body.payment?.method || req.body.paymentMethod || 'COD',
                status: 'Pending'
            },
            status: 'Pending',
            source: source || 'storefront'
        }], { session });

        await ConsentLog.create([{
            shop_id: shop._id,
            customer_id: orderCustomer._id,
            order_id: newOrder._id,
            type: 'checkout_policy',
            version: consent.version || 'checkout_policy_v1',
            acceptedAt: new Date(),
            ip: req.ip || req.headers['x-forwarded-for'] || '',
            userAgent: req.headers['user-agent'] || ''
        }], { session });

        // =========================
        // PROMOTION USAGE COUNT
        // =========================
        if (promotionSnapshot?.code) {
            await Promotion.updateOne(
                {
                    shop_id: shop._id,
                    code: promotionSnapshot.code
                },
                {
                    $inc: { usageCount: 1 }
                }
            ).session(session);
        }

        // =========================
        // INVENTORY LOGS
        // =========================
        if (logsToInsert.length > 0) {
            const logsWithRef = logsToInsert.map(log => ({
                ...log,
                referenceId: newOrder._id
            }));

            await InventoryLog.insertMany(logsWithRef, { session });
        }

        await session.commitTransaction();

        notifyNewOrder({
            shop_id: shop._id,
            order: newOrder,
            customer: orderCustomer
        });

        return res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            orderId: newOrder._id,
            total: totalAmount,
            order: sanitizeOrderForCustomer(newOrder)
        });

    } catch (err) {
        await session.abortTransaction();

        console.error('Public Order Creation Error:', err);

        return res.status(err.statusCode || 400).json({
            success: false,
            error: err.message || 'Server error while placing order.',
            ...(err.code ? { code: err.code } : {})
        });

    } finally {
        session.endSession();
    }
};
exports.getPublicShopDetails = async (req, res) => {
    try {
        const { subdomain } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 16;
        const skip = (page - 1) * limit;

        const shop = await Shop.findOne({ subdomain })
            .select(PUBLIC_SHOP_FIELDS)
            .lean();
        if (!shop) return res.status(404).json({ error: "Shop not found" });

        const { category, minPrice, maxPrice, sort } = req.query; // ✨ ADDED 'sort'
        let query = {
            shop_id: shop._id,
            isDeleted: false,
            isActive: true,
            status: 'Published'
        };

        if (category && category !== 'All') query.category = category;

        if (minPrice || maxPrice) {
            query['pricing.sellingPrice'] = {}; // FIX: use dot notation for nested fields
            if (minPrice) query['pricing.sellingPrice'].$gte = Number(minPrice);
            if (maxPrice) query['pricing.sellingPrice'].$lte = Number(maxPrice);
        }

        let sortQuery = { createdAt: -1, _id: 1 };

        if (sort === 'priceAsc') sortQuery = { 'pricing.sellingPrice': 1, _id: 1 };
        else if (sort === 'priceDesc') sortQuery = { 'pricing.sellingPrice': -1, _id: 1 };
        else if (sort === 'nameAsc') sortQuery = { title: 1, _id: 1 };
        else if (sort === 'nameDesc') sortQuery = { title: -1, _id: 1 };

        const [products, totalProducts, categories] = await Promise.all([
            Product.aggregate([
                { $match: query },
                { $sort: sortQuery },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        title: 1,
                        slug: 1,
                        category: 1,
                        collections: 1,
                        images: { $slice: ['$images', 1] },
                        pricing: PUBLIC_PRODUCT_CARD_PROJECT.pricing,
                        averageRating: 1,
                        numReviews: 1,
                        totalStock: { $sum: '$variants.stock' },
                        variantCount: { $size: { $ifNull: ['$variants', []] } }
                    }
                }
            ]),
            Product.countDocuments(query),
            Product.distinct('category', {
                shop_id: shop._id,
                isDeleted: false,
                isActive: true,
                status: 'Published'
            })
        ]);
        const hasMore = totalProducts > (page * limit);

        res.status(200).json({ shop, products, hasMore, categories });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};


exports.getPublicProduct = async (req, res) => {
    try {
        const shop = await getPublicShopBySubdomain(req.query.subdomain);

        if (!shop) {
            return res.status(400).json({ error: "Valid shop subdomain is required." });
        }

        if (!isObjectId(req.params.id)) {
            return res.status(400).json({ error: "Invalid product ID format." });
        }

        const product = await Product.findOne({
            _id: req.params.id,
            shop_id: shop._id,
            isDeleted: false,
            isActive: true,
            status: 'Published'
        }).lean();

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.status(200).json(sanitizePublicProduct(product));
    } catch (err) {
        console.error("Error fetching single product:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// exports.getMyOrders = async (req, res) => {
//     try {
//         const customerId = req.user.id || req.user.userId;
//
//         // ✨ ADD THESE LOGS
//         console.log("🔍 Search requested by Customer ID:", customerId);
//
//         const orders = await Order.find({ customer: customerId })
//             .sort({ createdAt: -1 });
//
//         console.log(`📦 Found ${orders.length} orders for this ID.`);
//         res.status(200).json(orders);
//     } catch (err) {
//         console.error("Fetch Orders Error:", err);
//         res.status(500).json({ error: "Failed to fetch order history." });
//     }
// };

// Add this to your public controller
exports.trackPublicOrder = async (req, res) => {
    try {
        const orderLookup = String(req.params.orderId || '').trim().replace(/^#/, '');
        const phone = String(req.query.phone || '').trim();
        let shopId = req.tenantId;

        if (!orderLookup || !/^[0-9a-fA-F]{6,24}$/.test(orderLookup)) {
            return res.status(400).json({ error: "Invalid Order ID format." });
        }

        if (!phone) {
            return res.status(400).json({ error: "Phone number is required to track this order." });
        }

        if (!shopId) {
            const shop = await getPublicShopBySubdomain(req.query.subdomain);
            if (!shop) {
                return res.status(400).json({ error: "Valid shop subdomain is required." });
            }
            shopId = shop._id;
        }

        const orderQuery = buildPublicOrderQuery(orderLookup, shopId);

        const order = await Order.findOne(orderQuery)
            // Optional: Populating product titles/images makes the tracking page look better!
            .populate('items.productId', 'title images category')
            .select('items pricing payment shipping status cancellation timeline createdAt updatedAt')
            .lean();

        if (!order || !phonesMatch(order.shipping?.address?.phone, phone)) {
            return res.status(404).json({ error: "Order not found. Please check your ID." });
        }

        const [returnRequest, activeReturnRequest] = await Promise.all([
            ReturnRequest.findOne({
                shop_id: shopId,
                order_id: order._id,
                isDeleted: false
            }).sort({ createdAt: -1 }).lean(),
            ReturnRequest.findOne({
                shop_id: shopId,
                order_id: order._id,
                status: { $in: ACTIVE_RETURN_STATUSES },
                isDeleted: false
            }).sort({ createdAt: -1 }).lean()
        ]);

        const returnEligibility = buildReturnEligibility({ order, returnRequest: activeReturnRequest });

        res.status(200).json({
            _id: order._id,
            status: order.status,
            createdAt: order.createdAt,
            paymentMethod: order.payment?.method || '',
            paymentStatus: order.payment?.status || 'Pending',
            customerName: order.shipping?.address?.fullName || '',
            items: (order.items || []).map(item => {
                const clean = item && typeof item === 'object' ? { ...item } : item;
                if (clean && typeof clean === 'object') delete clean.buyingPrice;
                return clean;
            }),
            shippingAddress: order.shipping?.address || null,
            shippingZone: order.shipping?.zone,
            shippingCost: order.pricing?.shipping || order.shipping?.cost || 0,
            subtotal: order.pricing?.subtotal || 0,
            discount: order.pricing?.discount || 0,
            totalAmount: order.pricing?.total || 0,
            cancellation: order.cancellation || null,
            timeline: order.timeline || [],
            canCancel: order.status === 'Pending',
            cancelUnavailableReason: order.status === 'Pending'
                ? null
                : 'This order can only be cancelled while it is pending.',
            returnRequest: summarizeReturnRequest(returnRequest),
            returnEligibility
        });
    } catch (err) {
        console.error("Tracking Error:", err);
        res.status(500).json({ error: "Server error while tracking order." });
    }
};

exports.cancelTrackedOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const orderLookup = String(req.params.orderId || '').trim().replace(/^#/, '');
        const phone = String(req.body.phone || req.query.phone || '').trim();
        const reason = cleanText(req.body.reason || 'Customer requested cancellation', 160);
        const note = cleanText(req.body.note || '', 500);
        const shopId = req.tenantId;

        if (!orderLookup || !/^[0-9a-fA-F]{6,24}$/.test(orderLookup)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: 'Invalid Order ID format.' });
        }

        if (!phone) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: 'Phone number is required to cancel this order.' });
        }

        if (!reason) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: 'Cancellation reason is required.' });
        }

        const order = await Order.findOne(buildPublicOrderQuery(orderLookup, shopId)).session(session);

        if (!order || !phonesMatch(order.shipping?.address?.phone, phone)) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, error: 'Order not found. Please check your ID and phone number.' });
        }

        if (order.status !== 'Pending') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                code: 'ORDER_CANCEL_NOT_ALLOWED',
                message: 'This order can only be cancelled while it is pending.'
            });
        }

        const cancelledAt = new Date();
        const updatedOrder = await Order.findOneAndUpdate(
            {
                _id: order._id,
                shop_id: shopId,
                isDeleted: false,
                status: 'Pending'
            },
            {
                $set: {
                    status: 'Cancelled',
                    cancellation: {
                        cancelledBy: 'customer',
                        reason,
                        note,
                        cancelledAt
                    }
                },
                $push: {
                    timeline: {
                        type: 'order.cancelled',
                        actorType: 'customer',
                        message: 'Customer cancelled the order.',
                        reason,
                        createdAt: cancelledAt
                    }
                }
            },
            { new: true, session }
        );

        if (!updatedOrder) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                code: 'ORDER_CANCEL_NOT_ALLOWED',
                message: 'This order can only be cancelled while it is pending.'
            });
        }

        await restoreCancelledOrderInventory({
            order,
            shopId,
            userId: order.customer,
            session
        });

        await session.commitTransaction();

        await Promise.all([
            createNotification({
                shop_id: shopId,
                type: 'order',
                title: 'Order cancelled by customer',
                message: `Order #${String(order._id).slice(-6).toUpperCase()} was cancelled while pending.`,
                entityType: 'Order',
                entityId: order._id,
                severity: 'warning',
                metadata: { reason }
            }),
            logAudit({
                req,
                shop_id: shopId,
                action: 'order.cancelled_by_customer',
                entityType: 'Order',
                entityId: order._id,
                entityLabel: `Order #${String(order._id).slice(-6).toUpperCase()}`,
                severity: 'warning',
                before: { status: 'Pending' },
                after: { status: 'Cancelled', cancellation: updatedOrder.cancellation },
                metadata: { reason }
            })
        ]);

        const refundMessage = order.payment?.status === 'Paid'
            ? ' Your order was cancelled. Refund processing may take time.'
            : '';

        return res.status(200).json({
            success: true,
            message: `Order cancelled successfully.${refundMessage}`,
            data: {
                orderId: order._id,
                status: 'Cancelled',
                cancelledBy: 'customer',
                cancelledAt
            }
        });
    } catch (err) {
        await session.abortTransaction();
        console.error('Cancel tracked order error:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Failed to cancel order.'
        });
    } finally {
        session.endSession();
    }
};

exports.createTrackedReturnRequest = async (req, res) => {
    try {
        const orderLookup = String(req.params.orderId || '').trim().replace(/^#/, '');
        const phone = String(req.body.phone || req.query.phone || '').trim();
        const reason = cleanText(req.body.reason, 160);
        const customerNote = cleanText(req.body.description || req.body.customerNote || '', 1000);
        const shopId = req.tenantId;

        if (!orderLookup || !/^[0-9a-fA-F]{6,24}$/.test(orderLookup)) {
            return res.status(400).json({ success: false, error: 'Invalid Order ID format.' });
        }

        if (!phone) {
            return res.status(400).json({ success: false, error: 'Phone number is required to submit a return request.' });
        }

        if (!reason) {
            return res.status(400).json({ success: false, error: 'Return reason is required.' });
        }

        const order = await Order.findOne(buildPublicOrderQuery(orderLookup, shopId)).lean();

        if (!order || !phonesMatch(order.shipping?.address?.phone, phone)) {
            return res.status(404).json({ success: false, error: 'Order not found. Please check your ID and phone number.' });
        }

        const activeReturnRequest = await ReturnRequest.findOne({
            shop_id: shopId,
            order_id: order._id,
            status: { $in: ACTIVE_RETURN_STATUSES },
            isDeleted: false
        }).sort({ createdAt: -1 }).lean();

        const eligibility = buildReturnEligibility({ order, returnRequest: activeReturnRequest });
        if (!eligibility.canRequestReturn) {
            return res.status(400).json({
                success: false,
                code: 'RETURN_NOT_ALLOWED',
                message: eligibility.reason || 'Return request is not available for this order.'
            });
        }

        const returnItems = buildReturnItemsFromOrder(order, req.body.items);
        const refundAmount = returnItems.reduce((sum, item) => sum + (Number(item.refundAmount) || 0), 0);

        const request = await ReturnRequest.create({
            shop_id: shopId,
            order_id: order._id,
            customer_id: order.customer,
            items: returnItems,
            reason,
            customerNote,
            requestedBy: null,
            updatedBy: null,
            refund: {
                status: refundAmount > 0 ? 'Pending' : 'NotRequired',
                amount: refundAmount
            }
        });

        await Promise.all([
            createNotification({
                shop_id: shopId,
                type: 'return',
                title: 'New return request',
                message: `A customer submitted a return request for order #${String(order._id).slice(-6).toUpperCase()}.`,
                entityType: 'ReturnRequest',
                entityId: request._id,
                severity: 'warning',
                metadata: { orderId: order._id, reason }
            }),
            logAudit({
                req,
                shop_id: shopId,
                action: 'return.requested_by_customer',
                entityType: 'ReturnRequest',
                entityId: request._id,
                entityLabel: `Return for order #${String(order._id).slice(-6).toUpperCase()}`,
                after: { status: request.status, refund: request.refund },
                metadata: { reason }
            })
        ]);

        return res.status(201).json({
            success: true,
            message: 'Return request submitted successfully.',
            data: {
                returnRequestId: request._id,
                status: request.status
            }
        });
    } catch (err) {
        console.error('Create tracked return request error:', err);
        return res.status(400).json({
            success: false,
            error: err.message || 'Failed to submit return request.'
        });
    }
};
