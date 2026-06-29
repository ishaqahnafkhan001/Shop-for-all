const mongoose = require('mongoose');
const ReturnRequest = require('../models/ReturnRequest');
const Order = require('../models/Order');
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');
const { logAudit } = require('../services/auditLogService');
const { createNotification } = require('../services/notificationService');
const { buildPagination } = require('../utils/pagination');
const {
    parseMaybeJson,
    buildProofFromFiles
} = require('../services/returns/returnProofService');

const VALID_TRANSITIONS = {
    Requested: ['Approved', 'Rejected', 'Cancelled'],
    Approved: ['Received', 'Rejected', 'Cancelled'],
    Received: ['Refunded', 'Closed'],
    Refunded: ['Closed'],
    Rejected: ['Closed'],
    Cancelled: [],
    Closed: []
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const toMoney = (value) => Math.max(0, Number(value) || 0);

const restoreReturnedInventory = async ({ request, shopId, userId, session }) => {
    if (request.inventoryRestoredAt) {
        return { restored: false, logs: [] };
    }

    const order = await Order.findOne({
        _id: request.order_id,
        shop_id: shopId,
        isDeleted: false
    }).session(session);

    if (!order) throw new Error('Order not found while restoring returned stock.');

    const logs = [];

    for (const item of request.items || []) {
        const product = await Product.findOne({
            _id: item.productId,
            shop_id: shopId,
            isDeleted: false
        }).session(session);

        if (!product) {
            throw new Error(`Product not found while restoring return item: ${item.title}`);
        }

        const variant = product.variants.id(item.variantId);
        if (!variant) {
            throw new Error(`Variant not found while restoring return item: ${item.title}`);
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
            type: 'RETURN',
            referenceId: order._id,
            beforeStock,
            afterStock: variant.stock,
            user: userId,
            note: `Refunded return ${String(request._id).slice(-6).toUpperCase()} — stock restored`
        });
    }

    if (logs.length > 0) {
        await InventoryLog.insertMany(logs, { session });
    }

    order.status = 'Returned';
    if (order.payment) order.payment.status = 'Refunded';
    await order.save({ session });

    request.inventoryRestoredAt = new Date();
    request.inventoryRestoredBy = userId;

    return { restored: true, logs };
};

const buildReturnItems = (order, submittedItems = []) => {
    const requested = Array.isArray(submittedItems) && submittedItems.length > 0
        ? submittedItems
        : order.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity
        }));

    return requested.map(requestedItem => {
        const orderItem = order.items.find(item => (
            String(item.productId) === String(requestedItem.productId) &&
            (!requestedItem.variantId || String(item.variantId) === String(requestedItem.variantId))
        ));

        if (!orderItem) {
            throw new Error('Return item does not belong to this order.');
        }

        const quantity = Number(requestedItem.quantity);
        if (!Number.isFinite(quantity) || quantity < 1 || quantity > orderItem.quantity) {
            throw new Error(`Invalid return quantity for ${orderItem.title}.`);
        }

        return {
            productId: orderItem.productId,
            variantId: orderItem.variantId,
            title: orderItem.title,
            sku: orderItem.sku || '',
            quantity,
            refundAmount: toMoney(requestedItem.refundAmount ?? orderItem.price * quantity)
        };
    });
};

exports.getReturns = async (req, res) => {
    try {
        const shopId = req.tenantId;
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);
        const skip = (page - 1) * limit;
        const query = { shop_id: shopId, isDeleted: false };

        if (req.query.status && req.query.status !== 'All') query.status = req.query.status;
        if (req.query.orderId && isObjectId(req.query.orderId)) query.order_id = req.query.orderId;

        const [returns, total] = await Promise.all([
            ReturnRequest.find(query)
                .populate('order_id', 'status pricing.total createdAt')
                .populate('customer_id', 'fullName email phone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ReturnRequest.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: returns,
            pagination: buildPagination({ total, page, limit })
        });
    } catch (err) {
        console.error('Get returns error:', err);
        res.status(500).json({ success: false, error: 'Failed to load return requests' });
    }
};

