const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const { createLaunchSafetyContext, createProduct, Order, Product, Shop, Promotion, addCheckoutProof, makeCheckoutPayload } = require('../helpers/launchSafetyHarness');
const ReturnRequest = require('../../models/ReturnRequest');
const { getSalesReport } = require('../../services/orders/salesReportService');
const { getDashboardOverviewResponse, getLowStockRows } = require('../../services/orders/orderAnalyticsService');
const { reportInterval } = require('../../services/orders/reportingMetrics');

test('Overview, Analytics and Growth reconcile delivered lines, coupons, refunds and archived history', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA, shopB } = ctx.data.shops;
    const { orderA } = ctx.data.orders;
    const { productA } = ctx.data.products;
    const secondVariant = new mongoose.Types.ObjectId();
    const deliveredAt = new Date(Date.now() - 3600000);
    await Order.updateOne({ _id: orderA._id }, { $set: {
        status: 'Delivered', 'shipping.deliveredAt': deliveredAt,
        items: [
            { productId: productA.product._id, variantId: productA.variant._id, title: 'First variant', quantity: 1, price: 1000, buyingPrice: 400, total: 1000 },
            { productId: productA.product._id, variantId: secondVariant, title: 'Second variant', quantity: 1, price: 500, buyingPrice: 200, total: 500 },
        ], pricing: { subtotal: 1500, discount: 100, shipping: 80, tax: 0, total: 1480 },
    } });
    const interval = reportInterval({ range: '30' });
    const initial = await getSalesReport({ tenantId: String(shopA._id), ...interval });
    assert.equal(initial.summary.orders, 1);
    assert.equal(initial.summary.revenue, 1400);
    assert.equal(initial.summary.profit, 800);
    assert.equal(initial.summary.shipping, 80);
    assert.equal(initial.products[0].orders, 1, 'two variants must not count as two orders');
    const overview = await getDashboardOverviewResponse(String(shopA._id), undefined, { range: '30' });
    assert.equal(overview.data.revenue.overview.totalRevenue, 1400);
    const analytics = await ctx.vendorAClient().get('/api/admin/analytics?range=30');
    assert.equal(analytics.status, 200, JSON.stringify(analytics.body));
    assert.equal(analytics.body.data.summary.revenue, 1400);
    const growth = await ctx.vendorAClient().get('/api/admin/growth/products?range=30');
    assert.equal(growth.status, 200, JSON.stringify(growth.body));
    assert.equal(growth.body.data.products.find(item => item._id === String(productA.product._id)).revenue, 1400);

    await ReturnRequest.create({ shop_id: shopA._id, order_id: orderA._id, customer_id: orderA.customer,
        reason: 'One item returned', status: 'Refunded', inventoryRestoredAt: new Date(),
        items: [{ productId: productA.product._id, variantId: secondVariant, title: 'Second variant', quantity: 1, refundAmount: 466.67 }],
        refund: { status: 'Refunded', amount: 466.67, refundedAt: new Date() },
    });
    await Product.updateOne({ _id: productA.product._id }, { $set: { isDeleted: true } });
    await Order.updateOne({ _id: orderA._id }, { $set: { status: 'Returned', isDeleted: true } });
    const after = await getSalesReport({ tenantId: shopA._id, ...reportInterval({ range: '30' }) });
    assert.equal(after.summary.orders, 1);
    assert.equal(after.summary.revenue, 933.33);
    assert.equal(after.summary.profit, 533.33);
    assert.equal(after.products[0].revenue, 933.33);
    const refundOnly = await getSalesReport({ tenantId: shopA._id, from: new Date(Date.now() - 10000) });
    assert.equal(refundOnly.summary.revenue, -466.67, 'negative net sales remain visible');
    const otherShop = await getSalesReport({ tenantId: shopB._id, ...interval });
    assert.equal(otherShop.summary.refunds, 0);
    assert.equal((await ctx.vendorAClient().get('/api/admin/analytics?from=2026-02-30')).status, 400);
    await Order.collection.updateOne({ _id: orderA._id }, { $unset: { 'items.0.buyingPrice': '' } });
    const incomplete = await getSalesReport({ tenantId: shopA._id, ...reportInterval({ range: '30' }) });
    assert.equal(incomplete.summary.profit, null, 'missing cost must not be represented as zero cost and a complete profit');
    assert.ok(incomplete.meta.warnings.some(warning => warning.includes('buying cost')));
});

