const crypto = require('crypto');

const OTP = require('../models/OTP');
const { normalizeEmail } = require('./identityService');

const REGISTRATION_OTP_LIMITS = Object.freeze({
    digits: 6,
    expiresMs: 5 * 60 * 1000,
    maxAttempts: 5
});

const PURPOSE = 'registration';
const INVALID_OTP_RESPONSE = 'Invalid or expired verification code.';

const getOtpSecret = () => {
    const secret = process.env.REGISTRATION_OTP_SECRET || process.env.JWT_SECRET || process.env.RESET_PASSWORD || process.env.PASS;

    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('Registration OTP secret is not configured');
    }

    return secret || 'development-registration-otp-secret';
};

const generateRegistrationOtp = () =>
    crypto.randomInt(0, 10 ** REGISTRATION_OTP_LIMITS.digits)
        .toString()
        .padStart(REGISTRATION_OTP_LIMITS.digits, '0');

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
    const otp = generateRegistrationOtp();
    const now = new Date();

    await OTP.findOneAndUpdate(
        { email: cleanEmail, purpose: PURPOSE },
        {
            $set: {
                email: cleanEmail,
                purpose: PURPOSE,
                otpHash: hashRegistrationOtp(cleanEmail, otp),
                attempts: 0,
                usedAt: null,
                expiresAt: new Date(now.getTime() + REGISTRATION_OTP_LIMITS.expiresMs),
                createdAt: now
            },
            $unset: { otp: '' }
        },
        {
            upsert: true,
            new: true,
            session
        }
    );

    return otp;
};

const consumeRegistrationOtp = async ({ email, otp, session }) => {
    const cleanEmail = normalizeEmail(email);
    const record = await OTP.findOne({ email: cleanEmail, purpose: PURPOSE }).session(session || null);
    const now = new Date();

    if (
        !record ||
        !record.otpHash ||
        record.usedAt ||
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
    verifyRegistrationOtpHash
};
