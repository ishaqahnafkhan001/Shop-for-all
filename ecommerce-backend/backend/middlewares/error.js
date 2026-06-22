const logger = require('../services/logger');

exports.errorHandler = (err, req, res, next) => {
    // FIX: err.stack.red crashes the handler itself if the `colors` package is not
    // installed or not imported. Use err.stack directly — terminal colouring belongs
    // in the logger layer, not in error handling middleware.
    logger.error('unhandled_error', {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        userId: req.user?._id || req.user?.id || null,
        role: req.user?.role || null,
        shopId: req.tenantId || req.user?.shop_id || null,
        error: err
    });

    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message || "Internal Server Error";

    // Catch Mongoose bad ObjectId errors (e.g., someone types a random ID in the URL)
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404;
        message = "Resource not found. Invalid ID format.";
    }

    // Catch Mongoose duplicate key errors
    if (err.code === 11000) {
        statusCode = 400;
        message = "Duplicate field value entered. Please use another value.";
    }

    // FIX: Mongoose validation failures (e.g. required field missing, enum mismatch)
    // were falling through to the default 500. They are client errors and must return 400.
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map(e => e.message).join(', ');
    }

    res.status(statusCode).json({
        error: message,
        requestId: req.id,
        // Only show the stack trace in development
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};
