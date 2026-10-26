// Shared reporting contract. Money is calculated in paisa, then presented in BDT.
const VERSION = 'commerce-v2';
const ACTIVE_ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped'];
const minor = value => Math.round(Number(value || 0) * 100);
const money = value => value / 100;

// Largest-remainder allocation keeps the total exact, including small discounts.
const allocate = (amount, weights) => {
    const total = weights.reduce((sum, value) => sum + Math.max(0, value), 0);
    if (!total) return weights.map(() => 0);
    const shares = weights.map((weight, index) => {
        const exact = amount * Math.max(0, weight) / total;
        return { index, value: Math.floor(exact), remainder: exact - Math.floor(exact) };
    });
    let remaining = amount - shares.reduce((sum, share) => sum + share.value, 0);
    for (const share of [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
        if (remaining-- > 0) share.value++;
    }
    return shares.map(share => share.value);
};

const orderAmounts = order => {
    const items = order.items || [];
    const gross = items.map(item => minor(item.total ?? Number(item.price || 0) * Number(item.quantity || 0)));
    const discount = Math.min(gross.reduce((a, b) => a + b, 0), Math.max(0, minor(order.pricing?.discount)));
    const recorded = items.every(item => Number.isFinite(item.couponDiscount)) && items.reduce((sum, item) => sum + minor(item.couponDiscount), 0) === discount;
    const allocations = recorded ? items.map(item => minor(item.couponDiscount)) : allocate(discount, gross);
    return items.map((item, index) => ({
        productId: String(item.productId?._id || item.productId), variantId: String(item.variantId || ''), title: item.title,
        quantity: Number(item.quantity || 0), gross: gross[index], discount: allocations[index],
        net: gross[index] - allocations[index], cost: minor(Number(item.buyingPrice || 0) * Number(item.quantity || 0)),
        costKnown: item.buyingPrice !== null && item.buyingPrice !== undefined
    }));
};

const snapshotCouponDiscounts = (items, discount, eligibleProductIds) => {
    const eligible = eligibleProductIds ? new Set(eligibleProductIds.map(String)) : null;
    const shares = allocate(minor(discount), items.map(item => !eligible || eligible.has(String(item.productId)) ? minor(item.total) : 0));
    if (shares.reduce((sum, value) => sum + value, 0) !== minor(discount)) throw new Error('Coupon could not be allocated to eligible order items.');
    return items.map((item, index) => ({ ...item, couponDiscount: money(shares[index]) }));
};

const dayKey = date => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date(date));

const reportInterval = (query = {}, now = new Date()) => {
    const days = ['7', '30', '90'].includes(String(query.range)) ? Number(query.range) : 30;
    const parse = (value, end = false) => {
        if (typeof value !== 'string') throw Object.assign(new Error('Invalid reporting date'), { statusCode: 400 });
        const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
        const date = new Date(dateOnly ? `${value}T00:00:00+06:00` : value);
        if (!Number.isFinite(+date) || (dateOnly && dayKey(date) !== value)) throw Object.assign(new Error('Invalid reporting date'), { statusCode: 400 });
        return dateOnly && end ? new Date(+date + 86400000) : date;
    };
    if (query.range === 'custom' && (!query.from || !query.to)) throw Object.assign(new Error('Choose both custom reporting dates.'), { statusCode: 400 });
    const today = dayKey(now);
    const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00+06:00`);
    if (query.range === 'this-month') query = { ...query, from: dayKey(monthStart), to: now.toISOString() };
    if (query.range === 'last-month') {
        const previousMonth = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, 1) - 6 * 3600000);
        query = { ...query, from: dayKey(previousMonth), to: monthStart.toISOString() };
    }
    // Never compare a partial present period against future hours.
    const to = query.to ? new Date(Math.min(+parse(query.to, true), +now)) : now;
    const from = query.from ? parse(query.from) : new Date(+new Date(`${dayKey(to)}T00:00:00+06:00`) - (days - 1) * 86400000);
    if (+from >= +to || +to - +from > 366 * 86400000) throw Object.assign(new Error('Choose a reporting range of at most 366 days, with the start before the end.'), { statusCode: 400 });
    return { from, to, timezone: 'Asia/Dhaka' };
};

const previousInterval = ({ from, to }) => {
    const shift = Math.ceil((+to - +from) / 86400000) * 86400000;
    return { from: new Date(+from - shift), to: new Date(+to - shift) };
};

module.exports = { previousInterval, snapshotCouponDiscounts, VERSION, ACTIVE_ORDER_STATUSES, minor, money, allocate, orderAmounts, dayKey, reportInterval };