exports.getReturnById = async (req, res) => {
    try {
        const request = await ReturnRequest.findOne({
            _id: req.params.id,
            shop_id: req.tenantId,
            isDeleted: false
        })
            .populate('order_id')
            .populate('customer_id', 'fullName email phone')
            .lean();

        if (!request) {
            return res.status(404).json({ success: false, error: 'Return request not found' });
        }

        res.status(200).json({ success: true, data: request });
    } catch (err) {
        console.error('Get return detail error:', err);
        res.status(500).json({ success: false, error: 'Failed to load return request' });
    }
};

exports.createReturn = async (req, res) => {
    try {
        const shopId = req.tenantId;
        const { orderId, reason, customerNote } = req.body;
        const items = parseMaybeJson(req.body.items, req.body.items);
        const proof = buildProofFromFiles(req.files || {});

        if (!orderId || !reason) {
            return res.status(400).json({ success: false, error: 'Order and reason are required' });
        }

        const order = await Order.findOne({
            _id: orderId,
            shop_id: shopId,
            isDeleted: false
        }).lean();

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        const returnItems = buildReturnItems(order, items);
        const refundAmount = returnItems.reduce((sum, item) => sum + toMoney(item.refundAmount), 0);

        const request = await ReturnRequest.create({
            shop_id: shopId,
            order_id: order._id,
            customer_id: order.customer,
            items: returnItems,
            reason,
            customerNote: customerNote || '',
            proof,
            requestedBy: req.user?._id,
            updatedBy: req.user?._id,
            refund: {
                status: refundAmount > 0 ? 'Pending' : 'NotRequired',
                amount: refundAmount
            }
        });

        await Promise.all([
            logAudit({
                req,
                shop_id: shopId,
                action: 'return.created',
                entityType: 'ReturnRequest',
                entityId: request._id,
                entityLabel: `Return for order #${String(order._id).slice(-6).toUpperCase()}`,
                after: { status: request.status, refund: request.refund }
            }),
            createNotification({
                shop_id: shopId,
                type: 'return',
                title: 'Return request created',
                message: `A return was created for order #${String(order._id).slice(-6).toUpperCase()}.`,
                entityType: 'ReturnRequest',
                entityId: request._id,
                severity: 'warning'
            })
        ]);

        res.status(201).json({
            success: true,
            message: 'Return request created',
            data: request
        });
    } catch (err) {
        console.error('Create return error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to create return request' });
    }
};

exports.updateReturnStatus = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { status, note } = req.body;
        const request = await ReturnRequest.findOne({
            _id: req.params.id,
            shop_id: req.tenantId,
            isDeleted: false
        }).session(session);

        if (!request) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, error: 'Return request not found' });
        }

        if (!VALID_TRANSITIONS[request.status]?.includes(status)) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                error: `Cannot change return from ${request.status} to ${status}`
            });
        }

        const before = { status: request.status, internalNote: request.internalNote };
        request.status = status;
        if (note !== undefined) request.internalNote = note;
        request.updatedBy = req.user?._id;

        let restored = false;
        if (status === 'Refunded') {
            request.refund = {
                ...(request.refund?.toObject ? request.refund.toObject() : request.refund || {}),
                status: 'Refunded',
                refundedAt: request.refund?.refundedAt || new Date(),
                updatedBy: req.user?._id
            };
            const restoreResult = await restoreReturnedInventory({
                request,
                shopId: req.tenantId,
                userId: req.user?._id,
                session
            });
            restored = restoreResult.restored;
        }

        await request.save({ session });
        await session.commitTransaction();

        await Promise.all([
            logAudit({
                req,
                shop_id: req.tenantId,
                action: 'return.status_updated',
                entityType: 'ReturnRequest',
                entityId: request._id,
                entityLabel: `Return #${String(request._id).slice(-6).toUpperCase()}`,
                before,
                after: {
                    status: request.status,
                    internalNote: request.internalNote,
                    inventoryRestored: restored
                }
            }),
            createNotification({
                shop_id: req.tenantId,
                type: 'return',
                title: 'Return status updated',
                message: `Return #${String(request._id).slice(-6).toUpperCase()} is now ${request.status}.`,
                entityType: 'ReturnRequest',
                entityId: request._id,
                severity: request.status === 'Rejected' ? 'warning' : 'info'
            })
        ]);

        res.status(200).json({ success: true, message: 'Return status updated', data: request });
    } catch (err) {
        await session.abortTransaction();
        console.error('Update return status error:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to update return status' });
    } finally {
        session.endSession();
    }
};

