const crypto = require('crypto');
const { PURPOSES, createOtp, verifyOtp } = require('../otpService');
const { sendSms } = require('../sms/smsProviderService');
const { normalizeBDPhone, maskPhone } = require('../../utils/phoneUtils');

const TOKEN_PURPOSE = 'public_order_access';
const TOKEN_TTL_MS = 15 * 60 * 1000;

const ORDER_ACCESS_ACTIONS = Object.freeze({
    track: 'track',
    cancel: 'cancel',
    return: 'return'
});

const getSigningSecret = () => {
    const secret = process.env.ORDER_ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('ORDER_ACCESS_TOKEN_SECRET is required in production');
    }
    return secret || 'development-order-access-secret';
};

const signPayload = (encodedPayload) => (
    crypto.createHmac('sha256', getSigningSecret()).update(encodedPayload).digest('base64url')
);

const safeEqual = (left, right) => {
    const leftBuffer = Buffer.from(String(left || ''));
    const rightBuffer = Buffer.from(String(right || ''));
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const normalizeAllowedActions = (allowedActions = []) => (
    Array.from(new Set((Array.isArray(allowedActions) ? allowedActions : [allowedActions])
        .map(action => String(action || '').trim())
        .filter(action => Object.values(ORDER_ACCESS_ACTIONS).includes(action))))
);

const createOrderAccessToken = ({
    shopId,
    orderId,
    allowedActions = Object.values(ORDER_ACCESS_ACTIONS),
    expiresInMs = TOKEN_TTL_MS
}) => {
    const now = Date.now();
    const payload = {
        v: 1,
        purpose: TOKEN_PURPOSE,
        shopId: String(shopId),
        orderId: String(orderId),
        allowedActions: normalizeAllowedActions(allowedActions),
        nonce: crypto.randomBytes(16).toString('hex'),
        iat: now,
        exp: now + expiresInMs
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${encodedPayload}.${signPayload(encodedPayload)}`;
};

const verifyOrderAccessToken = (token, { shopId, orderId, requiredAction } = {}) => {
    const [encodedPayload, signature] = String(token || '').split('.');
    if (!encodedPayload || !signature || !safeEqual(signature, signPayload(encodedPayload))) {
        return { valid: false, reason: 'invalid' };
    }

    let payload;
    try {
        payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch {
        return { valid: false, reason: 'invalid_payload' };
    }

    if (
        payload?.purpose !== TOKEN_PURPOSE ||
        payload?.shopId !== String(shopId) ||
        payload?.orderId !== String(orderId) ||
        Number(payload?.exp || 0) < Date.now()
    ) {
        return { valid: false, reason: 'expired_or_scope' };
    }

    if (requiredAction && !normalizeAllowedActions(payload.allowedActions).includes(requiredAction)) {
        return { valid: false, reason: 'action_not_allowed' };
    }

    return { valid: true, payload };
};

const getOrderAccessTokenFromRequest = (req) => {
    const authHeader = String(req.headers.authorization || '');
    if (authHeader.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim();
    return String(req.headers['x-order-access-token'] || req.body?.accessToken || req.query?.accessToken || '');
};

const exactOrderPhoneMatches = (savedPhone, submittedPhone) => {
    const saved = normalizeBDPhone(savedPhone);
    const submitted = normalizeBDPhone(submittedPhone);
    return Boolean(saved && submitted && saved === submitted);
};

const sendPublicOrderAccessOtp = async ({ order, shop, phone, ip, userAgent }) => {
    const normalizedPhone = normalizeBDPhone(phone);
    if (!normalizedPhone || !exactOrderPhoneMatches(order?.shipping?.address?.phone, normalizedPhone)) {
        const err = new Error('Order not found. Please check your ID and phone number.');
        err.statusCode = 404;
        throw err;
    }

    const otp = await createOtp({
        identifier: normalizedPhone,
        channel: 'sms',
        purpose: PURPOSES.publicOrderAccess,
        metadata: {
            shopId: order.shop_id || shop?._id,
            orderId: order._id,
            ip,
            userAgent
        }
    });

    if (otp.success === false) return otp;

    await sendSms({
        mobile: normalizedPhone,
        message: `Your order access code for ${shop?.shopName || 'this store'} is ${otp.otp}. It will expire in 5 minutes.`
    });

    return {
        success: true,
        maskedPhone: maskPhone(normalizedPhone),
        resendAvailableAt: otp.resendAvailableAt,
        expiresAt: otp.expiresAt
    };
};

const verifyPublicOrderAccessOtp = async ({ order, shopId, phone, otp, allowedActions }) => {
    const normalizedPhone = normalizeBDPhone(phone);
    if (!normalizedPhone || !exactOrderPhoneMatches(order?.shipping?.address?.phone, normalizedPhone)) {
        const err = new Error('Order not found. Please check your ID and phone number.');
        err.statusCode = 404;
        throw err;
    }

    const verification = await verifyOtp({
        identifier: normalizedPhone,
        channel: 'sms',
        purpose: PURPOSES.publicOrderAccess,
        otp,
        consume: true,
        metadata: {
            shopId,
            orderId: order._id
        }
    });

    if (verification.success === false) {
        const err = new Error(verification.error || 'Invalid or expired verification code.');
        err.code = verification.code || 'INVALID_OTP';
        err.statusCode = 400;
        throw err;
    }

    return {
        accessToken: createOrderAccessToken({ shopId, orderId: order._id, allowedActions }),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
        allowedActions: normalizeAllowedActions(allowedActions)
    };
};

const requireOrderAccess = (req, { shopId, orderId, action }) => {
    const result = verifyOrderAccessToken(
        getOrderAccessTokenFromRequest(req),
        { shopId, orderId, requiredAction: action }
    );

    if (!result.valid) {
        const err = new Error('Please verify your phone number to access this order.');
        err.statusCode = 401;
        err.code = 'ORDER_ACCESS_REQUIRED';
        throw err;
    }

    return result.payload;
};

module.exports = {
    ORDER_ACCESS_ACTIONS,
    exactOrderPhoneMatches,
    sendPublicOrderAccessOtp,
    verifyPublicOrderAccessOtp,
    requireOrderAccess,
    createOrderAccessToken,
    verifyOrderAccessToken
};
