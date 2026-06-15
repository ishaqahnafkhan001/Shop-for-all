const mongoose = require('mongoose');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const Shop = require('../models/Shop');

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const toObjectIdOrNull = (value) => (
    isObjectId(value) ? new mongoose.Types.ObjectId(String(value)) : null
);

const cleanText = (value, max = 1000) => String(value || '').trim().slice(0, max);

const getSubdomainFromRequest = (req) => {
    const explicitSubdomain = req.body?.subdomain || req.query?.subdomain || req.headers['x-shop-subdomain'];
    if (explicitSubdomain) return cleanText(explicitSubdomain, 80).toLowerCase();

    const origin = req.headers.origin || req.headers.referer || '';
    try {
        const hostname = new URL(origin).hostname.toLowerCase();
        if (hostname.includes('.localhost')) return hostname.split('.localhost')[0];
        if (hostname.endsWith('.scaleup.codes')) {
            const [subdomain] = hostname.split('.');
            return ['www', 'api', 'admin'].includes(subdomain) ? '' : subdomain;
        }
    } catch {
        return '';
    }

    return '';
};

const normalizeUtm = (utm = {}) => ({
    source: cleanText(utm.source || utm.utm_source, 120),
    medium: cleanText(utm.medium || utm.utm_medium, 120),
    campaign: cleanText(utm.campaign || utm.utm_campaign, 160),
    content: cleanText(utm.content || utm.utm_content, 160),
    term: cleanText(utm.term || utm.utm_term, 160)
});

const normalizeDevice = (device = {}) => ({
    type: cleanText(device.type, 40),
    browser: cleanText(device.browser, 80),
    os: cleanText(device.os, 80)
});

exports.trackAnalyticsEvent = async (req, res) => {
    try {
        const eventType = cleanText(req.body?.eventType, 60);

        if (!AnalyticsEvent.EVENT_TYPES.includes(eventType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid analytics event type'
            });
        }

        const subdomain = getSubdomainFromRequest(req);
        if (!subdomain) {
            return res.status(400).json({
                success: false,
                error: 'Valid shop subdomain is required'
            });
        }

        const shop = await Shop.findOne({
            subdomain,
            isActive: true
        }).select('_id').lean();

        if (!shop) {
            return res.status(404).json({
                success: false,
                error: 'Store not found'
            });
        }

        const metadata = req.body?.metadata && typeof req.body.metadata === 'object'
            ? req.body.metadata
            : {};

        const sessionId = cleanText(req.body?.sessionId, 120) || `anonymous:${Date.now()}`;

        await AnalyticsEvent.create({
            shop_id: shop._id,
            sessionId,
            customer_id: toObjectIdOrNull(req.body?.customer_id || req.body?.customerId),
            eventType,
            product_id: toObjectIdOrNull(req.body?.product_id || req.body?.productId),
            variant_id: toObjectIdOrNull(req.body?.variant_id || req.body?.variantId),
            order_id: toObjectIdOrNull(req.body?.order_id || req.body?.orderId),
            value: Number.isFinite(Number(req.body?.value)) ? Number(req.body.value) : 0,
            currency: cleanText(req.body?.currency || 'BDT', 8).toUpperCase(),
            source: cleanText(req.body?.source || req.body?.utm?.source || 'direct', 120),
            utm: normalizeUtm(req.body?.utm),
            device: normalizeDevice(req.body?.device),
            pageUrl: cleanText(req.body?.pageUrl),
            referrer: cleanText(req.body?.referrer),
            metadata
        });

        return res.status(201).json({ success: true });
    } catch (err) {
        console.error('Analytics event tracking error:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to save analytics event'
        });
    }
};
