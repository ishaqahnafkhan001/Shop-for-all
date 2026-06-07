const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const Account = require('../models/Account');
const PasswordReset = require('../models/PasswordReset');
const Shop = require('../models/Shop');
const ShopMembership = require('../models/ShopMembership');
const User = require('../models/User');
const { sendMail } = require('./mail/mailService');
const { passwordResetTemplate } = require('./mail/templates/passwordResetTemplate');
const {
    normalizeEmail,
    createAccountForLegacyUser,
    createMembershipForLegacyUser
} = require('./identityService');

const RESET_LIMITS = Object.freeze({
    otpDigits: 6,
    expiresMs: 10 * 60 * 1000,
    resendMs: 60 * 1000,
    requestWindowMs: 60 * 60 * 1000,
    maxRequestsPerWindow: 5,
    maxVerificationAttempts: 5,
    cleanupMs: 2 * 60 * 60 * 1000
});

const GENERIC_FORGOT_RESPONSE = 'If an account exists, an OTP has been sent.';
const INVALID_OTP_RESPONSE = 'Invalid or expired verification code.';

const getResetSecret = () => {
    const secret = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET || process.env.RESET_PASSWORD;

    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('Password reset secret is not configured');
    }

    return secret || 'development-reset-secret';
};

const maskEmail = (email) => {
    const [name = '', domain = ''] = String(email).split('@');
    const visibleName = name.length <= 2 ? `${name[0] || '*'}***` : `${name.slice(0, 2)}***`;
    return `${visibleName}@${domain || 'unknown'}`;
};

const generateResetOtp = () =>
    crypto.randomInt(0, 10 ** RESET_LIMITS.otpDigits).toString().padStart(RESET_LIMITS.otpDigits, '0');

const generateResetSessionToken = () => crypto.randomBytes(32).toString('hex');

const hashResetValue = (resetKey, value) =>
    crypto.createHmac('sha256', getResetSecret())
        .update(`${resetKey}:${value}`)
        .digest('hex');

const verifyResetValue = (resetKey, value, expectedHash) => {
    if (!value || !expectedHash) return false;

    const actualHash = hashResetValue(resetKey, value);
    const actual = Buffer.from(actualHash, 'hex');
    const expected = Buffer.from(expectedHash, 'hex');

    if (actual.length !== expected.length) return false;

    return crypto.timingSafeEqual(actual, expected);
};

const isStrongPassword = (password = '') =>
    typeof password === 'string' &&
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

const getResetKey = ({ email, audience, shopId }) =>
    `${audience}:${shopId ? String(shopId) : 'platform'}:${email}`;

const getRolesForAudience = (audience) =>
    audience === 'customer' ? ['Customer'] : ['VendorAdmin', 'VendorStaff'];

const findOrCreateAccountFromLegacy = async ({ email, audience, shop }) => {
    const roles = getRolesForAudience(audience);
    const query = {
        email,
        status: 'Active',
        role: { $in: roles }
    };

    if (shop) {
        query.shop_id = shop._id;
    }

    const legacyUsers = await User.find(query).limit(2);
    if (legacyUsers.length !== 1) return null;

    const legacyUser = legacyUsers[0];
    const account = await createAccountForLegacyUser(legacyUser);

    if (legacyUser.role !== 'SuperAdmin') {
        try {
            await createMembershipForLegacyUser(legacyUser, account);
        } catch (error) {
            if (!/duplicate key|already/i.test(error.message)) {
                throw error;
            }
        }
    }

    return account;
};

const resolveResetTarget = async ({ email, subdomain, audience = 'customer' }) => {
    const cleanEmail = normalizeEmail(email);
    const normalizedAudience = audience === 'admin' ? 'admin' : 'customer';

    let shop = null;
    if (subdomain) {
        shop = await Shop.findOne({
            subdomain: String(subdomain).trim().toLowerCase(),
            isActive: true
        }).select('_id shopName subdomain').lean();

        if (!shop) return null;
    }

    if (normalizedAudience === 'customer' && !shop) {
        return null;
    }

    let account = await Account.findOne({ email: cleanEmail, status: 'Active' });

    if (!account) {
        account = await findOrCreateAccountFromLegacy({
            email: cleanEmail,
            audience: normalizedAudience,
            shop
        });
    }

    if (!account || account.status !== 'Active') return null;

    if (account.platformRole === 'SuperAdmin' && normalizedAudience === 'admin' && !shop) {
        return {
            email: cleanEmail,
            audience: normalizedAudience,
            account,
            membership: null,
            shop: null,
            role: 'SuperAdmin',
            recipientName: account.fullName || 'there'
        };
    }

    const membershipQuery = {
        account_id: account._id,
        status: 'Active',
        role: { $in: getRolesForAudience(normalizedAudience) }
    };

    if (shop) {
        membershipQuery.shop_id = shop._id;
    }

    const membership = await ShopMembership.findOne(membershipQuery)
        .populate('legacyUser_id', 'fullName status')
        .populate('shop_id', 'shopName subdomain isActive approvalStatus')
        .sort({ createdAt: 1 });

    const memberUser = membership?.legacyUser_id;
    const memberShop = membership?.shop_id;

    if (!membership || memberUser?.status !== 'Active') return null;
    if (memberShop?.isActive === false || memberShop?.approvalStatus === 'Suspended') return null;

    return {
        email: cleanEmail,
        audience: normalizedAudience,
        account,
        membership,
        shop: memberShop || shop,
        role: membership.role,
        recipientName: memberUser?.fullName || account.fullName || 'there'
    };
};

