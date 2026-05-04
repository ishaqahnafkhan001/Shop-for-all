const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
    try {
        let token;

        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        else if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ error: "Not authorized. Please login again." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            _id: decoded.id,
            role: decoded.role,
            shopId: decoded.shopId
        };

        req.tenantId = decoded.shopId;
        
        next();

    } catch (err) {
        return res.status(401).json({ error: "Session expired or invalid token" });
    }
};