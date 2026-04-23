exports.errorHandler = (err, req, res, next) => {
    console.error(err.stack.red); // Logs the error in your terminal

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

    res.status(statusCode).json({
        error: message,
        // Only show the messy stack trace if you are in development mode
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};