test('merchant rates are scoped, versioned and revalidated for guest and authenticated checkout', async t => {
    const ctx = await createLaunchSafetyContext(t);
    await Order.createIndexes();
    const vendor = ctx.vendorAClient(), publicClient = ctx.client();
    const path = '/api/admin/shipping/rates';
    const original = await vendor.get(path);
    assert.equal(original.status, 200);
    assert.equal(original.body.data.outsideCharge, 120);
    const saved = await vendor.unsafePut(path, { version: 0, baseArea: 'Chattogram', insideCharge: 60, outsideCharge: 150 });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal((await vendor.unsafePut(path, { version: 0, baseArea: 'Dhaka', insideCharge: 80, outsideCharge: 120 })).status, 409);
    assert.equal((await ctx.staffAClient().unsafePut(path, { version: 1, baseArea: 'Dhaka', insideCharge: 0, outsideCharge: 0 })).status, 403);
    assert.equal((await ctx.vendorBClient().get(path)).body.data.configured, false);
    assert.equal((await publicClient.get('/api/storefront/launchshopa/shipping/quote?district=Inside%20Dhaka')).status, 400);
    const quote = (await publicClient.get('/api/storefront/launchshopa/shipping/quote?district=Chattogram')).body.data;
    assert.equal(quote.originalCharge, 60);
    const { productA } = ctx.data.products;
    const payload = makeCheckoutPayload({ product: productA.product, variant: productA.variant });
    payload.idempotencyKey = 'shipping-quote-idempotency-test';
    delete payload.shippingZone;
    payload.shipping = { zone: quote.zone, quoteToken: quote.token, address: { ...payload.shippingAddress, city: 'Chattogram' } };
    delete payload.shippingAddress;
    const proved = await addCheckoutProof({ shop: ctx.data.shops.shopA, payload });
    const placed = await publicClient.unsafePost('/api/public/orders', proved);
    assert.equal(placed.status, 201, JSON.stringify(placed.body));
    const order = await Order.findById(placed.body.orderId).lean();
    assert.equal(order.pricing.shipping, 60);
    assert.equal(order.shipping.address.city, 'Chattogram');
    assert.equal(order.shipping.rateSnapshot.originalCharge, 60);
    assert.equal(order.shipping.rateSnapshot.configurationVersion, 1);
    assert.equal(order.items[0].couponDiscount, 0);
    await vendor.unsafePut(path, { version: 1, baseArea: 'Chattogram', insideCharge: 70, outsideCharge: 160 });
    const replay = await publicClient.unsafePost('/api/public/orders', proved);
    assert.equal(replay.status, 200, JSON.stringify(replay.body));
    assert.equal(replay.body.orderId, placed.body.orderId);
    const authPayload = await addCheckoutProof({ shop: ctx.data.shops.shopA, payload: {
        ...payload, payment: { method: 'COD' }, items: [{ productId: productA.product._id, variantId: productA.variant._id, quantity: 1 }],
    } });
    // Authenticated checkout has its own strict payload schema.
    const { items, shipping, payment, consent, checkoutSessionId, phoneVerificationToken } = authPayload;
    const stale = await ctx.customerAClient().unsafePost('/api/storefront/launchshopa/orders', { items, shipping, payment, consent, checkoutSessionId, phoneVerificationToken });
    assert.equal(stale.status, 400);
    assert.match(stale.body.error, /changed|expired/);
    const freshQuote = (await publicClient.get('/api/storefront/launchshopa/shipping/quote?district=Chattogram')).body.data;
    const fresh = await ctx.customerAClient().unsafePost('/api/storefront/launchshopa/orders', { items, shipping: { ...shipping, quoteToken: freshQuote.token }, payment, consent, checkoutSessionId, phoneVerificationToken });
    assert.equal(fresh.status, 201, JSON.stringify(fresh.body));
    assert.equal((await Order.findById(fresh.body.orderId)).pricing.shipping, 70);
    assert.equal((await Order.findById(order._id)).pricing.shipping, 60, 'saved orders retain their original shipping');
    assert.equal((await Shop.findById(ctx.data.shops.shopB._id)).deliveryRates.configured, false);
    await Promotion.create({ shop_id: ctx.data.shops.shopA._id, name: 'Free delivery', code: 'SHIPFREE', type: 'FREE_SHIPPING', isActive: true });
    const outsideQuote = (await publicClient.get('/api/storefront/launchshopa/shipping/quote?district=Dhaka')).body.data;
    const freePayload = await addCheckoutProof({ shop: ctx.data.shops.shopA, payload: { ...payload,
        idempotencyKey: 'free-shipping-quote-test', promotionCode: 'SHIPFREE',
        shipping: { zone: outsideQuote.zone, quoteToken: outsideQuote.token, address: { ...payload.shipping.address, city: 'Dhaka' } },
    } });
    const free = await publicClient.unsafePost('/api/public/orders', freePayload);
    assert.equal(free.status, 201, JSON.stringify(free.body));
    const freeOrder = await Order.findById(free.body.orderId).lean();
    assert.equal(freeOrder.pricing.shipping, 0);
    assert.equal(freeOrder.shipping.rateSnapshot.originalCharge, 160);
    assert.equal(freeOrder.shipping.rateSnapshot.discount, 160);
    assert.equal(freeOrder.shipping.rateSnapshot.finalCharge, 0);
});

