const FinancialFact = require('../../models/FinancialFact');
const mongoose = require('mongoose');
const Order = require('../../models/Order');
const ReturnRequest = require('../../models/ReturnRequest');
const { VERSION, minor, money, allocate, orderAmounts, dayKey, previousInterval } = require('./reportingMetrics');

// Reports retain delivery evidence independently of current order/catalog status.
// Missing legacy delivery dates are disclosed, never inferred from mutable updatedAt.
const getSalesReport = async ({ tenantId, from, to = new Date(), productId }) => {
    if (!mongoose.isValidObjectId(tenantId)) throw Object.assign(new Error('Invalid shop context'), { statusCode: 400 });
    const shopId = new mongoose.Types.ObjectId(String(tenantId));
    const dateMatch = { ...(from ? { $gte: from } : {}), $lt: to };
    const summary = { costKnown: true, orders: 0, units: 0, gross: 0, discount: 0, refunds: 0, revenue: 0, cost: 0, shipping: 0, tax: 0, shippingRefunds: 0, taxRefunds: 0, orderValue: 0 };
    const days = new Map(), months = new Map(), products = new Map(), sources = new Map(), buyers = new Set();
    const coverage = { legacyDeliveries: 0, ledgerDeliveries: 0, legacyRefunds: 0, ledgerRefunds: 0, restockFacts: 0 };
    const warnings = new Set(), seenDeliveries = new Set(), seenRefunds = new Set();
    const bucket = (map, id, extra = {}) => {
        if (!map.has(id)) map.set(id, { _id: id, costKnown: true, orders: 0, quantity: 0, gross: 0, discount: 0, refunds: 0, revenue: 0, cost: 0, ...extra });
        return map.get(id);
    };
    const missingDates = await Order.countDocuments({ shop_id: shopId, status: { $in: ['Delivered', 'Returned'] }, deliveryFactId: null, 'shipping.deliveredAt': null });
    if (missingDates) warnings.add(`${missingDates} historical orders have no recorded delivery date and are excluded until reviewed.`);
    const missingRefundDates = await ReturnRequest.countDocuments({ shop_id: shopId, 'refund.status': 'Refunded', 'refund.financialFactId': null, 'refund.refundedAt': null });
    if (missingRefundDates) warnings.add(`${missingRefundDates} completed refunds have no recorded refund date and are excluded until reviewed.`);
    const consumeDelivery = (order, ledger = false) => {
        if (seenDeliveries.has(String(order._id))) return;
        seenDeliveries.add(String(order._id));
        if (Number(order.pricing?.discount) > 0 && !order.items.every(item => Number.isFinite(item.couponDiscount))) warnings.add('Historical coupon discounts are allocated proportionally across product lines.');
        const date = dayKey(order.shipping.deliveredAt);
        const day = bucket(days, date), month = bucket(months, date.slice(0, 7));
        const source = bucket(sources, order.source || 'unknown');
        const lines = orderAmounts(order).filter(line => !productId || line.productId === String(productId)), seen = new Set();
        if (!lines.length) return;
        coverage[ledger ? 'ledgerDeliveries' : 'legacyDeliveries']++;
        summary.orders++; day.orders++; month.orders++; source.orders++;
        summary.shipping += minor(order.pricing?.shipping); summary.tax += minor(order.pricing?.tax);
        summary.orderValue += minor(order.pricing?.total);
        if (order.customer) buyers.add(String(order.customer));
        for (const line of lines) {
            const product = bucket(products, line.productId, { title: line.title || 'Archived product' });
            if (!seen.has(line.productId)) { product.orders++; seen.add(line.productId); }
            for (const row of [summary, day, month, product, source]) {
                if (!line.costKnown) row.costKnown = false;
                row.gross += line.gross; row.discount += line.discount; row.revenue += line.net; row.cost += line.cost;
            }
            summary.units += line.quantity;
            for (const row of [day, month, product, source]) row.quantity += line.quantity;
            if (!line.costKnown) warnings.add('Some historical items have no recorded buying cost; product gross profit is incomplete.');
        }
    };
    const cursor = Order.find({ shop_id: shopId, deliveryFactId: null, 'shipping.deliveredAt': dateMatch })
        .select('items pricing source customer shipping.deliveredAt').lean().cursor();
    for await (const order of cursor) consumeDelivery(order);
    for await (const fact of FinancialFact.find({ shop_id: shopId, kind: 'delivery', occurredAt: dateMatch }).lean().cursor()) consumeDelivery({ ...fact.snapshot, _id: fact.order_id }, true);
    const consumeRefund = (request, order) => {
        if (seenRefunds.has(String(request._id))) return;
        seenRefunds.add(String(request._id));
        if (!order?.shipping?.deliveredAt) { warnings.add('Refunds without confirmed delivery evidence are excluded pending review.'); return; }
        coverage[request.refund.financialFactId ? 'ledgerRefunds' : 'legacyRefunds']++;
        const items = request.items || [];
        const amount = minor(request.refund.amount ?? items.reduce((sum, item) => sum + Number(item.refundAmount || 0), 0)) - minor(request.refund.shippingAmount) - minor(request.refund.taxAmount);
        summary.shippingRefunds += minor(request.refund.shippingAmount); summary.taxRefunds += minor(request.refund.taxAmount);
        const allocations = allocate(amount, items.map(item => minor(item.refundAmount)));
        if (amount && !allocations.some(Boolean)) { warnings.add('A refund has no item allocation; it requires review.'); return; }
        const date = dayKey(request.refund.refundedAt), day = bucket(days, date), month = bucket(months, date.slice(0, 7));
        const source = bucket(sources, order.source || 'unknown');
        for (let index = 0; index < items.length; index++) {
            const item = items[index], value = allocations[index];
            if (productId && String(item.productId) !== String(productId)) continue;
            const product = bucket(products, String(item.productId), { title: item.title || 'Archived product' });
            const original = (order.items || []).find(line => String(line.productId) === String(item.productId) && (!item.variantId || String(line.variantId) === String(item.variantId)));
            // Existing return flow records restored inventory. Missing disposition is not assumed.
            const restoredCost = !request.receivedAt && request.inventoryRestoredAt && original ? minor(Number(original.buyingPrice || 0) * Number(item.quantity || 0)) : 0;
            for (const row of [summary, day, month, product, source]) {
                if (!request.receivedAt && request.inventoryRestoredAt && (!original || original.buyingPrice == null)) { row.costKnown = false; warnings.add('A returned item has no recorded buying cost; product gross profit is unavailable.'); }
                row.refunds += value; row.revenue -= value; row.cost -= restoredCost;
            }
        }
        if (!request.refund.financialFactId) warnings.add('Legacy refunds are allocated to product lines; separate shipping/tax refund components are not recorded.');
    };
    const refundCursor = ReturnRequest.find({ shop_id: shopId, 'refund.financialFactId': null, 'refund.status': 'Refunded', 'refund.refundedAt': dateMatch })
        .select('items order_id refund inventoryRestoredAt receivedAt').lean().cursor();
    for await (const request of refundCursor) {
        let order = await Order.findOne({ _id: request.order_id, shop_id: shopId }).select('items shipping.deliveredAt source deliveryFactId').lean();
        if (order?.deliveryFactId) order = (await FinancialFact.findOne({ _id: order.deliveryFactId, shop_id: shopId }).lean())?.snapshot || order;
        consumeRefund(request, order);
    }
    for await (const fact of FinancialFact.find({ shop_id: shopId, kind: 'refund', occurredAt: dateMatch }).lean().cursor()) {
        const snapshot = fact.snapshot;
        consumeRefund({ ...snapshot, _id: fact.return_id, refund: { ...snapshot.refund, financialFactId: fact._id } }, {
            items: snapshot.originalItems, source: snapshot.source, shipping: { deliveredAt: snapshot.deliveryAt }
        });
    }
    for await (const fact of FinancialFact.find({ shop_id: shopId, kind: 'restock', occurredAt: dateMatch }).lean().cursor()) {
        coverage.restockFacts++;
        const date = dayKey(fact.occurredAt), day = bucket(days, date), month = bucket(months, date.slice(0, 7));
        const source = bucket(sources, fact.snapshot.source || 'unknown');
        for (const item of fact.snapshot.items || []) {
            if (productId && String(item.productId) !== String(productId)) continue;
            const product = bucket(products, String(item.productId), { title: item.title });
            for (const row of [summary, day, month, product, source]) {
                if (item.buyingPrice == null) { row.costKnown = false; warnings.add('A restocked item has no recorded buying cost.'); }
                row.cost -= minor(Number(item.buyingPrice || 0) * item.quantity);
            }
        }
    }
    if (coverage.legacyDeliveries) warnings.add(`${coverage.legacyDeliveries} historical deliveries still depend on their original order records; later edits to those records can change this report.`);
    const present = row => ({ ...row, ...Object.fromEntries(['gross', 'discount', 'refunds', 'revenue', 'cost'].map(key => [key, money(row[key])])), profit: row.costKnown ? money(row.revenue - row.cost) : null });
    const returningLegacy = from && buyers.size ? await Order.distinct('customer', {
        shop_id: shopId, deliveryFactId: null, customer: { $in: [...buyers].map(id => new mongoose.Types.ObjectId(id)) }, 'shipping.deliveredAt': { $lt: from }
    }) : [];
    const returningFacts = from && buyers.size ? await FinancialFact.distinct('snapshot.customer', { shop_id: shopId, kind: 'delivery', 'snapshot.customer': { $in: [...buyers] }, occurredAt: { $lt: from } }) : [];
    const returningCustomers = new Set([...returningLegacy, ...returningFacts].map(String));
    const soldValue = summary.gross - summary.discount;
    return {
        summary: { ...present(summary), shipping: money(summary.shipping), tax: money(summary.tax), orderValue: money(summary.orderValue), shippingRefunds: money(summary.shippingRefunds), taxRefunds: money(summary.taxRefunds), averageOrderValue: summary.orders ? money(soldValue) / summary.orders : 0, returningCustomers: returningCustomers.size, buyers: buyers.size },
        salesByDay: [...days.values()].sort((a, b) => a._id.localeCompare(b._id)).map(row => ({ ...present(row), date: row._id })),
        salesByMonth: [...months.values()].sort((a, b) => a._id.localeCompare(b._id)).map(row => ({ ...present(row), year: Number(row._id.slice(0, 4)), month: Number(row._id.slice(5)) })),
        products: [...products.values()].map(present).sort((a, b) => b.revenue - a.revenue),
        trafficSource: [...sources.values()].map(present),
        meta: { metricVersion: VERSION, coverage, dateBasis: 'delivery/refund/receipt occurrence', from: from || null, to, timezone: 'Asia/Dhaka', currency: 'BDT', generatedAt: new Date(), warnings: [...warnings], revenueDefinition: 'Delivered product sales after allocated coupons, less completed product refunds by occurrence date. Shipping and tax are separate.', profitDefinition: 'Product gross profit; courier, payment, advertising and operating costs are not included.' }
    };
};
const getComparedSalesReport = async options => {
    const report = await getSalesReport(options);
    if (!options.from) return report;
    const interval = previousInterval(options);
    const previous = await getSalesReport({ ...options, ...interval });
    const changes = Object.fromEntries(['revenue', 'profit', 'orders', 'averageOrderValue'].map(key => {
        const current = report.summary[key], before = previous.summary[key];
        const delta = current == null || before == null ? null : Math.round((current - before) * 100) / 100;
        return [key, { current, previous: before, delta, percent: delta == null || before <= 0 ? null : Math.round(delta / before * 1000) / 10 }];
    }));
    return { ...report, comparison: { ...interval, summary: previous.summary, changes, warnings: previous.meta.warnings,
        basis: 'Preceding equal calendar span, matched to elapsed time when the current day is partial.' } };
};
module.exports = { getSalesReport, getComparedSalesReport };
