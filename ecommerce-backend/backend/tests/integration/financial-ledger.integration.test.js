const assert = require('node:assert/strict');
const test = require('node:test');
const { createLaunchSafetyContext, createProduct, Order, Product } = require('../helpers/launchSafetyHarness');
const ReturnRequest = require('../../models/ReturnRequest');
const FinancialFact = require('../../models/FinancialFact');
const InventoryLog = require('../../models/InventoryLog');
const { getSalesReport } = require('../../services/orders/salesReportService');

async function setup(t, quantity = 2) {
    const ctx = await createLaunchSafetyContext(t);
    await FinancialFact.createIndexes();
    const { shopA } = ctx.data.shops, { orderA } = ctx.data.orders, { productA } = ctx.data.products;
    const line = { productId: productA.product._id, variantId: productA.variant._id, title: 'Ledger item', quantity, price: 100, total: 100 * quantity, buyingPrice: 40, couponDiscount: 0 };
    await Order.updateOne({ _id: orderA._id }, { $set: { status: 'Shipped', items: [line], pricing: { subtotal: 100 * quantity, discount: 0, shipping: 80, tax: 10, total: 100 * quantity + 90 } } });
    const vendor = ctx.vendorAClient();
    const deliver = () => vendor.unsafePatch(`/api/admin/orders/${orderA._id}/status`, { status: 'Delivered' });
    const createReturn = (items = [line]) => ReturnRequest.create({ shop_id: shopA._id, order_id: orderA._id, customer_id: orderA.customer,
        status: 'Approved', reason: 'Returned goods', items: items.map(item => ({ ...item, refundAmount: item.quantity * 100 })), refund: { amount: items.reduce((sum, item) => sum + item.quantity * 100, 0) } });
    const receive = (request, quantity = 0, note = 'Damaged packaging') => vendor.unsafePatch(`/api/admin/returns/${request._id}/status`, { status: 'Received', receiptItems: request.items.map(item => ({ productId: item.productId, variantId: item.variantId, restockQuantity: quantity, dispositionNote: note })) });
    const refund = (request, fields = {}) => vendor.unsafePatch(`/api/admin/returns/${request._id}/refund`, { status: 'Refunded', amount: request.refund.amount, ...fields });
    const report = (bounds = {}) => getSalesReport({ tenantId: shopA._id, ...bounds });
    const stock = async () => (await Product.findById(productA.product._id)).variants.id(productA.variant._id).stock;
    return { ctx, shopA, orderA, productA, line, vendor, deliver, createReturn, receive, refund, report, stock };
}
const ok = result => assert.equal(result.status, 200, JSON.stringify(result.body));

test('delivery is atomic, idempotent and append-only; mutable order/catalog cannot rewrite recorded totals', async t => {
    const f = await setup(t);
    const originalCreate = FinancialFact.create;
    FinancialFact.create = async () => { throw new Error('Injected ledger failure'); };
    try { assert.equal((await f.deliver()).status, 500); } finally { FinancialFact.create = originalCreate; }
    assert.equal((await Order.findById(f.orderA._id)).status, 'Shipped');
    assert.equal(await FinancialFact.countDocuments(), 0);
    const results = await Promise.all([f.deliver(), f.deliver()]); results.forEach(ok);
    assert.equal(await FinancialFact.countDocuments({ kind: 'delivery' }), 1);
    const fact = await FinancialFact.findOne({ kind: 'delivery' });
    assert.equal(String((await Order.findById(f.orderA._id)).deliveryFactId), String(fact._id));
    await assert.rejects(FinancialFact.updateOne({ _id: fact._id }, { $set: { 'snapshot.pricing.total': 0 } }), /append-only/);
    await assert.rejects(fact.deleteOne(), /append-only/);
    await assert.rejects(FinancialFact.bulkWrite([{ deleteOne: { filter: { _id: fact._id } } }]), /append-only/);
    fact.snapshot = {}; await assert.rejects(fact.save(), /append-only/);
    await Order.updateOne({ _id: f.orderA._id }, { $set: { items: [], 'pricing.total': 0, status: 'Cancelled', 'shipping.deliveredAt': null } });
    await Product.deleteOne({ _id: f.productA.product._id });
    const report = await f.report();
    assert.equal(report.summary.orders, 1); assert.equal(report.summary.revenue, 200); assert.equal(report.summary.profit, 120);
    assert.equal(report.meta.metricVersion, 'commerce-v2');
    assert.equal((await getSalesReport({ tenantId: f.ctx.data.shops.shopB._id })).summary.orders, 0);
});

