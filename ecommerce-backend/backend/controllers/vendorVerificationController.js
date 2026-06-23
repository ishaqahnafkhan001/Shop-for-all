const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const User = require('../models/User');
const VendorVerification = require('../models/VendorVerification');
const cache = require('../services/cacheService');
const { invalidateTenantCache } = require('../middlewares/tenant');
const { logAudit } = require('../services/auditLogService');
const { logPlatformAudit } = require('../services/platformAuditLogService');
const { createNotification } = require('../services/notificationService');
const { uploadNidDocument } = require('../config/cloudinary');
const {
    VERIFICATION_SUSPENSION_REASON,
    buildStatusPayload,
    ensureShopVerificationStatus,
    getDefaultDeadline,
    getOwnerRef,
    approveVerification,
    rejectVerification
} = require('../services/vendorVerificationService');
const {
    DOCUMENT_TYPES,
    getSignedNidDocumentUrl,
    serializeVerificationPrivacy
} = require('../services/vendorVerificationPrivacyService');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getPagination = (query = {}) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    return { page, limit, skip: (page - 1) * limit };
};

const getSort = (query = {}) => {
    const allowed = ['createdAt', 'updatedAt', 'verificationDeadline', 'status'];
    const sortBy = allowed.includes(query.sortBy) ? query.sortBy : 'updatedAt';
    const sortOrder = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    return { [sortBy]: sortOrder, _id: sortOrder };
};

const paginationPayload = ({ page, limit, total }) => ({
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1
});

const getVerificationSummary = async () => {
    const now = new Date();
    const soon = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    const [
        pending,
        approved,
        rejected,
        suspendedByVerification,
        expiredDeadline,
        deadlineSoon
    ] = await Promise.all([
        VendorVerification.countDocuments({ status: 'pending' }),
        VendorVerification.countDocuments({ status: 'approved' }),
        VendorVerification.countDocuments({ status: 'rejected' }),
        Shop.countDocuments({ approvalStatus: 'Suspended', isActive: false, suspensionReason: VERIFICATION_SUSPENSION_REASON }),
        VendorVerification.countDocuments({ status: { $ne: 'approved' }, verificationDeadline: { $lt: now } }),
        VendorVerification.countDocuments({ status: { $ne: 'approved' }, verificationDeadline: { $gte: now, $lte: soon } })
    ]);
    return { pending, approved, rejected, suspendedByVerification, expiredDeadline, deadlineSoon };
};

const invalidateShopCache = async (shop) => {
    if (!shop?._id) return;
    await Promise.all([
        shop.subdomain ? invalidateTenantCache(shop.subdomain) : Promise.resolve(),
        cache.del(`storefront:settings:${shop._id}`),
        cache.delPattern(`storefront:bootstrap:${shop._id}:*`)
    ]);
};

const getVerificationById = async (id) => {
    if (!isValidObjectId(id)) return null;
    return VendorVerification.findById(id);
};

const serializeVerification = (verification, options = {}) => serializeVerificationPrivacy(verification, options);

const validateDocumentType = (type) => (
    Object.values(DOCUMENT_TYPES).includes(type) ? type : null
);

exports.getVendorVerificationStatus = async (req, res) => {
    try {
        if (!req.tenantId) {
            return res.status(400).json({ success: false, error: 'Shop context is required' });
        }

        const { status } = await ensureShopVerificationStatus(req.tenantId, { req, owner: req.user });
        res.status(200).json({ success: true, data: status });
    } catch (err) {
        console.error('Get vendor verification status error:', err);
        res.status(500).json({ success: false, error: 'Failed to load verification status' });
    }
};

