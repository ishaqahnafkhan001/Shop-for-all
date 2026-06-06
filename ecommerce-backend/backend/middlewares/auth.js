const jwt = require('jsonwebtoken');

const getTokenFromRequest = (req) => {
    if (req.cookies && req.cookies.token) return req.cookies.token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        return req.headers.authorization.split(' ')[1];
    }

    return null;
};

const attachUserFromToken = (req, token) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
        _id: decoded.id,
        role: decoded.role,
        shopId: decoded.shopId
    };

    req.tenantId = decoded.shopId;
};

exports.protect = (req, res, next) => {
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
        attachUserFromToken(req, token);

        next();

    } catch (err) {
        // Distinguish between expired tokens and completely invalid ones
        const message = err.name === 'TokenExpiredError'
            ? "Your session has expired. Please log in again."
            : "Invalid token. Please log in again.";

        return res.status(401).json({ error: message });
    }
};

exports.optionalAuth = (req, res, next) => {
    try {
        const token = getTokenFromRequest(req);

        if (!token) return next();

        if (!process.env.JWT_SECRET) {
            console.error("CRITICAL ERROR: JWT_SECRET is not defined in environment variables.");
            return res.status(500).json({ error: "Internal server error." });
        }

        attachUserFromToken(req, token);
        next();
    } catch (err) {
        req.user = null;
        req.tenantId = null;
        next();
    }
};