test('receipt restores only sellable units; later refund changes revenue without repeating stock or cost', async t => {
    const f = await setup(t); ok(await f.deliver());
    const request = await f.createReturn(), initialStock = await f.stock();
    assert.equal((await f.refund(request)).status, 400, 'no settlement before receipt');
    assert.equal((await f.receive(request, 1, '')).status, 400, 'unsellable units need a disposition');
    assert.equal(await FinancialFact.countDocuments({ kind: 'restock' }), 0);
    ok(await f.receive(request, 1));
    assert.equal(await f.stock(), initialStock + 1);
    assert.equal((await f.report()).summary.cost, 40);
    assert.equal((await f.report()).summary.revenue, 200);
    assert.equal((await f.receive(request, 1)).status, 400);
    const receipt = await ReturnRequest.findById(request._id);
    const afterReceipt = new Date(+receipt.receivedAt + 1);
    await new Promise(resolve => setTimeout(resolve, 5));
    ok(await f.refund(request, { amount: 290, shippingAmount: 80, taxAmount: 10, note: 'Private payment note', reference: 'Private transfer reference' }));
    assert.equal(await f.stock(), initialStock + 1);
    const later = await f.report({ from: afterReceipt });
    assert.equal(later.summary.revenue, -200); assert.equal(later.summary.cost, 0);
    assert.equal(later.summary.shippingRefunds, 80); assert.equal(later.summary.taxRefunds, 10);
    const all = await f.report();
    assert.equal(all.summary.revenue, 0); assert.equal(all.summary.profit, -40);
    assert.equal((await Order.findById(f.orderA._id)).payment.status, 'Refunded');
    assert.equal((await f.refund(request)).status, 409);
    assert.equal(await FinancialFact.countDocuments({ kind: 'refund' }), 1);
    assert.equal(await InventoryLog.countDocuments({ type: 'RETURN' }), 1);
    const snapshot = (await FinancialFact.findOne({ kind: 'refund' })).snapshot;
    assert.equal(snapshot.refund.note, undefined); assert.equal(snapshot.refund.reference, undefined);
    await ReturnRequest.deleteOne({ _id: request._id });
    await Order.deleteOne({ _id: f.orderA._id });
    assert.equal((await f.report()).summary.profit, -40, 'facts survive removal of operational rows');
});

test('deleted catalog supports zero-restock receipt and component caps cannot be bypassed', async t => {
    const f = await setup(t); ok(await f.deliver()); const request = await f.createReturn();
    await Product.deleteOne({ _id: f.productA.product._id });
    assert.equal((await f.receive(request, 2)).status, 400);
    assert.equal((await ReturnRequest.findById(request._id)).receivedAt, undefined);
    ok(await f.receive(request, 0, 'Catalog variant removed'));
    assert.equal((await f.refund(request, { amount: 290, shippingAmount: 81, taxAmount: 9 })).status, 400);
    assert.equal((await f.refund(request, { amount: 290, shippingAmount: 79, taxAmount: 11 })).status, 400);
    assert.equal((await f.refund(request, { amount: 90, shippingAmount: 80, taxAmount: 11 })).status, 400);
    assert.equal((await f.refund(request, { amount: 291, shippingAmount: 80, taxAmount: 10 })).status, 400);
    assert.equal(await FinancialFact.countDocuments({ kind: 'refund' }), 0);
    ok(await f.refund(request, { amount: 290, shippingAmount: 80, taxAmount: 10 }));
    assert.equal((await f.report()).summary.profit, -80);
});

test('receipt rollback is atomic and concurrent returns cannot exceed delivered units', async t => {
    const f = await setup(t, 1); ok(await f.deliver());
    const a = await f.createReturn(), b = await f.createReturn(), initialStock = await f.stock();
    const originalCreate = FinancialFact.create;
    FinancialFact.create = async () => { throw new Error('Injected receipt failure'); };
    try { assert.equal((await f.receive(a, 1)).status, 400); } finally { FinancialFact.create = originalCreate; }
    assert.equal(await f.stock(), initialStock);
    assert.equal((await ReturnRequest.findById(a._id)).receivedAt, undefined);
    assert.equal(await InventoryLog.countDocuments({ type: 'RETURN' }), 0);
    const results = await Promise.all([f.receive(a, 1), f.receive(b, 1)]);
    assert.equal(results.filter(row => row.status === 200).length, 1);
    const loser = results[0].status === 200 ? b : a;
    assert.equal((await f.receive(loser, 1)).status, 400);
    assert.equal(await f.stock(), initialStock + 1);
    assert.equal(await FinancialFact.countDocuments({ kind: 'restock' }), 1);
    const foreign = await f.ctx.vendorBClient().unsafePatch(`/api/admin/returns/${loser._id}/status`, { status: 'Received', receiptItems: [{ ...f.line, restockQuantity: 1 }] });
    assert.equal(foreign.status, 404);
});

test('failed multi-product receipt rolls back the first stock write when a later variant is absent', async t => {
    const f = await setup(t, 1);
    const extra = await createProduct({ shop: f.shopA, title: 'Missing variant', slug: 'missing-variant', sellingPrice: 100, buyingPrice: 40, stock: 4 });
    const second = { ...f.line, productId: extra.product._id, variantId: extra.variant._id };
    await Order.updateOne({ _id: f.orderA._id }, { $set: { items: [f.line, second], 'pricing.subtotal': 200, 'pricing.total': 290 } });
    ok(await f.deliver()); const request = await f.createReturn([f.line, second]);
    const before = await f.stock(); await Product.deleteOne({ _id: extra.product._id });
    assert.equal((await f.receive(request, 1)).status, 400);
    assert.equal(await f.stock(), before);
    assert.equal(await InventoryLog.countDocuments({ type: 'RETURN' }), 0);
    assert.equal(await FinancialFact.countDocuments({ kind: 'restock' }), 0);
});
