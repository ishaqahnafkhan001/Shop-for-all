const FinancialFact = require('../../models/FinancialFact');
const { orderAmounts, money } = require('./reportingMetrics');
const financialItems = items => items.map(item => Object.fromEntries(['productId', 'variantId', 'title', 'quantity', 'price', 'buyingPrice', 'total', 'couponDiscount', 'refundAmount'].filter(field => item[field] !== undefined).map(field => [field, item[field]])));
const plain = value => JSON.parse(JSON.stringify(value));
const requireTransaction = session => { if (!session?.inTransaction()) throw new Error('Financial facts require an active transaction.'); };
const append = async ({ shopId, orderId, returnId, kind, occurredAt, snapshot, session }) => {
    requireTransaction(session);
    const key = `${kind}:${returnId || orderId}`;
    const existing = await FinancialFact.findOne({ shop_id: shopId, key }).session(session);
    if (existing) return existing;
    const [fact] = await FinancialFact.create([{ shop_id: shopId, order_id: orderId, return_id: returnId,
        kind, key, occurredAt, snapshot: plain(snapshot) }], { session });
    return fact;
};
const ensureDeliveryFact = async (order, session, evidenceSource = 'existing_delivery_record') => {
    requireTransaction(session);
    const existing = await FinancialFact.findOne({ shop_id: order.shop_id, key: `delivery:${order._id}` }).session(session);
    if (existing) { order.deliveryFactId = existing._id; return existing; }
    if (!order.shipping?.deliveredAt) throw new Error('Recorded delivery evidence is required.');
    const fact = await append({ shopId: order.shop_id, orderId: order._id, kind: 'delivery', occurredAt: order.shipping.deliveredAt,
        snapshot: { evidenceSource, items: financialItems(order.items), pricing: order.pricing, source: order.source, customer: order.customer?._id || order.customer,
            shipping: { deliveredAt: order.shipping.deliveredAt }, legacyCouponAllocation: Number(order.pricing?.discount) > 0 && !order.items.every(item => Number.isFinite(item.couponDiscount)) }, session });
    order.deliveryFactId = fact._id;
    return fact;
};
const recordRefundFact = async ({ order, request, session }) => {
    const delivery = await ensureDeliveryFact(order, session);
    const fact = await append({ shopId: order.shop_id, orderId: order._id, returnId: request._id,
        kind: 'refund', occurredAt: request.refund.refundedAt,
        snapshot: { items: financialItems(request.items), refund: { amount: request.refund.amount, shippingAmount: request.refund.shippingAmount, taxAmount: request.refund.taxAmount, refundedAt: request.refund.refundedAt }, originalItems: delivery.snapshot.items,
            source: delivery.snapshot.source, deliveryAt: delivery.occurredAt,
            // Legacy completed returns reversed cost on settlement; retain that convention only for historical records.
            inventoryRestoredAt: !request.receivedAt ? request.inventoryRestoredAt : null }, session });
    request.refund.financialFactId = fact._id;
    return fact;
};
const recordRestockFact = async ({ order, request, session }) => {
    const delivery = await ensureDeliveryFact(order, session);
    const lines = orderAmounts(delivery.snapshot);
    const items = request.items.filter(item => item.restockQuantity > 0).map(item => {
        const original = lines.find(line => line.productId === String(item.productId) && line.variantId === String(item.variantId || ''));
        return { productId: item.productId, variantId: item.variantId, title: item.title,
            quantity: item.restockQuantity, buyingPrice: original?.costKnown ? money(original.cost) / original.quantity : null };
    });
    const fact = await append({ shopId: order.shop_id, orderId: order._id, returnId: request._id,
        kind: 'restock', occurredAt: request.receivedAt, snapshot: { items, receivedItems: request.items.map(item => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity, restockQuantity: item.restockQuantity })), source: delivery.snapshot.source }, session });
    request.receiptFactId = fact._id;
    return fact;
};
module.exports = { ensureDeliveryFact, recordRefundFact, recordRestockFact };
