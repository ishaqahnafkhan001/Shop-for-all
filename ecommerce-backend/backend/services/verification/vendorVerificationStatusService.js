const VendorVerification = require('../../models/VendorVerification');

const isShopActiveApproved = (shop = {}) => (
    shop &&
    shop.isActive !== false &&
    shop.approvalStatus !== 'Suspended'
);

const getNidStatus = ({ shop, verification } = {}) => (
    verification?.status || shop?.verification?.status || 'not_submitted'
);

const getPhoneVerified = (shop = {}) => Boolean(shop?.verification?.phoneVerified);

const buildVendorVerificationStatus = ({ shop, verification } = {}) => {
    const nidStatus = getNidStatus({ shop, verification });
    const phoneVerified = getPhoneVerified(shop);
    const activeApproved = isShopActiveApproved(shop);
    const isVendorVerified = nidStatus === 'approved' && phoneVerified && activeApproved;

    let badgeStatus = 'not_verified';
    let badgeLabel = 'Not verified';
    let reason = 'Submit NID verification and verify the owner phone number.';

    if (isVendorVerified) {
        badgeStatus = 'verified';
        badgeLabel = 'Verified';
        reason = '';
    } else if (!activeApproved) {
        badgeStatus = 'suspended';
        badgeLabel = 'Suspended';
        reason = 'Store must be active and approved.';
    } else if (nidStatus === 'approved' && !phoneVerified) {
        badgeStatus = 'phone_needed';
        badgeLabel = 'Phone verification needed';
        reason = 'Verify the owner phone number to complete vendor verification.';
    } else if (nidStatus === 'pending') {
        badgeStatus = 'pending';
        badgeLabel = 'Pending verification';
        reason = 'NID is under Super Admin review.';
    } else if (nidStatus === 'rejected') {
        badgeStatus = 'rejected';
        badgeLabel = 'Verification rejected';
        reason = 'Resubmit NID details and verify the owner phone number.';
    } else if (nidStatus === 'suspended') {
        badgeStatus = 'suspended';
        badgeLabel = 'Suspended';
        reason = 'Verification deadline expired.';
    }

    return {
        isVendorVerified,
        badgeLabel,
        badgeStatus,
        nidStatus,
        phoneVerified,
        phoneVerifiedAt: shop?.verification?.phoneVerifiedAt || null,
        deadline: verification?.verificationDeadline || shop?.verification?.deadline || null,
        approvedAt: verification?.approvedAt || shop?.verification?.approvedAt || null,
        verifiedAt: shop?.verification?.verifiedAt || null,
        registrationOtpChannel: shop?.verification?.registrationOtpChannel || '',
        reason
    };
};

const buildPublicShopVerification = (shop = {}) => {
    const status = buildVendorVerificationStatus({ shop });
    return {
        isVerified: Boolean(status.isVendorVerified),
        label: status.isVendorVerified ? 'Verified seller' : ''
    };
};

const syncShopVendorVerifiedFlag = async ({ shop, verification, session } = {}) => {
    if (!shop) return null;

    const effectiveVerification = verification || await VendorVerification.findOne({ shop_id: shop._id }).session(session || null);
    const status = buildVendorVerificationStatus({ shop, verification: effectiveVerification });
    const current = shop.verification?.toObject ? shop.verification.toObject() : (shop.verification || {});

    shop.verification = {
        ...current,
        isVendorVerified: status.isVendorVerified,
        verifiedAt: status.isVendorVerified ? (current.verifiedAt || new Date()) : null
    };

    if (shop.isModified()) {
        await shop.save({ session });
    }

    return status;
};

module.exports = {
    buildPublicShopVerification,
    buildVendorVerificationStatus,
    getPhoneVerified,
    isShopActiveApproved,
    syncShopVendorVerifiedFlag
};