exports.submitVendorVerification = async (req, res) => {
    try {
        if (!req.tenantId) {
            return res.status(400).json({ success: false, error: 'Shop context is required' });
        }

        const nidName = String(req.body.nidName || '').trim();
        const nidNumber = String(req.body.nidNumber || '').trim();
        const nidFrontFile = req.files?.nidFront?.[0] || null;
        const nidBackFile = req.files?.nidBack?.[0] || null;
        const legacyNidFrontUrl = nidFrontFile ? '' : String(req.body.nidFront || '').trim();
        const legacyNidBackUrl = nidBackFile ? '' : String(req.body.nidBack || '').trim();

        if (!nidName || !nidNumber) {
            return res.status(400).json({ success: false, error: 'NID name and number are required' });
        }

        if ((!nidFrontFile && !legacyNidFrontUrl) || (!nidBackFile && !legacyNidBackUrl)) {
            return res.status(400).json({ success: false, error: 'NID front and back images are required' });
        }

        const { shop, verification } = await ensureShopVerificationStatus(req.tenantId, { req, owner: req.user });

        if (!shop || !verification) {
            return res.status(404).json({ success: false, error: 'Shop not found' });
        }

        if (verification.status === 'approved') {
            return res.status(400).json({ success: false, error: 'This shop is already verified' });
        }

        const [frontDocument, backDocument] = await Promise.all([
            nidFrontFile
                ? uploadNidDocument({ file: nidFrontFile, shopId: shop._id, documentType: DOCUMENT_TYPES.front })
                : Promise.resolve(null),
            nidBackFile
                ? uploadNidDocument({ file: nidBackFile, shopId: shop._id, documentType: DOCUMENT_TYPES.back })
                : Promise.resolve(null)
        ]);

        const ownerRef = getOwnerRef(req.user);
        verification.owner_id = ownerRef.owner_id;
        verification.ownerModel = ownerRef.ownerModel;
        verification.status = 'pending';
        verification.nidName = nidName;
        verification.nidNumber = nidNumber;
        verification.nidDocuments = {
            ...(verification.nidDocuments?.toObject ? verification.nidDocuments.toObject() : verification.nidDocuments || {}),
            ...(frontDocument ? { front: frontDocument } : {}),
            ...(backDocument ? { back: backDocument } : {})
        };
        verification.nidFrontUrl = frontDocument ? '' : legacyNidFrontUrl;
        verification.nidBackUrl = backDocument ? '' : legacyNidBackUrl;
        verification.submittedAt = new Date();
        verification.rejectionReason = '';
        verification.rejectedAt = null;
        verification.adminNote = '';
        verification.verificationDeadline = verification.verificationDeadline || shop.verification?.deadline || getDefaultDeadline(shop);

        shop.verification = {
            ...(shop.verification?.toObject ? shop.verification.toObject() : shop.verification || {}),
            status: 'pending',
            deadline: verification.verificationDeadline,
            approvedAt: null,
            suspendedAt: shop.verification?.suspendedAt || verification.suspendedAt || null
        };

        await Promise.all([verification.save(), shop.save()]);
        await invalidateShopCache(shop);

        await Promise.all([
            logAudit({
                req,
                shop_id: shop._id,
                action: 'vendor_verification.submitted',
                entityType: 'VendorVerification',
                entityId: verification._id,
                entityLabel: shop.shopName,
                after: { status: 'pending' }
            }),
            createNotification({
                shop_id: shop._id,
                type: 'system',
                title: 'Verification submitted',
                message: 'Your NID verification was submitted and is waiting for Super Admin review.',
                entityType: 'VendorVerification',
                entityId: verification._id,
                severity: 'info'
            })
        ]);

        res.status(200).json({
            success: true,
            message: 'Verification submitted for review',
            data: buildStatusPayload({ shop, verification })
        });
    } catch (err) {
        console.error('Submit vendor verification error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to submit verification' });
    }
};

exports.getVendorVerificationDocument = async (req, res) => {
    try {
        if (!req.tenantId) {
            return res.status(400).json({ success: false, error: 'Shop context is required' });
        }

        const type = validateDocumentType(req.params.type);
        if (!type) {
            return res.status(400).json({ success: false, error: 'Invalid document type' });
        }

        const verification = await VendorVerification.findOne({ shop_id: req.tenantId });
        if (!verification) {
            return res.status(404).json({ success: false, error: 'Verification not found' });
        }

        const signed = await getSignedNidDocumentUrl({ verification, type });

        await logAudit({
            req,
            shop_id: req.tenantId,
            action: 'vendor_verification.document_viewed',
            entityType: 'VendorVerification',
            entityId: verification._id,
            entityLabel: `NID ${type}`,
            severity: 'info',
            metadata: { documentType: type }
        });

        res.status(200).json({ success: true, url: signed.url, expiresAt: signed.expiresAt });
    } catch (err) {
        console.error('Get vendor verification document error:', err);
        res.status(404).json({ success: false, error: err.message || 'Document not found' });
    }
};

exports.getVendorVerifications = async (req, res) => {
    try {
        const {
            status,
            search,
            expired,
            deadlineSoon,
            suspended,
            dateFrom,
            dateTo
        } = req.query;
        const { page, limit, skip } = getPagination(req.query);
        const query = {};
        const now = new Date();
        const soon = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));

        if (status && status !== 'all') query.status = status;
        if (expired === 'true') query.verificationDeadline = { ...(query.verificationDeadline || {}), $lt: new Date() };
        if (deadlineSoon === 'true') query.verificationDeadline = { ...(query.verificationDeadline || {}), $gte: now, $lte: soon };
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        const shopFilters = [];
        if (suspended === 'true') {
            shopFilters.push({
                $or: [
                    { approvalStatus: 'Suspended' },
                    { isActive: false },
                    { suspensionReason: VERIFICATION_SUSPENSION_REASON }
                ]
            });
        }

        if (search) {
            const regex = new RegExp(escapeRegex(String(search).trim()), 'i');
            const [shops, owners] = await Promise.all([
                Shop.find({ $or: [{ shopName: regex }, { subdomain: regex }] }).select('_id').lean(),
                User.find({
                    role: 'VendorAdmin',
                    $or: [{ email: regex }, { fullName: regex }]
                }).select('shop_id').lean()
            ]);
            const shopIds = [
                ...shops.map(shop => shop._id),
                ...owners.map(owner => owner.shop_id).filter(Boolean)
            ];
            query.$or = [
                { nidName: regex },
                { nidNumber: regex },
                ...(shopIds.length ? [{ shop_id: { $in: shopIds } }] : [])
            ];
        }

        if (shopFilters.length > 0) {
            const shops = await Shop.find({ $and: shopFilters }).select('_id').lean();
            query.shop_id = { $in: shops.map(shop => shop._id) };
        }

        const [verifications, total, summary] = await Promise.all([
            VendorVerification.find(query)
                .populate('shop_id', 'shopName subdomain isActive approvalStatus suspensionReason verification createdAt')
                .populate('owner_id', 'fullName email')
                .populate('reviewedBy', 'fullName email')
                .sort(getSort(req.query))
                .skip(skip)
                .limit(limit)
                .lean(),
            VendorVerification.countDocuments(query),
            getVerificationSummary()
        ]);

        res.status(200).json({
            success: true,
            data: verifications.map(verification => serializeVerification(verification, { includeFullNid: false })),
            summary,
            pagination: paginationPayload({ page, limit, total })
        });
    } catch (err) {
        console.error('Get vendor verifications error:', err);
        res.status(500).json({ success: false, error: 'Failed to load vendor verifications' });
    }
};

