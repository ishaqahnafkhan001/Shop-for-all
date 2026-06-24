const BadgeApplication = require('../models/BadgeApplication');
const Shop = require('../models/Shop');
const User = require('../models/User');
const { enqueueJob } = require('../services/jobQueueService');
const { getBadgeEligibility } = require('../services/badges/badgeEligibilityService');
const { getBadgeJobStatus } = require('../services/badges/badgeAnalysisService');
const { logPlatformAudit } = require('../services/platformAuditLogService');
const { createNotification } = require('../services/notificationService');
const cache = require('../services/cacheService');

const getShopIdFromReq = (req) => req.tenantId || req.user?.shopId || req.user?.shop_id;
const getActorId = (req) => req?.user?.accountId || req?.user?.account_id || req?.user?._id || null;

const getPagination = (query = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    return { page, limit, skip: (page - 1) * limit };
};

const paginationMeta = ({ page, limit, total }) => ({
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit))
});

const invalidateBadgeStorefrontCache = async (shopId) => {
    try {
        await cache.delPattern(`storefront:bootstrap:${shopId}:*`);
    } catch (err) {
        console.error('[Badge] Failed to invalidate storefront cache:', err.message);
    }
};

const serializeApplication = async (application, { includeJob = false } = {}) => {
    if (!application) return null;
    const plain = application.toObject ? application.toObject() : application;
    const row = {
        id: plain._id,
        shopId: plain.shopId,
        requestedBy: plain.requestedBy,
        status: plain.status,
        badgeType: plain.badgeType,
        eligibilitySnapshot: plain.eligibilitySnapshot,
        analysisJobId: plain.analysisJobId,
        analysisScore: plain.analysisScore,
        analysisSummary: plain.analysisSummary,
        analysisFindings: plain.analysisFindings,
        recommendation: plain.recommendation,
        superAdminDecision: plain.superAdminDecision,
        superAdminReason: plain.superAdminReason,
        approvedBy: plain.approvedBy,
        approvedAt: plain.approvedAt,
        rejectedBy: plain.rejectedBy,
        rejectedAt: plain.rejectedAt,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
        shop: plain.shopId && typeof plain.shopId === 'object' ? plain.shopId : null
    };

    if (includeJob) row.job = await getBadgeJobStatus(application);
    return row;
};

const enqueueBadgeAnalysis = async (application) => {
    const job = await enqueueJob({
        queue: 'badges',
        name: 'analyze_trusted_badge',
        payload: { applicationId: application._id },
        shop_id: application.shopId,
        maxAttempts: 3,
        idempotencyKey: `badge-analysis:${application._id}`
    });

    application.analysisJobId = job._id;
    await application.save();
    return job;
};

exports.getVendorBadgeStatus = async (req, res) => {
    try {
        const shopId = getShopIdFromReq(req);
        const [eligibility, latestApplication, applications] = await Promise.all([
            getBadgeEligibility(shopId),
            BadgeApplication.findOne({ shopId }).sort({ createdAt: -1 }),
            BadgeApplication.find({ shopId }).sort({ createdAt: -1 }).limit(5)
        ]);

        res.status(200).json({
            success: true,
            data: {
                shopBadge: {
                    status: eligibility.shop.badgeStatus || 'none',
                    type: eligibility.shop.badgeType || '',
                    approvedAt: eligibility.shop.badgeApprovedAt,
                    expiresAt: eligibility.shop.badgeExpiresAt,
                    revokedAt: eligibility.shop.badgeRevokedAt,
                    revokedReason: eligibility.shop.badgeRevokedReason || ''
                },
                eligibility: {
                    eligible: eligibility.eligible,
                    snapshot: eligibility.snapshot,
                    checklist: eligibility.checklist,
                    missingRequirements: eligibility.missingRequirements
                },
                latestApplication: await serializeApplication(latestApplication, { includeJob: true }),
                applications: await Promise.all(applications.map(item => serializeApplication(item)))
            }
        });
    } catch (err) {
        console.error('Get badge status error:', err);
        res.status(500).json({ success: false, error: 'Failed to load badge status' });
    }
};

