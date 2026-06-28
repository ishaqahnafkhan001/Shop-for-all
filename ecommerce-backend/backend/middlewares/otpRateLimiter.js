const rateLimit = require('express-rate-limit');

const getIdentifier = (req) => (
    req.body?.phone ||
    req.body?.email ||
    req.body?.identifier ||
    req.ip ||
    ''
);

const otpRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 12 : 120,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}:${String(getIdentifier(req)).trim().toLowerCase()}`,
    message: {
        success: false,
        code: 'OTP_RATE_LIMITED',
        error: 'Too many verification attempts. Please try again later.'
    }
});

module.exports = {
    otpRateLimiter
};