test('partial refunds preserve delivery, reject repeat/excess returns and invalidate Overview cache', async t => {
    const ctx = await createLaunchSafetyContext(t);
    await Promise.all([Order.createIndexes(), ReturnRequest.createIndexes()]);
    const { shopA } = ctx.data.shops, { orderA } = ctx.data.orders, { productA } = ctx.data.products;
    const line = { productId: productA.product._id, variantId: productA.variant._id, title: 'Two units', quantity: 2, price: 1000, buyingPrice: 400, total: 2000, couponDiscount: 100 };
    const deliveredAt = new Date(Date.now() - 3600000);
    await Order.updateOne({ _id: orderA._id }, { $set: { items: [line], status: 'Delivered', 'shipping.deliveredAt': deliveredAt, pricing: { subtotal: 2000, discount: 100, shipping: 80, total: 1980 } } });
    const before = await getDashboardOverviewResponse(shopA._id);
    assert.equal(before.data.stats.totalRevenue, 1900);
    const createReturn = () => ReturnRequest.create({ shop_id: shopA._id, order_id: orderA._id, customer_id: orderA.customer,
        status: 'Approved', reason: 'Return one unit', items: [{ ...line, quantity: 1, refundAmount: 950 }], refund: { status: 'Pending', amount: 950 } });
    const request = await createReturn();
    const vendor = ctx.vendorAClient();
    const receipt = await vendor.unsafePatch(`/api/admin/returns/${request._id}/status`, { status: 'Received', receiptItems: [{ ...line, restockQuantity: 1 }] });
    assert.equal(receipt.status, 200, JSON.stringify(receipt.body));
    const refunded = await vendor.unsafePatch(`/api/admin/returns/${request._id}/refund`, { status: 'Refunded', amount: 950 });
    assert.equal(refunded.status, 200, JSON.stringify(refunded.body));
    assert.equal((await Order.findById(orderA._id)).status, 'Delivered');
    const after = await getDashboardOverviewResponse(shopA._id);
    assert.equal(after.data.stats.totalRevenue, 950);
    assert.equal(after.data.stats.netProfit, 550);
    assert.equal((await vendor.unsafePatch(`/api/admin/returns/${request._id}/refund`, { status: 'Refunded', amount: 950 })).status, 409);
    assert.equal((await vendor.unsafePatch(`/api/admin/orders/${orderA._id}/status`, { status: 'Delivered' })).status, 200);
    assert.equal(+(await Order.findById(orderA._id)).shipping.deliveredAt, +deliveredAt);
    assert.equal((await vendor.unsafePatch(`/api/admin/orders/${orderA._id}/status`, { status: 'Pending' })).status, 400);
    const excessive = await createReturn();
    assert.equal((await vendor.unsafePatch(`/api/admin/returns/${excessive._id}/status`, { status: 'Received', receiptItems: [{ ...line, restockQuantity: 1 }] })).status, 200);
    const invalid = await vendor.unsafePatch(`/api/admin/returns/${excessive._id}/refund`, { status: 'Refunded', amount: 1000 });
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.error, /paid value/);
});

test('low stock scans beyond 500 products and respects variant thresholds and archived variants', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const shop_id = ctx.data.shops.shopA._id;
    await Product.collection.insertMany(Array.from({ length: 501 }, (_, index) => ({
        shop_id, isDeleted: false, title: `Stock coverage ${index}`, slug: `stock-coverage-${index}`,
        variants: [{ _id: new mongoose.Types.ObjectId(), stock: 100, inventory: { lowStockThreshold: 5 } }],
    })));
    const _id = new mongoose.Types.ObjectId();
    await Product.collection.insertOne({ _id, shop_id, isDeleted: false, title: 'Last product needs restock', slug: 'last-product-needs-restock', variants: [
        { _id: new mongoose.Types.ObjectId(), stock: 7, inventory: { lowStockThreshold: 8 } },
        { _id: new mongoose.Types.ObjectId(), stock: 0, status: 'archived', inventory: { lowStockThreshold: 8 } },
    ] });
    const rows = await getLowStockRows(String(shop_id));
    assert.equal(rows.filter(row => String(row.productId) === String(_id)).length, 1);
    assert.equal(rows.find(row => String(row.productId) === String(_id)).stock, 7);
});