exports.requestVendorBadge = async (req, res) => {
    try {
        const shopId = getShopIdFromReq(req);
        const eligibility = await getBadgeEligibility(shopId);

        if (!eligibility.eligible) {
            return res.status(403).json({
                success: false,
                error: 'Your store does not meet badge requirements yet.',
                code: 'BADGE_NOT_ELIGIBLE',
                missingRequirements: eligibility.missingRequirements
            });
        }

        const existingOpen = await BadgeApplication.findOne({
            shopId,
            status: { $in: ['pending_analysis', 'analyzing', 'analysis_completed', 'pending_super_admin_review'] }
        });

        if (existingOpen) {
            return res.status(409).json({
                success: false,
                error: 'A badge request is already in progress.',
                data: await serializeApplication(existingOpen, { includeJob: true })
            });
        }

        const application = await BadgeApplication.create({
            shopId,
            requestedBy: getActorId(req),
            status: 'pending_analysis',
            badgeType: req.body.badgeType === 'verified_seller' ? 'verified_seller' : 'trusted_seller',
            eligibilitySnapshot: eligibility.snapshot
        });

        await enqueueBadgeAnalysis(application);

        await createNotification({
            shop_id: shopId,
            type: 'system',
            title: 'Badge request received',
            message: 'Your badge request is being analyzed. This can take 1-2 days.',
            entityType: 'BadgeApplication',
            entityId: application._id,
            severity: 'info'
        });

        res.status(202).json({
            success: true,
            message: 'Your badge request is being analyzed. This can take 1-2 days.',
            data: await serializeApplication(application, { includeJob: true })
        });
    } catch (err) {
        console.error('Request badge error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to request badge' });
    }
};

exports.getVendorBadgeApplications = async (req, res) => {
    try {
        const shopId = getShopIdFromReq(req);
        const applications = await BadgeApplication.find({ shopId }).sort({ createdAt: -1 }).limit(20);
        res.status(200).json({
            success: true,
            data: await Promise.all(applications.map(item => serializeApplication(item, { includeJob: true })))
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch badge applications' });
    }
};

exports.getSuperAdminBadgeApplications = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.recommendation) query.recommendation = req.query.recommendation;

        const [items, total] = await Promise.all([
            BadgeApplication.find(query)
                .populate('shopId', 'shopName subdomain badgeStatus badgeType badgeApprovedAt badgeRevokedReason')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            BadgeApplication.countDocuments(query)
        ]);

        const shopIds = items.map(item => item.shopId?._id || item.shopId).filter(Boolean);
        const owners = await User.find({ shop_id: { $in: shopIds }, role: 'VendorAdmin' })
            .select('shop_id fullName email')
            .lean();
        const ownerMap = Object.fromEntries(owners.map(owner => [String(owner.shop_id), owner]));

        res.status(200).json({
            success: true,
            data: await Promise.all(items.map(async item => {
                const row = await serializeApplication(item, { includeJob: true });
                row.owner = ownerMap[String(item.shopId?._id || item.shopId)] || null;
                return row;
            })),
            pagination: paginationMeta({ page, limit, total })
        });
    } catch (err) {
        console.error('Get badge applications error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch badge applications' });
    }
};

exports.getSuperAdminBadgeApplicationById = async (req, res) => {
    try {
        const application = await BadgeApplication.findById(req.params.id)
            .populate('shopId', 'shopName subdomain badgeStatus badgeType badgeApprovedAt badgeRevokedReason createdAt plan verification approvalStatus isActive')
            .populate('requestedBy', 'fullName email')
            .populate('approvedBy', 'fullName email')
            .populate('rejectedBy', 'fullName email');
        if (!application) return res.status(404).json({ success: false, error: 'Badge application not found' });

        res.status(200).json({ success: true, data: await serializeApplication(application, { includeJob: true }) });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch badge application' });
    }
};

