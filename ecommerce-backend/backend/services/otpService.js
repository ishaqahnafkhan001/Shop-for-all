const crypto = require('crypto');

const OTP = require('../models/OTP');

const OTP_LIMITS = Object.freeze({
    digits: 6,
    expiresMs: Number(process.env.SMS_OTP_EXPIRY_MINUTES || 5) * 60 * 1000,
    resendCooldownMs: Number(process.env.SMS_OTP_RESEND_COOLDOWN_SECONDS || 60) * 1000,
    maxAttempts: Number(process.env.SMS_OTP_MAX_ATTEMPTS || 5),
    proofExpiresMs: 10 * 60 * 1000
});

const PURPOSES = Object.freeze({
    legacyRegistration: 'registration',
    vendorRegistrationEmail: 'vendor_registration_email',
    vendorRegistrationPhone: 'vendor_registration_phone',
    vendorPhoneVerification: 'vendor_phone_verification',
    customerOrderPhone: 'customer_order_phone'
});

const INVALID_OTP_RESPONSE = 'Invalid or expired verification code.';

const getOtpSecret = () => {
    const secret = process.env.REGISTRATION_OTP_SECRET || process.env.SMS_OTP_SECRET || process.env.JWT_SECRET || process.env.RESET_PASSWORD || process.env.PASS;

    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('OTP secret is not configured');
    }

    return secret || 'development-generic-otp-secret';
};

const generateOtp = () =>
    crypto.randomInt(0, 10 ** OTP_LIMITS.digits)
        .toString()
        .padStart(OTP_LIMITS.digits, '0');

const normalizeIdentifier = (identifier = '') => String(identifier || '').trim().toLowerCase();

const metadataKeyParts = (metadata = {}) => [
    metadata.shopId ? `shop:${metadata.shopId}` : '',
    metadata.userId ? `user:${metadata.userId}` : '',
    metadata.checkoutSessionId ? `session:${metadata.checkoutSessionId}` : ''
].filter(Boolean);

const buildOtpKey = ({ purpose, channel = 'email', identifier, metadata = {} }) => [
    purpose,
    channel,
    normalizeIdentifier(identifier),
    ...metadataKeyParts(metadata)
].join(':');

const hashValue = (key, value) =>
    crypto.createHmac('sha256', getOtpSecret())
        .update(`${key}:${value}`)
        .digest('hex');

const timingSafeEqualHex = (left, right) => {
    if (!left || !right) return false;
    const leftBuffer = Buffer.from(String(left), 'hex');
    const rightBuffer = Buffer.from(String(right), 'hex');
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const secondsUntil = (date) => Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 1000));

const createOtp = async ({
    identifier,
    channel = 'email',
    purpose,
    metadata = {},
    session,
    enforceCooldown = true
}) => {
    const cleanIdentifier = normalizeIdentifier(identifier);
    const key = buildOtpKey({ purpose, channel, identifier: cleanIdentifier, metadata });
    const now = new Date();
    const existing = await OTP.findOne({ key }).session(session || null);

    if (
        enforceCooldown &&
        existing &&
        !existing.consumedAt &&
        !existing.usedAt &&
        existing.resendAvailableAt &&
        existing.resendAvailableAt > now
    ) {
        return {
            success: false,
            code: 'OTP_RESEND_COOLDOWN',
            error: 'Please wait before requesting another verification code.',
            retryAfterSeconds: secondsUntil(existing.resendAvailableAt)
        };
    }

    const otp = generateOtp();
    await OTP.findOneAndUpdate(
        { key },
        {
            $set: {
                key,
                email: key,
                identifier: cleanIdentifier,
                channel,
                purpose,
                otpHash: hashValue(key, otp),
                attempts: 0,
                maxAttempts: OTP_LIMITS.maxAttempts,
                usedAt: null,
                consumedAt: null,
                verifiedAt: null,
                resendAvailableAt: new Date(now.getTime() + OTP_LIMITS.resendCooldownMs),
                expiresAt: new Date(now.getTime() + OTP_LIMITS.expiresMs),
                metadata,
                createdAt: now
            },
            $unset: {
                otp: '',
                verificationTokenHash: '',
                verificationTokenExpiresAt: ''
            }
        },
        { upsert: true, new: true, session }
    );

    return {
        success: true,
        otp,
        expiresAt: new Date(now.getTime() + OTP_LIMITS.expiresMs),
        resendAvailableAt: new Date(now.getTime() + OTP_LIMITS.resendCooldownMs)
    };
};

