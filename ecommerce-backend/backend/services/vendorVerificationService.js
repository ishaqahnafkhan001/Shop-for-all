const Shop = require('../models/Shop');
const VendorVerification = require('../models/VendorVerification');
const { logAudit } = require('./auditLogService');
const { logPlatformAudit } = require('./platformAuditLogService');
const { createNotification } = require('./notificationService');
const {
    documentSummaries,
    maskNidNumber
} = require('./vendorVerificationPrivacyService');
const {
    buildVendorVerificationStatus,
    syncShopVendorVerifiedFlag
} = require('./verification/vendorVerificationStatusService');

const VERIFICATION_DEADLINE_DAYS = 20;
const REJECTED_NID_RETENTION_DAYS = 180;
const VERIFICATION_SUSPENSION_REASON = 'Store verification deadline expired. Submit NID verification and verify owner phone for Super Admin approval.';

const addDays = (date, days) => {
    const value = new Date(date || Date.now());
    value.setDate(value.getDate() + days);
    return value;
};

const getDefaultDeadline = (shop) => addDays(shop?.createdAt || new Date(), VERIFICATION_DEADLINE_DAYS);

const isVerificationSuspension = (shop) => (
    Boolean(shop) &&
    shop.approvalStatus === 'Suspended' &&
    shop.isActive === false &&
    shop.suspensionReason === VERIFICATION_SUSPENSION_REASON
);

const isManuallySuspended = (shop) => (
    Boolean(shop) &&
    (shop.approvalStatus === 'Suspended' || shop.isActive === false) &&
    shop.suspensionReason !== VERIFICATION_SUSPENSION_REASON
);

const getDaysLeft = (deadline) => {
    if (!deadline) return 0;
    const msLeft = new Date(deadline).getTime() - Date.now();
    return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
};

const getOwnerRef = (user = {}) => ({
    owner_id: user.accountId || user.account_id || user._id || user.id || null,
    ownerModel: user.accountId || user.account_id ? 'Account' : 'User'
});

const getReviewerRef = (user = {}) => ({
    reviewedBy: user.accountId || user.account_id || user._id || user.id || null,
    reviewedByModel: user.accountId || user.account_id ? 'Account' : 'User'
});

const normalizeStatus = (status) => status || 'not_submitted';

const getShopDocument = async (shopOrId) => {
    if (!shopOrId) return null;
    if (typeof shopOrId === 'object' && shopOrId._id && typeof shopOrId.save === 'function') return shopOrId;
    const shopId = typeof shopOrId === 'object' && shopOrId._id ? shopOrId._id : shopOrId;
    return Shop.findById(shopId);
};

const getExistingVerification = async (shop, owner = {}) => {
    const deadline = shop.verification?.deadline || getDefaultDeadline(shop);
    const ownerRef = getOwnerRef(owner);

    let verification = await VendorVerification.findOne({ shop_id: shop._id });
    if (!verification) {
        verification = await VendorVerification.create({
            shop_id: shop._id,
            ...ownerRef,
            status: shop.verification?.status || 'not_submitted',
            verificationDeadline: deadline
        });
    } else if (!verification.verificationDeadline) {
        verification.verificationDeadline = deadline;
        await verification.save();
    }

    return verification;
};

const buildStatusPayload = ({ shop, verification }) => {
    const status = normalizeStatus(verification?.status || shop?.verification?.status);
    const deadline = verification?.verificationDeadline || shop?.verification?.deadline || getDefaultDeadline(shop);
    const isSuspended = isVerificationSuspension(shop);
    const overall = buildVendorVerificationStatus({ shop, verification });

    return {
        status,
        nidStatus: status,
        overallStatus: overall.badgeStatus,
        badgeLabel: overall.badgeLabel,
        isVendorVerified: overall.isVendorVerified,
        phoneVerified: overall.phoneVerified,
        phoneVerifiedAt: overall.phoneVerifiedAt,
        registrationOtpChannel: overall.registrationOtpChannel,
        verificationReason: overall.reason,
        deadline,
        daysLeft: getDaysLeft(deadline),
        isSuspended,
        rejectionReason: verification?.rejectionReason || '',
        submittedAt: verification?.submittedAt || null,
        approvedAt: verification?.approvedAt || shop?.verification?.approvedAt || null,
        suspendedAt: verification?.suspendedAt || shop?.verification?.suspendedAt || null,
        canSubmit: status !== 'approved',
        documents: verification ? {
            nidName: verification.nidName || '',
            nidNumber: maskNidNumber(verification.nidNumber),
            ...documentSummaries(verification)
        } : null
    };
};