exports.approveBadgeApplication = async (req, res) => {
    try {
        const application = await BadgeApplication.findById(req.params.id);
        if (!application) return res.status(404).json({ success: false, error: 'Badge application not found' });

        application.status = 'approved';
        application.superAdminDecision = 'approved';
        application.superAdminReason = req.body.reason || '';
        application.approvedBy = getActorId(req);
        application.approvedAt = new Date();
        await application.save();

        await Shop.updateOne(
            { _id: application.shopId },
            {
                $set: {
                    badgeStatus: 'active',
                    badgeType: application.badgeType,
                    badgeApprovedAt: application.approvedAt,
                    badgeRevokedAt: null,
                    badgeRevokedReason: ''
                }
            }
        );
        await invalidateBadgeStorefrontCache(application.shopId);

        await logPlatformAudit({
            req,
            action: 'badge.approved',
            entityType: 'BadgeApplication',
            entityId: application._id,
            shop_id: application.shopId,
            message: 'Trusted seller badge approved',
            reason: application.superAdminReason,
            metadata: { score: application.analysisScore, recommendation: application.recommendation }
        });

        await createNotification({
            shop_id: application.shopId,
            type: 'system',
            title: 'Trusted Seller badge approved',
            message: 'Your Trusted Seller badge was approved and is now visible on your storefront.',
            entityType: 'BadgeApplication',
            entityId: application._id,
            severity: 'success'
        });

        res.status(200).json({ success: true, data: await serializeApplication(application) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to approve badge' });
    }
};

exports.rejectBadgeApplication = async (req, res) => {
    try {
        const reason = String(req.body.reason || req.body.superAdminReason || '').trim();
        if (!reason) return res.status(400).json({ success: false, error: 'Reason is required to reject badge application' });

        const application = await BadgeApplication.findById(req.params.id);
        if (!application) return res.status(404).json({ success: false, error: 'Badge application not found' });

        application.status = 'rejected';
        application.superAdminDecision = 'rejected';
        application.superAdminReason = reason;
        application.rejectedBy = getActorId(req);
        application.rejectedAt = new Date();
        await application.save();

        await logPlatformAudit({
            req,
            action: 'badge.rejected',
            entityType: 'BadgeApplication',
            entityId: application._id,
            shop_id: application.shopId,
            message: 'Trusted seller badge rejected',
            reason,
            severity: 'warning'
        });

        await createNotification({
            shop_id: application.shopId,
            type: 'system',
            title: 'Trusted Seller badge rejected',
            message: `Your badge request was rejected: ${reason}`,
            entityType: 'BadgeApplication',
            entityId: application._id,
            severity: 'warning',
            metadata: { reason }
        });

        res.status(200).json({ success: true, data: await serializeApplication(application) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to reject badge' });
    }
};

exports.revokeBadgeApplication = async (req, res) => {
    try {
        const reason = String(req.body.reason || req.body.superAdminReason || '').trim();
        if (!reason) return res.status(400).json({ success: false, error: 'Reason is required to revoke badge' });

        const application = await BadgeApplication.findById(req.params.id);
        if (!application) return res.status(404).json({ success: false, error: 'Badge application not found' });

        application.status = 'revoked';
        application.superAdminDecision = 'revoked';
        application.superAdminReason = reason;
        await application.save();

        await Shop.updateOne(
            { _id: application.shopId },
            {
                $set: {
                    badgeStatus: 'revoked',
                    badgeRevokedAt: new Date(),
                    badgeRevokedReason: reason
                }
            }
        );
        await invalidateBadgeStorefrontCache(application.shopId);

        await logPlatformAudit({
            req,
            action: 'badge.revoked',
            entityType: 'BadgeApplication',
            entityId: application._id,
            shop_id: application.shopId,
            message: 'Trusted seller badge revoked',
            reason,
            severity: 'warning'
        });

        await createNotification({
            shop_id: application.shopId,
            type: 'system',
            title: 'Trusted Seller badge revoked',
            message: `Your badge was revoked: ${reason}`,
            entityType: 'BadgeApplication',
            entityId: application._id,
            severity: 'warning',
            metadata: { reason }
        });

        res.status(200).json({ success: true, data: await serializeApplication(application) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to revoke badge' });
    }
};

exports.rerunBadgeAnalysis = async (req, res) => {
    try {
        const application = await BadgeApplication.findById(req.params.id);
        if (!application) return res.status(404).json({ success: false, error: 'Badge application not found' });

        application.status = 'pending_analysis';
        application.analysisSummary = 'Analysis queued for re-run.';
        const job = await enqueueJob({
            queue: 'badges',
            name: 'analyze_trusted_badge',
            payload: { applicationId: application._id },
            shop_id: application.shopId,
            maxAttempts: 3,
            idempotencyKey: `badge-analysis-rerun:${application._id}:${Date.now()}`
        });
        application.analysisJobId = job._id;
        await application.save();

        await logPlatformAudit({
            req,
            action: 'badge.analysis_rerun',
            entityType: 'BadgeApplication',
            entityId: application._id,
            shop_id: application.shopId,
            message: 'Trusted seller badge analysis queued again'
        });

        res.status(202).json({ success: true, data: await serializeApplication(application, { includeJob: true }) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to re-run badge analysis' });
    }
};
