const crypto = require('crypto');

const { PURPOSES, consumeVerifiedOtpProof, createOtp, verifyOtp } = require('../otpService');
const { sendSms, SmsProviderError } = require('../sms/smsProviderService');
const { maskPhone, normalizeBDPhone } = require('../../utils/phoneUtils');

class CheckoutOtpError extends Error {
    constructor(message, code = 'INVALID_OTP', statusCode = 400) {
        super(message);
        this.name = 'CheckoutOtpError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

const getItemProductId = (item = {}) => String(item.productId || item.product || item._id || '').trim();
const getItemVariantId = (item = {}) => String(item.variantId || item.selectedVariant?._id || '').trim();

const buildCheckoutItemsHash = (items = []) => {
    const normalized = (Array.isArray(items) ? items : [])
        .map(item => ({
            productId: getItemProductId(item),
            variantId: getItemVariantId(item),
            quantity: Number(item.quantity || 0)
        }))
        .filter(item => item.productId && Number.isInteger(item.quantity) && item.quantity > 0)
        .sort((a, b) => `${a.productId}:${a.variantId}`.localeCompare(`${b.productId}:${b.variantId}`));

    if (normalized.length === 0) return '';

    return crypto.createHash('sha256')
        .update(JSON.stringify(normalized))
        .digest('hex');
};

const getCheckoutMetadata = ({ shopId, checkoutSessionId, cartHash }) => ({
    shopId: String(shopId || ''),
    checkoutSessionId: String(checkoutSessionId || ''),
    cartHash: String(cartHash || '')
});

const sendCheckoutPhoneOtp = async ({ shop, phone, checkoutSessionId, items }) => {
    const normalizedPhone = normalizeBDPhone(phone);
    if (!normalizedPhone) {
        throw new CheckoutOtpError('Enter a valid Bangladesh mobile number.', 'INVALID_PHONE');
    }

    const cartHash = buildCheckoutItemsHash(items);
    if (!cartHash) {
        throw new CheckoutOtpError('Cart is required before phone verification.', 'EMPTY_CART');
    }

    if (!checkoutSessionId) {
        throw new CheckoutOtpError('Checkout session is required.', 'CHECKOUT_SESSION_REQUIRED');
    }

    const result = await createOtp({
        identifier: normalizedPhone,
        channel: 'sms',
        purpose: PURPOSES.customerOrderPhone,
        metadata: getCheckoutMetadata({ shopId: shop._id, checkoutSessionId, cartHash })
    });

    if (!result.success) {
        throw new CheckoutOtpError(
            result.error || 'Please wait before requesting another code.',
            result.code || 'OTP_RESEND_COOLDOWN',
            429
        );
    }

    try {
        await sendSms({
            mobile: normalizedPhone,
            message: `Your order verification code for ${shop.shopName || 'this store'} is ${result.otp}. It will expire in 5 minutes.`
        });
    } catch (error) {
        if (error instanceof SmsProviderError) {
            throw new CheckoutOtpError(
                'Could not send verification SMS. Please check the phone number or try again shortly.',
                'SMS_DELIVERY_FAILED',
                502
            );
        }
        throw error;
    }

    return {
        phone: normalizedPhone,
        maskedPhone: maskPhone(normalizedPhone),
        expiresAt: result.expiresAt,
        resendAvailableAt: result.resendAvailableAt
    };
};

const verifyCheckoutPhoneOtp = async ({ shopId, phone, checkoutSessionId, items, otp }) => {
    const normalizedPhone = normalizeBDPhone(phone);
    const cartHash = buildCheckoutItemsHash(items);

    if (!normalizedPhone || !cartHash || !checkoutSessionId) {
        throw new CheckoutOtpError('Please verify your phone number before placing the order.', 'PHONE_OTP_REQUIRED');
    }

    const result = await verifyOtp({
        identifier: normalizedPhone,
        channel: 'sms',
        purpose: PURPOSES.customerOrderPhone,
        otp,
        metadata: getCheckoutMetadata({ shopId, checkoutSessionId, cartHash }),
        issueProof: true
    });

    if (!result.success) {
        throw new CheckoutOtpError('Invalid or expired verification code.', result.code || 'INVALID_OTP');
    }

    return {
        phone: normalizedPhone,
        maskedPhone: maskPhone(normalizedPhone),
        verificationToken: result.verificationToken,
        expiresAt: result.expiresAt
    };
};

const consumeCheckoutPhoneProof = async ({ shopId, phone, checkoutSessionId, items, verificationToken, session }) => {
    const normalizedPhone = normalizeBDPhone(phone);
    const cartHash = buildCheckoutItemsHash(items);

    if (!normalizedPhone || !cartHash || !checkoutSessionId || !verificationToken) {
        throw new CheckoutOtpError('Please verify your phone number before placing the order.', 'PHONE_OTP_REQUIRED');
    }

    const result = await consumeVerifiedOtpProof({
        identifier: normalizedPhone,
        channel: 'sms',
        purpose: PURPOSES.customerOrderPhone,
        verificationToken,
        metadata: getCheckoutMetadata({ shopId, checkoutSessionId, cartHash }),
        session
    });

    if (!result.success) {
        throw new CheckoutOtpError('Invalid or expired verification code.', result.code || 'INVALID_OTP');
    }

    return {
        phone: normalizedPhone,
        cartHash
    };
};

module.exports = {
    CheckoutOtpError,
    buildCheckoutItemsHash,
    consumeCheckoutPhoneProof,
    sendCheckoutPhoneOtp,
    verifyCheckoutPhoneOtp
};
