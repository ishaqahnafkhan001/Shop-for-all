const Order = require('../../models/Order');
const Product = require('../../models/Product');
const ReturnRequest = require('../../models/ReturnRequest');
const InventoryLog = require('../../models/InventoryLog');
const { allocate, minor, money, orderAmounts } = require('../orders/reportingMetrics');
const { ensureDeliveryFact, recordRefundFact, recordRestockFact } = require('../orders/financialFactService');
const key = item => `${item.productId}:${item.variantId || ''}`;
const invalid = message => Object.assign(new Error(message), { statusCode: 400 });
const loadOrder = async (request, shopId, session) => {
    const order = await Order.findOne({ _id: request.order_id, shop_id: shopId }).session(session);
    if (!order) throw invalid('Original order record is unavailable. Review its financial history before proceeding.');
    if (!order.shipping?.deliveredAt && !order.deliveryFactId) throw invalid('Confirm the original delivery date before processing this return.');
    return order;
};
const validateQuantities = (originals, items) => {
    const quantities = new Map();
    for (const item of items) {
        if (!Number.isInteger(item.quantity) || item.quantity < 1) throw invalid('Return quantities must be positive whole units.');
        quantities.set(key(item), (quantities.get(key(item)) || 0) + item.quantity);
    }
    for (const [id, quantity] of quantities) {
        const original = originals.find(item => key(item) === id);
        if (!original || quantity > original.quantity) throw invalid('Returned quantity exceeds the remaining quantity on this order.');
    }
    return quantities;
};
const receiveReturnInventory = async ({ request, receiptItems, shopId, userId, session }) => {
    if (request.receivedAt || request.inventoryRestoredAt) throw invalid('Receipt is already recorded and cannot be restocked twice.');
    if (!['Approved', 'Received'].includes(request.status)) throw invalid('Approve this return before recording receipt.');
    if (!Array.isArray(receiptItems) || receiptItems.length !== request.items.length) throw invalid('Specify the sellable quantity for every return item.');
    const decisions = new Map(receiptItems.map(item => [key(item), item]));
    if (decisions.size !== request.items.length) throw invalid('Receipt items must be unique.');
    const order = await loadOrder(request, shopId, session);
    const delivery = await ensureDeliveryFact(order, session);
    const previous = await ReturnRequest.find({ shop_id: shopId, order_id: order._id, _id: { $ne: request._id },
        $or: [{ receivedAt: { $ne: null } }, { inventoryRestoredAt: { $ne: null } }] }).session(session).lean();
    const quantities = validateQuantities(delivery.snapshot.items, [...previous.flatMap(row => row.items), ...request.items]);
    const logs = [];
    for (const item of request.items) {
        const decision = decisions.get(key(item));
        const quantity = decision?.restockQuantity;
        if (!Number.isInteger(quantity) || quantity < 0 || quantity > item.quantity) throw invalid('Sellable quantity must be a whole number between zero and the received quantity.');
        const note = String(decision.dispositionNote || '').trim().slice(0, 300);
        if (quantity < item.quantity && note.length < 3) throw invalid('Explain why the remaining units cannot be restocked.');
        item.restockQuantity = quantity; item.dispositionNote = note;
        if (!quantity) continue;
        const product = await Product.findOne({ _id: item.productId, shop_id: shopId, isDeleted: false }).session(session);
        const variant = product?.variants.id(item.variantId);
        if (!variant) throw invalid(`Cannot restock ${item.title}: its catalog variant is unavailable. Record zero sellable units and a reason to continue with its refund.`);
        const beforeStock = Number(variant.stock || 0);
        variant.stock = beforeStock + quantity;
        if (variant.inventory) variant.inventory.stock = variant.stock;
        await product.save({ session });
        logs.push({ shop_id: shopId, productId: item.productId, variantId: item.variantId, change: quantity,
            type: 'RETURN', referenceId: order._id, beforeStock, afterStock: variant.stock, user: userId,
            note: `Return ${request._id}: sellable units received` });
    }
    if (logs.length) await InventoryLog.insertMany(logs, { session });
    request.receivedAt = new Date(); request.receiptRecordedBy = userId; request.status = 'Received';
    if (logs.length) { request.inventoryRestoredAt = request.receivedAt; request.inventoryRestoredBy = userId; }
    await recordRestockFact({ order, request, session });
    if (delivery.snapshot.items.every(item => (quantities.get(key(item)) || 0) >= item.quantity)) order.status = 'Returned';
    order.refundRevision = Number(order.refundRevision || 0) + 1;
    await order.save({ session });
    return { restored: logs.length > 0, logs };
};
const settleReturnRefund = async ({ request, shopId, session }) => {
    if (!request.receivedAt && !request.inventoryRestoredAt) throw invalid('Record receipt and sellable quantities before completing the refund.');
    const order = await loadOrder(request, shopId, session);
    const delivery = await ensureDeliveryFact(order, session);
    const previous = await ReturnRequest.find({ shop_id: shopId, order_id: order._id, _id: { $ne: request._id }, 'refund.status': 'Refunded' }).session(session).lean();
    const previousItems = previous.flatMap(row => row.items);
    const quantities = validateQuantities(delivery.snapshot.items, [...previousItems, ...request.items]);
    const amount = minor(request.refund.amount), shipping = minor(request.refund.shippingAmount), tax = minor(request.refund.taxAmount);
    const productAmount = amount - shipping - tax;
    const priorTotal = previous.reduce((sum, row) => sum + minor(row.refund.amount), 0);
    if (productAmount < 0 || priorTotal + amount > minor(delivery.snapshot.pricing.total)) throw invalid('Refund exceeds the remaining paid order value.');
    for (const [component, paid] of [['shippingAmount', 'shipping'], ['taxAmount', 'tax']]) {
        const already = previous.reduce((sum, row) => sum + minor(row.refund[component]), 0);
        if (already + minor(request.refund[component]) > minor(delivery.snapshot.pricing[paid])) throw invalid(`${paid === 'shipping' ? 'Delivery' : 'Tax'} refund exceeds the original charge remaining.`);
    }
    const shares = allocate(productAmount, request.items.map(item => minor(item.refundAmount)));
    if (shares.reduce((sum, value) => sum + value, 0) !== productAmount) throw invalid('Refund requires a product allocation.');
    const originals = orderAmounts(delivery.snapshot);
    request.items.forEach((item, index) => {
        const original = originals.find(line => key(line) === key(item));
        const already = previousItems.filter(line => key(line) === key(item)).reduce((sum, line) => sum + minor(line.refundAmount), 0);
        const current = request.items.reduce((sum, line, position) => key(line) === key(item) ? sum + shares[position] : sum, 0);
        if (already + current > Math.floor(original.net * quantities.get(key(item)) / original.quantity)) throw invalid('Product refund exceeds the returned items’ paid value after coupons.');
        item.refundAmount = money(shares[index]);
    });
    await recordRefundFact({ order, request, session });
    if (order.payment && priorTotal + amount >= minor(delivery.snapshot.pricing.total)) order.payment.status = 'Refunded';
    order.refundRevision = Number(order.refundRevision || 0) + 1;
    await order.save({ session });
    return { restored: false, logs: [] };
};
module.exports = { receiveReturnInventory, settleReturnRefund };