test('concurrent refunds of different products serialize on their order and finish fully returned', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA } = ctx.data.shops, { orderA } = ctx.data.orders, { productA } = ctx.data.products;
    const second = await createProduct({ shop: shopA, title: 'Other return product', slug: 'other-return-product', sellingPrice: 500, buyingPrice: 200, stock: 20 });
    const lines = [
        { productId: productA.product._id, variantId: productA.variant._id, title: 'First', quantity: 1, price: 1000, total: 1000, buyingPrice: 400, couponDiscount: 0 },
        { productId: second.product._id, variantId: second.variant._id, title: 'Second', quantity: 1, price: 500, total: 500, buyingPrice: 200, couponDiscount: 0 },
    ];
    await Order.updateOne({ _id: orderA._id }, { $set: { status: 'Delivered', 'shipping.deliveredAt': new Date(Date.now() - 3600000), items: lines, pricing: { subtotal: 1500, discount: 0, shipping: 80, total: 1580 } } });
    const requests = await ReturnRequest.create(lines.map(line => ({ shop_id: shopA._id, order_id: orderA._id, customer_id: orderA.customer,
        reason: 'Concurrent return', status: 'Approved', items: [{ ...line, refundAmount: line.total }], refund: { status: 'Pending', amount: line.total } })));
    for (const request of requests) {
        const receipt = await ctx.vendorAClient().unsafePatch(`/api/admin/returns/${request._id}/status`, { status: 'Received', receiptItems: request.items.map(item => ({ productId: item.productId, variantId: item.variantId, restockQuantity: item.quantity })) });
        assert.equal(receipt.status, 200, JSON.stringify(receipt.body));
    }
    const results = await Promise.all(requests.map(request => ctx.vendorAClient().unsafePatch(`/api/admin/returns/${request._id}/refund`, { status: 'Refunded', amount: request.refund.amount })));
    assert.ok(results.some(result => result.status === 200));
    for (let index = 0; index < results.length; index++) {
        assert.ok([200, 400].includes(results[index].status), JSON.stringify(results[index].body));
        if (results[index].status === 400) {
            const retried = await ctx.vendorAClient().unsafePatch(`/api/admin/returns/${requests[index]._id}/refund`, { status: 'Refunded', amount: requests[index].refund.amount });
            assert.equal(retried.status, 200, JSON.stringify(retried.body));
        }
    }
    const final = await Order.findById(orderA._id).lean();
    assert.equal(final.status, 'Returned');
    assert.equal(final.refundRevision, 4);
    const report = await getSalesReport({ tenantId: shopA._id });
    assert.equal(report.summary.revenue, 0);
    assert.equal(report.summary.profit, 0);
});

test('explicit reporting periods reconcile across pages, comparisons and authenticated CSV export', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const { orderA } = ctx.data.orders;
    await Order.updateOne({ _id: orderA._id }, { $set: { status: 'Delivered', 'shipping.deliveredAt': new Date('2026-01-02T06:00:00Z') } });
    const query = 'range=custom&from=2026-01-01&to=2026-01-03';
    const vendor = ctx.vendorAClient();
    const analytics = await vendor.get(`/api/admin/analytics?${query}`);
    assert.equal(analytics.status, 200, JSON.stringify(analytics.body));
    assert.equal(analytics.body.data.summary.revenue, 1200);
    assert.equal(analytics.body.data.comparison.summary.revenue, 0);
    assert.equal(analytics.body.data.comparison.changes.revenue.delta, 1200);
    assert.equal(analytics.body.data.comparison.changes.revenue.percent, null);
    const overview = await vendor.get(`/api/admin/dashboard-overview?${query}`);
    assert.equal(overview.body.data.stats.totalRevenue, 1200);
    const growth = await vendor.get(`/api/admin/growth/overview?${query}`);
    assert.equal(growth.status, 200, JSON.stringify(growth.body));
    assert.equal(growth.body.data.summary.revenue, 1200);
    assert.equal(growth.body.data.range, 'custom');
    assert.equal(growth.body.data.interval.to, analytics.body.data.meta.to);
    const csv = await vendor.get(`/api/admin/analytics?${query}&format=csv`);
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get('content-type'), /text\/csv/);
    assert.match(csv.text, /"summary"/);
    assert.match(csv.text, /1200/);
    assert.match(csv.text, /"commerce-v2"/);
    assert.equal((await ctx.client().get(`/api/admin/analytics?${query}&format=csv`)).status, 401);
    assert.equal((await vendor.get('/api/admin/growth/overview?range=custom&from=2026-02-30&to=2026-03-05')).status, 400);
});
