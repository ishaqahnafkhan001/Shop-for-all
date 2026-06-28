const crypto = require('crypto');

const OTP = require('../models/OTP');
const { normalizeEmail } = require('./identityService');
const {
    INVALID_OTP_RESPONSE,
    PURPOSES,
    createOtp,
    verifyOtp,
    generateOtp,
    hashValue
} = require('./otpService');

const REGISTRATION_OTP_LIMITS = Object.freeze({
    digits: 6,
    expiresMs: 5 * 60 * 1000,
    maxAttempts: 5
});

const PURPOSE = 'registration';
const getOtpSecret = () => {
    const secret = process.env.REGISTRATION_OTP_SECRET || process.env.JWT_SECRET || process.env.RESET_PASSWORD || process.env.PASS;

    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('Registration OTP secret is not configured');
    }

    return secret || 'development-registration-otp-secret';
};

const generateRegistrationOtp = () => generateOtp();

const getOtpKey = (email) => `${PURPOSE}:${normalizeEmail(email)}`;

const hashRegistrationOtp = (email, otp) =>
    crypto.createHmac('sha256', getOtpSecret())
        .update(`${getOtpKey(email)}:${otp}`)
        .digest('hex');

const verifyRegistrationOtpHash = (email, otp, expectedHash) => {
    if (!otp || !expectedHash) return false;

    const actualHash = hashRegistrationOtp(email, otp);
    const actual = Buffer.from(actualHash, 'hex');
    const expected = Buffer.from(String(expectedHash), 'hex');

    if (actual.length !== expected.length) return false;

    return crypto.timingSafeEqual(actual, expected);
};

const createOrReplaceRegistrationOtp = async ({ email, session }) => {
    const cleanEmail = normalizeEmail(email);
    const result = await createOtp({
        identifier: cleanEmail,
        channel: 'email',
        purpose: PURPOSES.legacyRegistration,
        session,
        enforceCooldown: false
    });

    if (!result.success) throw new Error(result.error || 'Unable to create OTP');
    return result.otp;
};

const consumeRegistrationOtp = async ({ email, otp, session }) => {
    const cleanEmail = normalizeEmail(email);
    const modernResult = await verifyOtp({
        identifier: cleanEmail,
        channel: 'email',
        purpose: PURPOSES.legacyRegistration,
        otp,
        session,
        consume: true
    });

    if (modernResult.success) return { success: true };

    const record = await OTP.findOne({ email: cleanEmail, purpose: PURPOSE }).session(session || null);
    const now = new Date();

    if (
        !record ||
        !record.otpHash ||
        record.usedAt ||
        record.consumedAt ||
        !record.expiresAt ||
        record.expiresAt <= now ||
        record.attempts >= REGISTRATION_OTP_LIMITS.maxAttempts
    ) {
        return { success: false, error: INVALID_OTP_RESPONSE };
    }

    const matches = verifyRegistrationOtpHash(cleanEmail, otp, record.otpHash);
    if (!matches) {
        record.attempts += 1;
        await record.save({ session });
        return { success: false, error: INVALID_OTP_RESPONSE };
    }

    record.usedAt = now;
    record.consumedAt = now;
    await record.save({ session });

    return { success: true };
};

module.exports = {
    INVALID_OTP_RESPONSE,
    PURPOSE,
    REGISTRATION_OTP_LIMITS,
    consumeRegistrationOtp,
    createOrReplaceRegistrationOtp,
    generateRegistrationOtp,
    hashRegistrationOtp,
    hashValue,
    verifyRegistrationOtpHash
};
