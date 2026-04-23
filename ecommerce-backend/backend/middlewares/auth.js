const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {
    try {
        // 1. Look for the token in the cookies
        let token = req.cookies.token;

        // (Optional Fallback) Check Authorization header just in case you test with Postman
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ error: "Not authorized to access this route. Please log in." });
        }

        // 2. Verify the token using your secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Attach the decoded user data (userId, role, shopId) to the request object!
        req.user = decoded;

        // 4. Pass control to the next function (the controller)
        next();
    } catch (err) {
        return res.status(401).json({ error: "Session expired or invalid token. Please log in again." });
    }
};