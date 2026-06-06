const User = require('../models/User');

exports.requirePermission = (permissionName) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized: Please login first' });
            }

            if (['SuperAdmin', 'VendorAdmin'].includes(req.user.role)) {
                return next();
            }

            if (req.user.role !== 'VendorStaff') {
                return res.status(403).json({ error: 'Permission denied' });
            }

            const user = await User.findById(req.user._id)
                .select('permissions status')
                .lean();

            if (!user || user.status !== 'Active') {
                return res.status(403).json({ error: 'Staff account is inactive' });
            }

            if (!user.permissions?.[permissionName]) {
                return res.status(403).json({
                    error: `Missing staff permission: ${permissionName}`
                });
            }

            next();
        } catch (err) {
            console.error('Permission check error:', err);
            res.status(500).json({ error: 'Unable to verify staff permission' });
        }
    };
};