exports.updateReturnRefund = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { status, amount, method, reference, note } = req.body;
        const request = await ReturnRequest.findOne({
            _id: req.params.id,
            shop_id: req.tenantId,
            isDeleted: false
        }).session(session);

        if (!request) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, error: 'Return request not found' });
        }

        const before = { refund: request.refund?.toObject ? request.refund.toObject() : request.refund };
        request.refund = {
            ...(request.refund?.toObject ? request.refund.toObject() : request.refund || {}),
            status: status || request.refund?.status || 'Pending',
            amount: amount !== undefined ? toMoney(amount) : toMoney(request.refund?.amount),
            method: method !== undefined ? method : request.refund?.method || '',
            reference: reference !== undefined ? reference : request.refund?.reference || '',
            note: note !== undefined ? note : request.refund?.note || '',
            refundedAt: status === 'Refunded' ? new Date() : request.refund?.refundedAt || null,
            updatedBy: req.user?._id
        };

        let restored = false;
        if (request.refund.status === 'Refunded') {
            request.status = 'Refunded';
            const restoreResult = await restoreReturnedInventory({
                request,
                shopId: req.tenantId,
                userId: req.user?._id,
                session
            });
            restored = restoreResult.restored;
        }

        request.updatedBy = req.user?._id;
        await request.save({ session });
        await session.commitTransaction();

        await Promise.all([
            logAudit({
                req,
                shop_id: req.tenantId,
                action: 'return.refund_updated',
                entityType: 'ReturnRequest',
                entityId: request._id,
                entityLabel: `Return #${String(request._id).slice(-6).toUpperCase()}`,
                severity: request.refund.status === 'Refunded' ? 'warning' : 'info',
                before,
                after: {
                    refund: request.refund,
                    status: request.status,
                    inventoryRestored: restored
                }
            }),
            createNotification({
                shop_id: req.tenantId,
                type: 'refund',
                title: 'Refund updated',
                message: `Refund for return #${String(request._id).slice(-6).toUpperCase()} is ${request.refund.status}.`,
                entityType: 'ReturnRequest',
                entityId: request._id,
                severity: request.refund.status === 'Refunded' ? 'success' : 'info'
            })
        ]);

        res.status(200).json({ success: true, message: 'Refund updated', data: request });
    } catch (err) {
        await session.abortTransaction();
        console.error('Update return refund error:', err);
        res.status(500).json({ success: false, error: err.message || 'Failed to update refund details' });
    } finally {
        session.endSession();
    }
};

exports.updateReturn = async (req, res) => {
    try {
        const updates = {};
        for (const key of ['reason', 'customerNote', 'internalNote', 'resolution']) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }
        updates.updatedBy = req.user?._id;

        const request = await ReturnRequest.findOneAndUpdate(
            { _id: req.params.id, shop_id: req.tenantId, isDeleted: false },
            updates,
            { new: true }
        );

        if (!request) {
            return res.status(404).json({ success: false, error: 'Return request not found' });
        }

        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'return.updated',
            entityType: 'ReturnRequest',
            entityId: request._id,
            entityLabel: `Return #${String(request._id).slice(-6).toUpperCase()}`,
            after: updates
        });

        res.status(200).json({ success: true, message: 'Return request updated', data: request });
    } catch (err) {
        console.error('Update return error:', err);
        res.status(500).json({ success: false, error: 'Failed to update return request' });
    }
};

exports.deleteReturns = async (req, res) => {
    try {
        const ids = Array.isArray(req.body?.ids)
            ? req.body.ids
            : [req.body?.id || req.query?.id].filter(Boolean);

        if (ids.length === 0) {
            return res.status(400).json({ success: false, error: 'At least one return ID is required' });
        }

        const result = await ReturnRequest.updateMany(
            {
                _id: { $in: ids },
                shop_id: req.tenantId,
                status: 'Requested',
                isDeleted: false
            },
            {
                $set: {
                    isDeleted: true,
                    updatedBy: req.user?._id
                }
            }
        );

        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'return.deleted',
            entityType: 'ReturnRequest',
            entityLabel: 'Return requests',
            severity: 'warning',
            metadata: { ids, deletedCount: result.modifiedCount }
        });

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} return request(s) deleted`,
            data: { deletedCount: result.modifiedCount }
        });
    } catch (err) {
        console.error('Delete returns error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete return request' });
    }
};