const getResetRecord = async ({ email, audience, shopId }) => {
    const cleanEmail = normalizeEmail(email);
    const resetKey = getResetKey({ email: cleanEmail, audience, shopId });
    const now = new Date();

    let record = await PasswordReset.findOne({ resetKey });
    if (!record) {
        record = await PasswordReset.create({
            resetKey,
            email: cleanEmail,
            audience,
            shop_id: shopId || undefined,
            requestWindowStartedAt: now,
            cleanupAt: new Date(now.getTime() + RESET_LIMITS.cleanupMs)
        });
    }

    return record;
};

const applyRequestRateLimit = (record, now) => {
    if (record.blockedUntil && record.blockedUntil > now) {
        return { allowed: false, reason: 'blocked' };
    }

    const windowStartedAt = record.requestWindowStartedAt || now;
    if (now.getTime() - windowStartedAt.getTime() >= RESET_LIMITS.requestWindowMs) {
        record.requestWindowStartedAt = now;
        record.requestCount = 0;
        record.blockedUntil = undefined;
    }

    record.requestCount += 1;

    if (record.requestCount > RESET_LIMITS.maxRequestsPerWindow) {
        record.blockedUntil = new Date(now.getTime() + RESET_LIMITS.requestWindowMs);
        return { allowed: false, reason: 'request_limit' };
    }

    if (record.resendAvailableAt && record.resendAvailableAt > now) {
        return { allowed: false, reason: 'resend_wait' };
    }

    return { allowed: true };
};

const requestPasswordReset = async ({ email, subdomain, audience }) => {
    const cleanEmail = normalizeEmail(email);
    const normalizedAudience = audience === 'admin' ? 'admin' : 'customer';
    const target = await resolveResetTarget({
        email: cleanEmail,
        subdomain,
        audience: normalizedAudience
    });

    const shopId = target?.shop?._id || null;
    const record = await getResetRecord({
        email: cleanEmail,
        audience: normalizedAudience,
        shopId
    });
    const now = new Date();
    const limit = applyRequestRateLimit(record, now);

    if (!target || !limit.allowed) {
        record.cleanupAt = new Date(now.getTime() + RESET_LIMITS.cleanupMs);
        await record.save();

        console.info('[PasswordReset] OTP request suppressed', {
            email: maskEmail(cleanEmail),
            audience: normalizedAudience,
            shopId: shopId ? String(shopId) : null,
            reason: target ? limit.reason : 'no_target'
        });

        return { message: GENERIC_FORGOT_RESPONSE };
    }

    const otp = generateResetOtp();
    const resetKey = getResetKey({
        email: cleanEmail,
        audience: normalizedAudience,
        shopId
    });

    record.account_id = target.account._id;
    record.membership_id = target.membership?._id;
    record.shop_id = shopId || undefined;
    record.role = target.role;
    record.otpHash = hashResetValue(resetKey, otp);
    record.resetTokenHash = undefined;
    record.expiresAt = new Date(now.getTime() + RESET_LIMITS.expiresMs);
    record.resendAvailableAt = new Date(now.getTime() + RESET_LIMITS.resendMs);
    record.attempts = 0;
    record.verifiedAt = undefined;
    record.consumedAt = undefined;
    record.cleanupAt = new Date(now.getTime() + RESET_LIMITS.cleanupMs);
    await record.save();

    console.info('[PasswordReset] OTP generated', {
        email: maskEmail(cleanEmail),
        audience: normalizedAudience,
        shopId: shopId ? String(shopId) : null,
        role: target.role
    });

    const brandName = target.shop?.shopName || 'ScaleUp';
    await sendMail({
        type: 'reset',
        to: cleanEmail,
        senderName: brandName,
        recipientName: target.recipientName,
        subject: 'Reset Your Password',
        html: passwordResetTemplate({
            brandName,
            recipientName: target.recipientName,
            email: cleanEmail,
            otp,
            expiresInMinutes: RESET_LIMITS.expiresMs / 60000,
            supportEmail: process.env.SUPPORT_EMAIL || process.env.RESET_EMAIL
        }),
        text: `Your verification code is ${otp}. This code expires in 10 minutes. If you did not request this reset, ignore this email.`
    });

    return { message: GENERIC_FORGOT_RESPONSE };
};