const syncShopVerification = async ({ shop, verification, status, suspendedAt = null }) => {
    shop.verification = {
        ...(shop.verification?.toObject ? shop.verification.toObject() : shop.verification || {}),
        status,
        deadline: verification.verificationDeadline || shop.verification?.deadline || getDefaultDeadline(shop),
        approvedAt: verification.approvedAt || shop.verification?.approvedAt || null,
        suspendedAt: suspendedAt || shop.verification?.suspendedAt || null,
        phoneVerified: Boolean(shop.verification?.phoneVerified),
        phoneVerifiedAt: shop.verification?.phoneVerifiedAt || null,
        registrationOtpChannel: shop.verification?.registrationOtpChannel || ''
    };

    await shop.save();
    await syncShopVendorVerifiedFlag({ shop, verification });
};

const ensureShopVerificationStatus = async (shopOrId, options = {}) => {
    const shop = await getShopDocument(shopOrId);
    if (!shop) return { shop: null, verification: null, status: null };

    const verification = await getExistingVerification(shop, options.owner || {});
    const deadline = verification.verificationDeadline || shop.verification?.deadline || getDefaultDeadline(shop);
    const currentStatus = normalizeStatus(verification.status);
    const phoneVerified = Boolean(shop.verification?.phoneVerified);
    const verificationComplete = currentStatus === 'approved' && phoneVerified;
    const expired = !verificationComplete && new Date(deadline).getTime() < Date.now();
    const shouldSuspend = expired && !isVerificationSuspension(shop);
    const shouldSetVerificationSuspensionReason = shouldSuspend && !isManuallySuspended(shop);
    let finalStatus = currentStatus;

    if (expired) {
        const shouldPreserveStatus = ['pending', 'rejected'].includes(currentStatus);
        finalStatus = shouldPreserveStatus ? currentStatus : 'suspended';
        if (verification.status !== finalStatus) verification.status = finalStatus;
        if (!verification.suspendedAt) verification.suspendedAt = new Date();
    }

    const shopStatus = finalStatus === 'approved' ? 'approved' : finalStatus;
    shop.verification = {
        ...(shop.verification?.toObject ? shop.verification.toObject() : shop.verification || {}),
        status: shopStatus,
        deadline,
        approvedAt: verification.approvedAt || shop.verification?.approvedAt || null,
        suspendedAt: verification.suspendedAt || shop.verification?.suspendedAt || null,
        phoneVerified,
        phoneVerifiedAt: shop.verification?.phoneVerifiedAt || null,
        registrationOtpChannel: shop.verification?.registrationOtpChannel || '',
        isVendorVerified: verificationComplete,
        verifiedAt: verificationComplete ? (shop.verification?.verifiedAt || verification.approvedAt || new Date()) : null
    };

    if (expired) {
        shop.approvalStatus = 'Suspended';
        shop.isActive = false;
        if (shouldSetVerificationSuspensionReason) {
            shop.suspensionReason = VERIFICATION_SUSPENSION_REASON;
        }
    }

    if (verification.isModified()) await verification.save();
    if (shop.isModified()) await shop.save();
    await syncShopVendorVerifiedFlag({ shop, verification });

    if (shouldSetVerificationSuspensionReason) {
        await Promise.all([
            logAudit({
                req: options.req,
                shop_id: shop._id,
                action: 'vendor_verification.auto_suspended',
                entityType: 'Shop',
                entityId: shop._id,
                entityLabel: shop.shopName,
                severity: 'warning',
                metadata: { deadline, status: finalStatus }
            }),
            logPlatformAudit({
                req: options.req,
                action: 'vendor_verification.auto_suspended',
                entityType: 'VendorVerification',
                entityId: verification._id,
                entityLabel: shop.shopName,
                shop_id: shop._id,
                message: `Store suspended after verification deadline: ${shop.shopName}`,
                reason: VERIFICATION_SUSPENSION_REASON,
                metadata: { deadline, status: finalStatus },
                severity: 'warning'
            }),
            createNotification({
                shop_id: shop._id,
                type: 'system',
                title: 'Store suspended for verification',
                message: 'Your 20-day verification period has ended. Submit NID verification and verify the owner phone number for Super Admin approval.',
                entityType: 'VendorVerification',
                entityId: verification._id,
                severity: 'critical'
            })
        ]);
    }

    return {
        shop,
        verification,
        status: buildStatusPayload({ shop, verification })
    };
};

