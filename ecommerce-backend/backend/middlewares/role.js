// This is a dynamic middleware. You pass it an array of allowed roles.
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // req.user was just created by the `protect` middleware!
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `User role '${req.user.role}' is not authorized to perform this action.`
            });
        }
        next();
    };
};