const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const getCsrfSecret = () => {
    const secret = process.env.CSRF_SECRET || process.env.JWT_SECRET;

    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('CSRF secret is not configured');
    }

    return secret || 'development-csrf-secret';
};

const getCsrfCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        partitioned: isProduction,
        maxAge: 2 * 60 * 60 * 1000,
        path: '/',
        domain: undefined
    };
};

const signNonce = (nonce) =>
    crypto.createHmac('sha256', getCsrfSecret()).update(nonce).digest('hex');

const createCsrfToken = () => {
    const nonce = crypto.randomBytes(32).toString('hex');
    return `${nonce}.${signNonce(nonce)}`;
};

const timingSafeStringEqual = (left, right) => {
    const leftValue = Buffer.from(String(left || ''));
    const rightValue = Buffer.from(String(right || ''));

    if (leftValue.length !== rightValue.length) return false;

    return crypto.timingSafeEqual(leftValue, rightValue);
};

const isValidCsrfToken = (token) => {
    const [nonce, signature] = String(token || '').split('.');
    if (!nonce || !signature || !/^[a-f0-9]{64}$/i.test(nonce)) return false;

    return timingSafeStringEqual(signature, signNonce(nonce));
};

const getRequestPath = (req) => String(req.originalUrl || req.url || '').split('?')[0];

const isExcludedRoute = (req) => {
    const method = String(req.method || '').toUpperCase();
    const path = getRequestPath(req);

    if (!UNSAFE_METHODS.has(method)) return true;
    if (path === '/api/auth/csrf-token') return true;
    if (method === 'POST' && path === '/api/auth/login') return true;
    if (method === 'POST' && path === '/api/auth/forgot-password') return true;
    if (method === 'POST' && path === '/api/auth/verify-reset-otp') return true;
    if (method === 'POST' && path === '/api/auth/reset-password') return true;
    if (method === 'POST' && path === '/api/analytics/event') return true;

    return false;
};

const issueCsrfToken = (req, res) => {
    const csrfToken = createCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

    return res.status(200).json({
        success: true,
        csrfToken
    });
};

const csrfProtection = (req, res, next) => {
    if (isExcludedRoute(req)) return next();

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.get(CSRF_HEADER_NAME);

    if (
        !cookieToken ||
        !headerToken ||
        !timingSafeStringEqual(cookieToken, headerToken) ||
        !isValidCsrfToken(headerToken)
    ) {
        return res.status(403).json({
            success: false,
            error: 'Invalid CSRF token'
        });
    }

    return next();
};

module.exports = {
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    createCsrfToken,
    csrfProtection,
    issueCsrfToken,
    isValidCsrfToken
};