const approveVerification = async ({ verification, reviewer, req }) => {
    const shop = await Shop.findById(verification.shop_id);
    if (!shop) throw new Error('Shop not found');

    const reviewerRef = getReviewerRef(reviewer);
    verification.status = 'approved';
    verification.approvedAt = new Date();
    verification.retentionUntil = null;
    verification.retentionReason = 'active_verified_shop';
    verification.rejectedAt = null;
    verification.rejectionReason = '';
    verification.suspendedAt = verification.suspendedAt || null;
    verification.reviewedBy = reviewerRef.reviewedBy;
    verification.reviewedByModel = reviewerRef.reviewedByModel;

    shop.verification = {
        ...(shop.verification?.toObject ? shop.verification.toObject() : shop.verification || {}),
        status: 'approved',
        deadline: verification.verificationDeadline,
        approvedAt: verification.approvedAt,
        suspendedAt: shop.verification?.suspendedAt || null,
        phoneVerified: Boolean(shop.verification?.phoneVerified),
        phoneVerifiedAt: shop.verification?.phoneVerifiedAt || null,
        registrationOtpChannel: shop.verification?.registrationOtpChannel || ''
    };

    const phoneVerified = Boolean(shop.verification?.phoneVerified);
    if (isVerificationSuspension(shop)) {
        if (phoneVerified) {
            shop.approvalStatus = 'Approved';
            shop.isActive = true;
            shop.suspensionReason = '';
        }
    }

    await Promise.all([verification.save(), shop.save()]);
    const overall = await syncShopVendorVerifiedFlag({ shop, verification });

    await Promise.all([
        logAudit({
            req,
            shop_id: shop._id,
            action: 'vendor_verification.approved',
            entityType: 'VendorVerification',
            entityId: verification._id,
            entityLabel: shop.shopName,
            after: { status: 'approved' }
        }),
        createNotification({
            shop_id: shop._id,
            type: 'system',
            title: phoneVerified ? 'Vendor verification completed' : 'NID verification approved',
            message: phoneVerified
                ? 'Your NID and phone verification are complete. Your store is now a verified seller.'
                : 'Your NID verification has been approved. Verify the owner phone number to complete vendor verification.',
            entityType: 'VendorVerification',
            entityId: verification._id,
            severity: 'success'
        })
    ]);

    return { shop, verification, overall };
};

const rejectVerification = async ({ verification, reviewer, rejectionReason, adminNote = '', req }) => {
    const shop = await Shop.findById(verification.shop_id);
    if (!shop) throw new Error('Shop not found');

    const reviewerRef = getReviewerRef(reviewer);
    const deadline = verification.verificationDeadline || shop.verification?.deadline || getDefaultDeadline(shop);
    const expired = new Date(deadline).getTime() < Date.now();

    verification.status = 'rejected';
    verification.rejectedAt = new Date();
    verification.approvedAt = null;
    verification.retentionUntil = addDays(verification.rejectedAt, REJECTED_NID_RETENTION_DAYS);
    verification.retentionReason = 'rejected_review_retention';
    verification.rejectionReason = rejectionReason;
    verification.adminNote = adminNote;
    verification.reviewedBy = reviewerRef.reviewedBy;
    verification.reviewedByModel = reviewerRef.reviewedByModel;

    shop.verification = {
        ...(shop.verification?.toObject ? shop.verification.toObject() : shop.verification || {}),
        status: 'rejected',
        deadline,
        approvedAt: null,
        suspendedAt: expired ? (shop.verification?.suspendedAt || new Date()) : shop.verification?.suspendedAt || null
    };

    if (expired || isVerificationSuspension(shop)) {
        shop.approvalStatus = 'Suspended';
        shop.isActive = false;
        shop.suspensionReason = VERIFICATION_SUSPENSION_REASON;
    }

    await Promise.all([verification.save(), shop.save()]);

    await Promise.all([
        logAudit({
            req,
            shop_id: shop._id,
            action: 'vendor_verification.rejected',
            entityType: 'VendorVerification',
            entityId: verification._id,
            entityLabel: shop.shopName,
            severity: 'warning',
            after: { status: 'rejected', rejectionReason }
        }),
        createNotification({
            shop_id: shop._id,
            type: 'system',
            title: 'Store verification rejected',
            message: `Your NID verification was rejected: ${rejectionReason}`,
            entityType: 'VendorVerification',
            entityId: verification._id,
            severity: 'warning'
        })
    ]);

    return { shop, verification };
};

module.exports = {
    VERIFICATION_DEADLINE_DAYS,
    REJECTED_NID_RETENTION_DAYS,
    VERIFICATION_SUSPENSION_REASON,
    addDays,
    getDefaultDeadline,
    getDaysLeft,
    getOwnerRef,
    getReviewerRef,
    isVerificationSuspension,
    isManuallySuspended,
    buildStatusPayload,
    syncShopVerification,
    ensureShopVerificationStatus,
    approveVerification,
    rejectVerification
};