const metadataMatches = (stored = {}, expected = {}) => Object.entries(expected || {}).every(([key, value]) => (
    value === undefined || value === null || String(stored?.[key] || '') === String(value)
));

const verifyOtp = async ({
    identifier,
    channel = 'email',
    purpose,
    otp,
    metadata = {},
    session,
    consume = false,
    issueProof = false
}) => {
    const cleanIdentifier = normalizeIdentifier(identifier);
    const key = buildOtpKey({ purpose, channel, identifier: cleanIdentifier, metadata });
    const record = await OTP.findOne({ key }).session(session || null);
    const now = new Date();

    if (
        !record ||
        !record.otpHash ||
        record.consumedAt ||
        record.usedAt ||
        !record.expiresAt ||
        record.expiresAt <= now ||
        record.attempts >= (record.maxAttempts || OTP_LIMITS.maxAttempts) ||
        !metadataMatches(record.metadata || {}, metadata)
    ) {
        return { success: false, error: INVALID_OTP_RESPONSE, code: 'INVALID_OTP' };
    }

    if (!timingSafeEqualHex(hashValue(record.key || key, otp), record.otpHash)) {
        record.attempts += 1;
        await record.save({ session });
        return { success: false, error: INVALID_OTP_RESPONSE, code: 'INVALID_OTP' };
    }

    const update = {
        verifiedAt: now
    };
    const result = {
        success: true,
        verifiedAt: now
    };

    if (consume) {
        update.usedAt = now;
        update.consumedAt = now;
    }

    if (issueProof) {
        const token = crypto.randomBytes(32).toString('hex');
        update.verificationTokenHash = hashValue(record.key || key, token);
        update.verificationTokenExpiresAt = new Date(now.getTime() + OTP_LIMITS.proofExpiresMs);
        result.verificationToken = token;
        result.expiresAt = update.verificationTokenExpiresAt;
    }

    Object.assign(record, update);
    await record.save({ session });
    return result;
};

const consumeVerifiedOtpProof = async ({
    identifier,
    channel = 'sms',
    purpose,
    verificationToken,
    metadata = {},
    session
}) => {
    const cleanIdentifier = normalizeIdentifier(identifier);
    const key = buildOtpKey({ purpose, channel, identifier: cleanIdentifier, metadata });
    const record = await OTP.findOne({ key }).session(session || null);
    const now = new Date();

    if (
        !record ||
        !record.verifiedAt ||
        record.consumedAt ||
        !record.verificationTokenHash ||
        !record.verificationTokenExpiresAt ||
        record.verificationTokenExpiresAt <= now ||
        !metadataMatches(record.metadata || {}, metadata)
    ) {
        return { success: false, error: INVALID_OTP_RESPONSE, code: 'INVALID_OTP' };
    }

    const matches = timingSafeEqualHex(hashValue(record.key || key, verificationToken), record.verificationTokenHash);
    if (!matches) {
        return { success: false, error: INVALID_OTP_RESPONSE, code: 'INVALID_OTP' };
    }

    record.consumedAt = now;
    record.usedAt = now;
    await record.save({ session });
    return { success: true };
};

module.exports = {
    INVALID_OTP_RESPONSE,
    OTP_LIMITS,
    PURPOSES,
    buildOtpKey,
    consumeVerifiedOtpProof,
    createOtp,
    generateOtp,
    hashValue,
    verifyOtp
};
