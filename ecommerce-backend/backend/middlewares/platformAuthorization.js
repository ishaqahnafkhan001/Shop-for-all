const {
    hasPlatformPermission,
    isPlatformRole
} = require('../config/platformPermissions');

const RECENT_AUTH_MAX_AGE_MS = Math.max(
    60 * 1000,
    Number(process.env.PLATFORM_RECENT_AUTH_MAX_AGE_MS) || 15 * 60 * 1000
);

const requirePlatformRole = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Please login first.' });
    }
    if (!isPlatformRole(req.user.role)) {
        return res.status(403).json({ success: false, code: 'PLATFORM_ACCESS_DENIED', error: 'Platform access denied.' });
    }
    next();
};

const requirePlatformPermission = (permission) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Please login first.' });
    }
    if (!hasPlatformPermission(req.user.role, permission)) {
        return res.status(403).json({
            success: false,
            code: 'PLATFORM_PERMISSION_REQUIRED',
            permission,
            error: `Missing platform permission: ${permission}`
        });
    }
    next();
};

const requireRecentAuthentication = (req, res, next) => {
    const authTime = Number(req.user?.authTime || 0);
    if (!authTime || Date.now() - authTime > RECENT_AUTH_MAX_AGE_MS) {
        return res.status(403).json({
            success: false,
            code: 'RECENT_AUTH_REQUIRED',
            error: 'Confirm your password before performing this sensitive action.',
            maxAgeSeconds: Math.floor(RECENT_AUTH_MAX_AGE_MS / 1000)
        });
    }
    next();
};

module.exports = {
    RECENT_AUTH_MAX_AGE_MS,
    requirePlatformPermission,
    requirePlatformRole,
    requireRecentAuthentication
};
