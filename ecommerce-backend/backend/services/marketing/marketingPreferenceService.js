const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../../models/User');
const ConsentLog = require('../../models/ConsentLog');
const { enqueueJob } = require('../jobQueueService');

const getSecret = () => {
    const secret = process.env.MARKETING_UNSUBSCRIBE_SECRET || (process.env.NODE_ENV !== 'production' ? process.env.JWT_SECRET : '');
    if (!secret || secret.length < 32) throw new Error('MARKETING_UNSUBSCRIBE_SECRET must be at least 32 characters');
    return secret;
};

const signToken = (data) => {
    const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
    const signature = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
    return `${payload}.${signature}`;
};

const parseToken = (token) => {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature || payload.length > 512) return null;
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (data?.v !== 1 || !/^[a-f\d]{24}$/i.test(data.shopId) || !/^[a-f\d]{24}$/i.test(data.customerId)) return null;
        return data;
    } catch { return null; }
};

const createUnsubscribeToken = ({ shopId, customerId }) => signToken({
    v: 1, purpose: 'unsubscribe', shopId: String(shopId), customerId: String(customerId)
});
const parseUnsubscribeToken = (token) => {
    const data = parseToken(token);
    return data?.purpose === 'unsubscribe' ? data : null;
};

const hashEmail = (email) => crypto.createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex');
const createConfirmToken = ({ shopId, customerId, orderId, email, expiresAt }) => signToken({
    v: 1, purpose: 'confirm', shopId: String(shopId), customerId: String(customerId),
    orderId: String(orderId), emailHash: hashEmail(email),
    exp: Number(expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000)
});
const parseConfirmToken = (token) => {
    const data = parseToken(token);
    if (data?.purpose !== 'confirm' || !/^[a-f\d]{24}$/i.test(data.orderId) ||
        !/^[a-f\d]{64}$/i.test(data.emailHash) || !Number.isFinite(data.exp) || data.exp < Date.now()) return null;
    return data;
};

const createUnsubscribeUrl = ({ shopId, customerId }) => {
    const base = process.env.PUBLIC_API_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:5000' : '');
    if (!base) throw new Error('PUBLIC_API_URL is required for marketing email');
    const url = new URL('/api/public/marketing/unsubscribe', base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
        throw new Error('PUBLIC_API_URL must use HTTPS in production');
    }
    url.searchParams.set('token', createUnsubscribeToken({ shopId, customerId }));
    return url.toString();
};

const createConfirmUrl = ({ shopId, customerId, orderId, email, expiresAt }) => {
    const base = process.env.PUBLIC_API_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:5000' : '');
    if (!base) throw new Error('PUBLIC_API_URL is required for marketing confirmation');
    const url = new URL('/api/public/marketing/confirm', base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
        throw new Error('PUBLIC_API_URL must use HTTPS in production');
    }
    url.searchParams.set('token', createConfirmToken({ shopId, customerId, orderId, email, expiresAt }));
    return url.toString();
};

const recordCheckoutMarketingConsent = async ({ shopId, customerId, orderId, session }) => {
    const customer = await User.findOne({ _id: customerId, shop_id: shopId, role: 'Customer' })
        .select('email marketingEmail').session(session || null).lean();
    if (!customer || customer.marketingEmail?.suppressedAt ||
        (customer.marketingEmail?.consentedAt && !customer.marketingEmail?.unsubscribedAt)) return;
    const now = new Date();
    await User.updateOne(
        { _id: customerId, shop_id: shopId, role: 'Customer', 'marketingEmail.suppressedAt': null },
        { $set: {
            'marketingEmail.pendingAt': now,
            'marketingEmail.pendingOrderId': orderId
        } },
        { session }
    );
    await enqueueJob({
        queue: 'marketing-consent', name: 'marketing.confirm_email', shop_id: shopId,
        payload: { customerId, orderId },
        idempotencyKey: `marketing.confirm:${shopId}:${orderId}:${customerId}`,
        session
    });
};

const confirmMarketingConsent = async ({ token, ip, userAgent }) => {
    const scope = parseConfirmToken(token);
    if (!scope) return false;
    const session = await mongoose.startSession();
    let confirmed = false;
    try {
        await session.withTransaction(async () => {
            const customer = await User.findOne({
                _id: scope.customerId, shop_id: scope.shopId, role: 'Customer',
                'marketingEmail.pendingOrderId': scope.orderId,
                'marketingEmail.pendingAt': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                'marketingEmail.suppressedAt': null
            }).select('email').session(session).lean();
            if (!customer || hashEmail(customer.email) !== scope.emailHash) return;
            const now = new Date();
            const result = await User.updateOne(
                { _id: scope.customerId, shop_id: scope.shopId, role: 'Customer', email: customer.email,
                    'marketingEmail.pendingOrderId': scope.orderId,
                    'marketingEmail.pendingAt': { $ne: null }, 'marketingEmail.suppressedAt': null },
                { $set: {
                    'marketingEmail.consentedAt': now,
                    'marketingEmail.consentSource': 'email_confirmed_checkout_v1',
                    'marketingEmail.unsubscribedAt': null,
                    'marketingEmail.pendingAt': null,
                    'marketingEmail.pendingOrderId': null
                } }, { session }
            );
            if (!result.modifiedCount) return;
            await ConsentLog.create([{
                shop_id: scope.shopId, customer_id: scope.customerId, order_id: scope.orderId,
                type: 'marketing', version: 'email_confirmed_checkout_v1', acceptedAt: now,
                ip: String(ip || '').slice(0, 80), userAgent: String(userAgent || '').slice(0, 500)
            }], { session });
            confirmed = true;
        });
    } finally { await session.endSession(); }
    return confirmed;
};

const unsubscribeCustomer = async (token) => {
    const scope = parseUnsubscribeToken(token);
    if (!scope) return false;
    const result = await User.updateOne(
        { _id: scope.customerId, shop_id: scope.shopId, role: 'Customer' },
        { $set: {
            'marketingEmail.unsubscribedAt': new Date(),
            'marketingEmail.pendingAt': null,
            'marketingEmail.pendingOrderId': null
        } }
    );
    return result.matchedCount > 0;
};

module.exports = {
    createUnsubscribeToken, parseUnsubscribeToken, createUnsubscribeUrl,
    createConfirmToken, parseConfirmToken, createConfirmUrl,
    recordCheckoutMarketingConsent, confirmMarketingConsent, unsubscribeCustomer
};
