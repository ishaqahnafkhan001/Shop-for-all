const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
    try {
        let token;

        // 1. Check Cookies (Web App)
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        // 2. Check Headers (Mobile App / Postman)
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 5. Attach stateless user object to request
        req.user = {
            _id: decoded.id,
            role: decoded.role,
            shopId: decoded.shopId
        };

        // Note: Be cautious if you also have a resolveTenant middleware setting this!
        req.tenantId = decoded.shopId;

        next();

    } catch (err) {
        // Distinguish between expired tokens and completely invalid ones
        const message = err.name === 'TokenExpiredError'
            ? "Your session has expired. Please log in again."
            : "Invalid token. Please log in again.";

        return res.status(401).json({ error: message });
    }
};