const { ensureShopVerificationStatus, isVerificationSuspension } = require('../services/vendorVerificationService');

exports.blockVerificationSuspendedShop = async (req, res, next) => {
    try {
        if (!req.tenantId) return next();

        let verification;
        try {
            verification = await ensureShopVerificationStatus(req.tenantId, { req, owner: req.user });
        } catch (error) {
            // Concurrent first writes can normalize the same Shop document.
            // Reload through the existing service once; never reuse stale status.
            if (error.name !== 'VersionError') throw error;
            verification = await ensureShopVerificationStatus(req.tenantId, { req, owner: req.user });
        }
        const { shop, status } = verification;

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
