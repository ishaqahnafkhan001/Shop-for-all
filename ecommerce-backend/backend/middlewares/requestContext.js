const crypto = require('crypto');
const logger = require('../services/logger');

const getSafeUser = (req) => ({
    userId: req.user?._id || req.user?.id || req.user?.accountId || null,
    role: req.user?.role || null,
    shopId: req.tenantId || req.user?.shop_id || req.user?.shopId || null
});

exports.requestContext = (req, res, next) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('x-request-id', req.id);

    const startedAt = Date.now();
    res.on('finish', () => {
        const durationMs = Date.now() - startedAt;
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        logger[level]('http_request', {
            requestId: req.id,
            method: req.method,
            path: req.originalUrl || req.url,
            status: res.statusCode,
            durationMs,
            ...getSafeUser(req)
        });
    });

    next();
};
