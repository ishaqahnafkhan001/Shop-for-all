const { reportInterval } = require('../orders/reportingMetrics');
const DAY_MS = 86400000;
const normalizeTopic = value => String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();

const REGION_ALIASES = Object.freeze({ dhaka: 'Dhaka', 'ঢাকা': 'Dhaka', chattogram: 'Chattogram', chittagong: 'Chattogram',
    'চট্টগ্রাম': 'Chattogram', khulna: 'Khulna', 'খুলনা': 'Khulna', rajshahi: 'Rajshahi', 'রাজশাহী': 'Rajshahi',
    sylhet: 'Sylhet', 'সিলেট': 'Sylhet', barishal: 'Barishal', barisal: 'Barishal', 'বরিশাল': 'Barishal',
    rangpur: 'Rangpur', 'রংপুর': 'Rangpur', mymensingh: 'Mymensingh', 'ময়মনসিংহ': 'Mymensingh' });
const TOPIC_ALIASES = Object.freeze({ shoes: 'Footwear', footwear: 'Footwear', 'জুতা': 'Footwear',
    clothing: 'Clothing', fashion: 'Clothing', 'পোশাক': 'Clothing', shirt: 'Clothing', saree: 'Clothing',
    jewellery: 'Jewellery', jewelry: 'Jewellery', 'গয়না': 'Jewellery', 'গহনা': 'Jewellery',
    phone: 'Phones', smartphone: 'Phones', mobile: 'Phones', 'ফোন': 'Phones',
    electronics: 'Electronics', 'ইলেকট্রনিক্স': 'Electronics', laptop: 'Computers', computer: 'Computers',
    beauty: 'Beauty', skincare: 'Beauty', headphones: 'Audio', audio: 'Audio', furniture: 'Furniture',
    books: 'Books', 'বই': 'Books', toys: 'Toys', 'খেলনা': 'Toys', food: 'Food', 'খাবার': 'Food' });

const getGrowthInterval = (rangeInput, interval, now = Date.now()) => {
    if (rangeInput === 'custom') {
        if (!interval || typeof interval.from !== 'string' || typeof interval.to !== 'string') throw invalidInterval();
        const from = new Date(interval.from), to = new Date(interval.to);
        if (!Number.isFinite(+from) || !Number.isFinite(+to) || +from >= +to || +to - +from > 366 * DAY_MS || +to > now + 1000) throw invalidInterval();
        return { range: 'custom', from, to };
    }
    const range = ['7', '30', '90'].includes(String(rangeInput)) ? Number(rangeInput) : 30;
    if (interval !== undefined && (!interval || typeof interval !== 'object')) throw invalidInterval();
    const to = interval ? new Date(interval.to) : new Date(now);
    const from = interval ? new Date(interval.from) : new Date(+to - range * DAY_MS);
    const calendarFrom = Number.isFinite(+to) ? reportInterval({ range }, to).from : null;
    if (!Number.isFinite(+from) || !Number.isFinite(+to) || (+to - +from !== range * DAY_MS && +from !== +calendarFrom)
        || +to > now + 1000 || +to < now - DAY_MS) throw invalidInterval();
    return { range, from, to };
};
const invalidInterval = () => Object.assign(new Error('Refresh product insights to use a valid reporting period.'),
    { code: 'AI_INVALID_INTERVAL', statusCode: 400 });
const productTopics = product => new Set([product?.category, ...(Array.isArray(product?.tags) ? product.tags : [])]
    .map(normalizeTopic).map(value => TOPIC_ALIASES[value]).filter(Boolean));

module.exports = { getGrowthInterval, normalizeTopic, productTopics, REGION_ALIASES, TOPIC_ALIASES };