exports.getVendorVerificationById = async (req, res) => {
    try {
        const verification = await VendorVerification.findById(req.params.id)
            .populate('shop_id', 'shopName subdomain isActive approvalStatus suspensionReason verification createdAt')
            .populate('owner_id', 'fullName email')
            .populate('reviewedBy', 'fullName email')
            .lean();

        if (!verification) {
            return res.status(404).json({ success: false, error: 'Verification not found' });
        }

        res.status(200).json({
            success: true,
            data: serializeVerification(verification, { includeFullNid: true })
        });
    } catch (err) {
        console.error('Get vendor verification detail error:', err);
        res.status(500).json({ success: false, error: 'Failed to load verification' });
    }
};

exports.getSuperAdminVendorVerificationDocument = async (req, res) => {
    try {
        const type = validateDocumentType(req.params.type);
        if (!type) {
            return res.status(400).json({ success: false, error: 'Invalid document type' });
        }

        const verification = await getVerificationById(req.params.id);
        if (!verification) {
            return res.status(404).json({ success: false, error: 'Verification not found' });
        }

        const signed = await getSignedNidDocumentUrl({ verification, type });

        await logPlatformAudit({
            req,
            action: 'vendor_verification.document_viewed',
            entityType: 'VendorVerification',
            entityId: verification._id,
            entityLabel: `NID ${type}`,
            shop_id: verification.shop_id,
            message: `Super Admin viewed vendor verification ${type} document`,
            metadata: { documentType: type },
            severity: 'warning'
        });

        res.status(200).json({ success: true, url: signed.url, expiresAt: signed.expiresAt });
    } catch (err) {
        console.error('Get super admin verification document error:', err);
        res.status(404).json({ success: false, error: err.message || 'Document not found' });
    }
};

exports.approveVendorVerification = async (req, res) => {
    try {
        const verification = await getVerificationById(req.params.id);
        if (!verification) {
            return res.status(404).json({ success: false, error: 'Verification not found' });
        }

        const { shop } = await approveVerification({ verification, reviewer: req.user, req });
        await invalidateShopCache(shop);
        await logPlatformAudit({
            req,
            action: 'vendor_verification.approved',
            entityType: 'VendorVerification',
            entityId: verification._id,
            entityLabel: shop.shopName,
            shop_id: shop._id,
            message: `Vendor verification approved for ${shop.shopName}`,
            metadata: { status: verification.status }
        });

        res.status(200).json({
            success: true,
            message: 'Vendor verification approved',
            data: buildStatusPayload({ shop, verification })
        });
    } catch (err) {
        console.error('Approve vendor verification error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to approve verification' });
    }
};

exports.rejectVendorVerification = async (req, res) => {
    try {
        const rejectionReason = String(req.body.rejectionReason || '').trim();
        const adminNote = String(req.body.adminNote || '').trim();

        if (!rejectionReason) {
            return res.status(400).json({ success: false, error: 'Rejection reason is required' });
        }

        const verification = await getVerificationById(req.params.id);
        if (!verification) {
            return res.status(404).json({ success: false, error: 'Verification not found' });
        }

        const { shop } = await rejectVerification({ verification, reviewer: req.user, rejectionReason, adminNote, req });
        await invalidateShopCache(shop);
        await logPlatformAudit({
            req,
            action: 'vendor_verification.rejected',
            entityType: 'VendorVerification',
            entityId: verification._id,
            entityLabel: shop.shopName,
            shop_id: shop._id,
            message: `Vendor verification rejected for ${shop.shopName}`,
            reason: rejectionReason,
            metadata: { adminNote },
            severity: 'warning'
        });

        res.status(200).json({
            success: true,
            message: 'Vendor verification rejected',
            data: buildStatusPayload({ shop, verification })
        });
    } catch (err) {
        console.error('Reject vendor verification error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to reject verification' });
    }
};
