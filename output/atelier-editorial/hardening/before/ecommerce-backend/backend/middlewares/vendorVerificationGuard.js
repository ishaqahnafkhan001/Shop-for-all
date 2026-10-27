const { ensureShopVerificationStatus, isVerificationSuspension } = require('../services/vendorVerificationService');

exports.blockVerificationSuspendedShop = async (req, res, next) => {
    try {
        if (!req.tenantId) return next();

        const { shop, status } = await ensureShopVerificationStatus(req.tenantId, { req, owner: req.user });

        if (isVerificationSuspension(shop)) {
            return res.status(403).json({
                success: false,
                code: 'VERIFICATION_REQUIRED',
                error: 'Your store is suspended until NID verification is approved.',
                verification: status
            });
        }

        next();
    } catch (err) {
        console.error('Verification guard error:', err);
        res.status(500).json({ success: false, error: 'Unable to verify store status' });
    }
};