const verifyResetOtp = async ({ email, subdomain, audience, otp }) => {
    const cleanEmail = normalizeEmail(email);
    const normalizedAudience = audience === 'admin' ? 'admin' : 'customer';
    const target = await resolveResetTarget({
        email: cleanEmail,
        subdomain,
        audience: normalizedAudience
    });

    if (!target) {
        console.info('[PasswordReset] OTP verify failed', {
            email: maskEmail(cleanEmail),
            audience: normalizedAudience,
            reason: 'no_target'
        });
        return { success: false, error: INVALID_OTP_RESPONSE };
    }

    const shopId = target.shop?._id || null;
    const resetKey = getResetKey({ email: cleanEmail, audience: normalizedAudience, shopId });
    const record = await PasswordReset.findOne({ resetKey });
    const now = new Date();

    if (!record || record.consumedAt || !record.expiresAt || record.expiresAt <= now || record.blockedUntil > now) {
        return { success: false, error: INVALID_OTP_RESPONSE };
    }

    if (record.attempts >= RESET_LIMITS.maxVerificationAttempts) {
        record.blockedUntil = new Date(now.getTime() + RESET_LIMITS.requestWindowMs);
        record.cleanupAt = new Date(now.getTime() + RESET_LIMITS.cleanupMs);
        await record.save();
        console.warn('[PasswordReset] Abuse detection triggered', {
            email: maskEmail(cleanEmail),
            audience: normalizedAudience,
            shopId: shopId ? String(shopId) : null
        });
        return { success: false, error: INVALID_OTP_RESPONSE };
    }

    const otpMatches = verifyResetValue(resetKey, otp, record.otpHash);
    if (!otpMatches) {
        record.attempts += 1;
        if (record.attempts >= RESET_LIMITS.maxVerificationAttempts) {
            record.blockedUntil = new Date(now.getTime() + RESET_LIMITS.requestWindowMs);
        }
        await record.save();
        console.info('[PasswordReset] OTP verify failed', {
            email: maskEmail(cleanEmail),
            audience: normalizedAudience,
            shopId: shopId ? String(shopId) : null,
            attempts: record.attempts
        });
        return { success: false, error: INVALID_OTP_RESPONSE };
    }

    const resetToken = generateResetSessionToken();
    record.resetTokenHash = hashResetValue(resetKey, resetToken);
    record.verifiedAt = now;
    record.attempts = 0;
    await record.save();

    console.info('[PasswordReset] OTP verified', {
        email: maskEmail(cleanEmail),
        audience: normalizedAudience,
        shopId: shopId ? String(shopId) : null
    });

    return {
        success: true,
        resetToken,
        message: 'Verification successful.'
    };
};

const resetPassword = async ({ email, subdomain, audience, resetToken, password }) => {
    const cleanEmail = normalizeEmail(email);
    const normalizedAudience = audience === 'admin' ? 'admin' : 'customer';

    if (!isStrongPassword(password)) {
        return {
            success: false,
            status: 400,
            error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
        };
    }

    const target = await resolveResetTarget({
        email: cleanEmail,
        subdomain,
        audience: normalizedAudience
    });

    if (!target) {
        return { success: false, status: 400, error: 'Reset session is invalid or expired.' };
    }

    const shopId = target.shop?._id || null;
    const resetKey = getResetKey({ email: cleanEmail, audience: normalizedAudience, shopId });
    const record = await PasswordReset.findOne({ resetKey });
    const now = new Date();

    if (
        !record ||
        record.consumedAt ||
        !record.verifiedAt ||
        !record.resetTokenHash ||
        !record.expiresAt ||
        record.expiresAt <= now ||
        !verifyResetValue(resetKey, resetToken, record.resetTokenHash)
    ) {
        console.info('[PasswordReset] Password reset failed', {
            email: maskEmail(cleanEmail),
            audience: normalizedAudience,
            shopId: shopId ? String(shopId) : null
        });
        return { success: false, status: 400, error: 'Reset session is invalid or expired.' };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await Account.updateOne({ _id: target.account._id }, { $set: { passwordHash } });
    await User.updateMany({ account_id: target.account._id }, { $set: { password: passwordHash } });

    record.otpHash = undefined;
    record.resetTokenHash = undefined;
    record.consumedAt = now;
    record.cleanupAt = new Date(now.getTime() + RESET_LIMITS.resendMs);
    await record.save();

    console.info('[PasswordReset] Password changed', {
        email: maskEmail(cleanEmail),
        audience: normalizedAudience,
        shopId: shopId ? String(shopId) : null,
        role: target.role
    });

    return {
        success: true,
        message: 'Password changed successfully.'
    };
};

module.exports = {
    RESET_LIMITS,
    GENERIC_FORGOT_RESPONSE,
    INVALID_OTP_RESPONSE,
    generateResetOtp,
    hashResetValue,
    verifyResetValue,
    isStrongPassword,
    requestPasswordReset,
    verifyResetOtp,
    resetPassword
};
