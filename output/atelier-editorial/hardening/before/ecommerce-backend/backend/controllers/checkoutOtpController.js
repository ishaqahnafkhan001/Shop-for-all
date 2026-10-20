const Shop = require('../models/Shop');
const { logAudit } = require('../services/auditLogService');
const {
    CheckoutOtpError,
    sendCheckoutPhoneOtp,
    verifyCheckoutPhoneOtp
} = require('../services/checkout/checkoutOtpService');

const handleCheckoutOtpError = (res, err) => {
    const statusCode = err instanceof CheckoutOtpError ? err.statusCode : 400;
    return res.status(statusCode || 400).json({
        success: false,
        code: err.code || 'INVALID_OTP',
        error: err.message || 'Unable to verify phone number.'
    });
};

exports.sendCheckoutOtp = async (req, res) => {
    try {
        const shop = await Shop.findById(req.tenantId).select('_id shopName').lean();
        if (!shop) {
            return res.status(404).json({ success: false, error: 'Shop not found' });
        }

        const result = await sendCheckoutPhoneOtp({
            shop,
            phone: req.body.phone,
            checkoutSessionId: req.body.checkoutSessionId,
            items: req.body.items
        });

        await logAudit({
            req,
            shop_id: shop._id,
            action: 'checkout.phone_otp_sent',
            entityType: 'Checkout',
            entityId: shop._id,
            entityLabel: result.maskedPhone,
            severity: 'info'
        });

        return res.status(200).json({
            success: true,
            message: 'Verification code sent',
            maskedPhone: result.maskedPhone,
            expiresAt: result.expiresAt,
            resendAvailableAt: result.resendAvailableAt
        });
    } catch (err) {
        return handleCheckoutOtpError(res, err);
    }
};

exports.verifyCheckoutOtp = async (req, res) => {
    try {
        const result = await verifyCheckoutPhoneOtp({
            shopId: req.tenantId,
            phone: req.body.phone,
            checkoutSessionId: req.body.checkoutSessionId,
            items: req.body.items,
            otp: req.body.otp
        });

        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'checkout.phone_verified',
            entityType: 'Checkout',
            entityId: req.tenantId,
            entityLabel: result.maskedPhone,
            severity: 'info'
        });

        return res.status(200).json({
            success: true,
            message: 'Phone verified',
            maskedPhone: result.maskedPhone,
            phoneVerificationToken: result.verificationToken,
            expiresAt: result.expiresAt
        });
    } catch (err) {
        return handleCheckoutOtpError(res, err);
    }
};
