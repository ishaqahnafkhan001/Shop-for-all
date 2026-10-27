const test = require('node:test');
const assert = require('node:assert/strict');
const { allocate, orderAmounts, snapshotCouponDiscounts, reportInterval, ACTIVE_ORDER_STATUSES } = require('../services/orders/reportingMetrics');
test('multi-line coupon allocation reconciles exactly without repeating an order total', () => {
    const lines = orderAmounts({ pricing: { discount: 100, shipping: 80, total: 1480 }, items: [
        { productId: 'a', quantity: 1, price: 1000, total: 1000, buyingPrice: 400 },
        { productId: 'b', quantity: 1, price: 500, total: 500, buyingPrice: 200 }
    ] });
    assert.equal(lines.reduce((sum, line) => sum + line.net, 0), 140000);
    assert.equal(lines.reduce((sum, line) => sum + line.net - line.cost, 0), 80000);
    assert.deepEqual(allocate(1, [1, 1, 1]), [1, 0, 0]);
    assert.equal(ACTIVE_ORDER_STATUSES.includes('Confirmed'), true);
});
test('new coupon snapshots allocate only to eligible products and survive later report reads', () => {
    const items = snapshotCouponDiscounts([
        { productId: 'eligible', total: 500, quantity: 1, buyingPrice: 200 },
        { productId: 'other', total: 1000, quantity: 1, buyingPrice: 400 },
    ], 100, ['eligible']);
    assert.deepEqual(items.map(item => item.couponDiscount), [100, 0]);
    assert.deepEqual(orderAmounts({ items, pricing: { discount: 100 } }).map(item => item.net), [40000, 100000]);
});
test('delivery quotes support free rates, aliases and reject tampering, expired and cross-shop quotes', () => {
    const { normalizeSettings, resolveRate, issueQuote, verifyQuote } = require('../services/orders/shippingRateService');
    const before = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'isolated-shipping-unit-test';
    try {
        const settings = normalizeSettings({ version: 0, baseArea: 'Chittagong', insideCharge: 0, outsideCharge: 135.50 });
        assert.equal(settings.baseArea, 'Chattogram');
        const rate = resolveRate(settings, 'Chattogram');
        assert.equal(rate.originalCharge, 0);
        assert.equal(resolveRate(settings, 'Dhaka').originalCharge, 135.50);
        const token = issueQuote('shop-a', rate);
        verifyQuote(token, 'shop-a', rate);
        assert.throws(() => verifyQuote(token, 'shop-b', rate));
        assert.throws(() => verifyQuote(token, 'shop-a', { ...rate, configurationVersion: 2 }));
        assert.throws(() => verifyQuote(`${token}x`, 'shop-a', rate));
        assert.throws(() => verifyQuote(`${token.split('.')[0]}.${'é'.repeat(43)}`, 'shop-a', rate), /Invalid delivery quote/);
        const crypto = require('node:crypto');
        const data = Buffer.from(JSON.stringify({ shopId: 'shop-a', ...rate, expiresAt: 1 })).toString('base64url');
        const expired = `${data}.${crypto.createHmac('sha256', process.env.JWT_SECRET).update(`shipping-quote:${data}`).digest('base64url')}`;
        assert.throws(() => verifyQuote(expired, 'shop-a', rate), /expired/);
        for (const value of [-1, '', null, 1.001, Infinity]) assert.throws(() => normalizeSettings({ version: 0, baseArea: 'Dhaka', insideCharge: value, outsideCharge: 120 }));
        assert.throws(() => resolveRate(settings, 'Dahka'));
    } finally {
        if (before === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = before;
    }
});
test('report dates use Dhaka boundaries, reject invalid dates and reversed ranges', () => {
    const interval = reportInterval({ from: '2026-10-01', to: '2026-10-02' });
    assert.equal(interval.from.toISOString(), '2026-09-30T18:00:00.000Z');
    assert.equal(interval.to.toISOString(), '2026-10-02T18:00:00.000Z');
    assert.throws(() => reportInterval({ from: '2026-02-30' }));
    assert.throws(() => reportInterval({ from: '2026-10-03', to: '2026-10-01' }));
});

test('month presets and preceding comparison honor calendar boundaries and partial elapsed time', () => {
    const { previousInterval } = require('../services/orders/reportingMetrics');
    const now = new Date('2026-01-05T06:00:00Z'); // Noon in Dhaka
    const current = reportInterval({ range: 'this-month' }, now);
    assert.equal(current.from.toISOString(), '2025-12-31T18:00:00.000Z');
    assert.equal(current.to.toISOString(), now.toISOString());
    const previous = previousInterval(current);
    assert.equal(previous.from.toISOString(), '2025-12-26T18:00:00.000Z');
    assert.equal(previous.to.toISOString(), '2025-12-31T06:00:00.000Z');
    assert.equal(+previous.to - +previous.from, +current.to - +current.from);
    const lastMonth = reportInterval({ range: 'last-month' }, now);
    assert.equal(lastMonth.from.toISOString(), '2025-11-30T18:00:00.000Z');
    assert.equal(lastMonth.to.toISOString(), '2025-12-31T18:00:00.000Z');
    const today = reportInterval({ range: 'custom', from: '2026-01-05', to: '2026-01-05' }, now);
    assert.equal(+today.to, +now);
    assert.throws(() => reportInterval({ range: 'custom', from: '2026-01-01' }, now));
});

test('CSV preserves numeric refunds, escapes product formulas and marks unknown cost as blank', () => {
    const { salesReportCsv } = require('../services/orders/reportExportService');
    const report = { meta: { from: '2026-01-01', to: '2026-01-02', generatedAt: '2026-01-02', timezone: 'Asia/Dhaka', currency: 'BDT', metricVersion: 'commerce-v2', warnings: ['Unknown cost'] },
        summary: { revenue: -100, costKnown: false, cost: 0, profit: null }, salesByDay: [], products: [{ _id: 'item', title: '=HYPERLINK("test")', revenue: -100, costKnown: false, profit: null }] };
    const csv = salesReportCsv(report);
    assert.match(csv, /"'=HYPERLINK\(""test""\)"/);
    assert.match(csv, /,-100,"",""/);
    assert.match(csv, /"Asia\/Dhaka","BDT","commerce-v2"/);
});

test('Growth custom evidence intervals stay bounded and preserve historical dates', () => {
    const { getGrowthInterval } = require('../services/ai/growthAiContext');
    const interval = { from: '2026-01-01T18:00:00.000Z', to: '2026-01-03T18:00:00.000Z' };
    assert.equal(getGrowthInterval('custom', interval).from.toISOString(), interval.from);
    assert.throws(() => getGrowthInterval('custom', { from: interval.to, to: interval.from }));
    assert.throws(() => getGrowthInterval('custom', { from: '2020-01-01', to: interval.to }));
    assert.throws(() => getGrowthInterval('custom', { from: interval.from, to: '2099-01-01' }));
});
