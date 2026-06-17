const jwt = require('jsonwebtoken');
const Account = require('../models/Account');
const User = require('../models/User');
const Shop = require('../models/Shop');
const ShopMembership = require('../models/ShopMembership');
const { isVerificationSuspension } = require('../services/vendorVerificationService');

const getTokenFromRequest = (req) => {
    if (req.cookies && req.cookies.token) return req.cookies.token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        return req.headers.authorization.split(' ')[1];
    }

    return null;
};

const attachUserFromToken = async (req, token) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const resolvedTenantId = req.tenantId ? String(req.tenantId) : null;

    if (decoded.accountId) {
        const account = await Account.findById(decoded.accountId).select('status platformRole').lean();

        if (!account || account.status !== 'Active') {
            throw new Error('Account inactive');
        }

        const legacyUser = await User.findById(decoded.id)
            .select('fullName email role shop_id status account_id membership_id permissions')
            .lean();

        if (!legacyUser || legacyUser.status !== 'Active') {
            throw new Error('User inactive');
        }

        if (legacyUser.role === 'SuperAdmin') {
            if (account.platformRole !== 'SuperAdmin') throw new Error('Invalid platform role');
        } else {
            const membership = await ShopMembership.findOne({
                _id: decoded.membershipId,
                account_id: decoded.accountId,
                legacyUser_id: decoded.id,
                status: 'Active'
            }).lean();

            if (!membership) throw new Error('Membership inactive');
            if (resolvedTenantId && String(membership.shop_id) !== resolvedTenantId) {
                throw new Error('Membership does not belong to requested shop');
            }

            const shop = await Shop.findById(membership.shop_id)
                .select('isActive approvalStatus suspensionReason verification')
                .lean();

            const canAccessVerificationRecovery = isVerificationSuspension(shop) &&
                ['VendorAdmin', 'VendorStaff'].includes(legacyUser.role);

            if (!shop || ((shop.isActive === false || shop.approvalStatus === 'Suspended') && !canAccessVerificationRecovery)) {
                throw new Error('Shop inactive');
            }
        }

        req.user = {
            _id: decoded.id,
            id: decoded.id,
            accountId: decoded.accountId,
            membershipId: decoded.membershipId,
            role: legacyUser.role,
            fullName: legacyUser.fullName,
            email: legacyUser.email,
            shopId: legacyUser.shop_id,
            shop_id: legacyUser.shop_id,
            permissions: legacyUser.permissions
        };

        req.tenantId = resolvedTenantId || legacyUser.shop_id;
        return;
    }

    if (resolvedTenantId && decoded.shopId && String(decoded.shopId) !== resolvedTenantId) {
        throw new Error('Token does not belong to requested shop');
    }

    if (decoded.shopId && ['VendorAdmin', 'VendorStaff'].includes(decoded.role)) {
        const shop = await Shop.findById(decoded.shopId)
            .select('isActive approvalStatus suspensionReason verification')
            .lean();
        const canAccessVerificationRecovery = isVerificationSuspension(shop);
        if (!shop || ((shop.isActive === false || shop.approvalStatus === 'Suspended') && !canAccessVerificationRecovery)) {
            throw new Error('Shop inactive');
        }
    }

    req.user = {
        _id: decoded.id,
        id: decoded.id,
        role: decoded.role,
        fullName: decoded.fullName,
        email: decoded.email,
        shopId: decoded.shopId,
        shop_id: decoded.shopId
    };

    req.tenantId = resolvedTenantId || decoded.shopId;
};

exports.protect = async (req, res, next) => {
    try {
        const token = getTokenFromRequest(req);

        // 3. Block if no token
        if (!token) {
            return res.status(401).json({ error: "Not authorized. Please login again." });
        }

        // 🛡️ Safety check to prevent catastrophic crashes if .env is missing
        if (!process.env.JWT_SECRET) {
            console.error("CRITICAL ERROR: JWT_SECRET is not defined in environment variables.");
            return res.status(500).json({ error: "Internal server error." });
        }

        // 4. Verify & Decode
        await attachUserFromToken(req, token);

        next();

    } catch (err) {
        // Distinguish between expired tokens and completely invalid ones
        const message = err.name === 'TokenExpiredError'
            ? "Your session has expired. Please log in again."
            : "Invalid token. Please log in again.";

        return res.status(401).json({ error: message });
    }
};

exports.optionalAuth = async (req, res, next) => {
    try {
        const token = getTokenFromRequest(req);

        if (!token) return next();

        if (!process.env.JWT_SECRET) {
            console.error("CRITICAL ERROR: JWT_SECRET is not defined in environment variables.");
            return res.status(500).json({ error: "Internal server error." });
        }

        await attachUserFromToken(req, token);
        next();
    } catch (err) {
        req.user = null;
        req.tenantId = null;
        next();
    }
};
