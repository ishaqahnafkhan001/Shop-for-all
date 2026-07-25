const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const User = require('../models/User');
const Order = require('../models/Order');
const VendorPlan = require('../models/VendorPlan');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const PaymentTransaction = require('../models/PaymentTransaction');
const PlatformAnnouncement = require('../models/PlatformAnnouncement');
const AbuseReport = require('../models/AbuseReport');
const VendorVerification = require('../models/VendorVerification');
const PlatformAuditLog = require('../models/PlatformAuditLog');
const Job = require('../models/Job');
const cache = require('../services/cacheService');
const { invalidateTenantCache } = require('../middlewares/tenant');
const { logPlatformAudit } = require('../services/platformAuditLogService');
const { runCriticalGovernanceAction } = require('../services/platformAuditOutboxService');
const {
    getVendorAdminEmails,
    sendVendorNotificationEmailSafe,
    buildVendorEventEmail
} = require('../services/vendorNotificationEmailService');
const { VERIFICATION_SUSPENSION_REASON, isVerificationSuspension } = require('../services/vendorVerificationService');
const { getPlanBySlugOrNameOrDefault, getPlanSlug } = require('../services/billing/billingPlanService');
const { ensureSubscriptionExists } = require('../services/billing/subscriptionService');
const {
    PLAN_CONFIG_VERSION,
    PLAN_DEFINITIONS,
    PLAN_ORDER,
    SUBSCRIPTION_STATUS_REGISTRY,
    STORE_BUILDER_CAPABILITIES,
    normalizePlanKey
} = require('../config/subscriptionPlans');
const {
    FEATURE_REGISTRY,
    FEATURE_KEYS,
    getPlanFeatureValue,
    getFeatureRegistryMetadata,
    assertValidPlanCapabilityMatrix
} = require('../config/subscriptionFeatures');
const {
    computeFeatureStatuses
} = require('../services/shops/featureAccessService');
const { SUBSCRIPTION_EVENTS, emitSubscriptionEvent } = require('../services/billing/subscriptionEvents');
const {
    normalizeCustomDomain,
    isValidCustomDomain,
    isPlatformDomain
} = require('../utils/domainUtils');
const {
    serializeAbuseReportSummary,
    serializeAnnouncementSummary,
    serializeDomainSummary,
    serializeInvoiceSummary,
    serializeOwnerSummary,
    serializePaymentSummary,
    serializePlanConfiguration,
    serializePlatformAuditEvent,
    serializeSubscriptionSummary,
    serializeSuperAdminShopDetail,
    serializeSuperAdminShopListItem,
    serializeVerificationSummary
} = require('../services/superAdmin/superAdminSerializers');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const CRITICAL_FEATURE_FLAGS = new Set([
    'storeBuilder',
    'homepageSeo',
    'analytics',
    'dashboardTopProducts',
    'lowStockAlerts',
    'staffAccounts',
    'growthCenter',
    'customDomain',
    'customerSection',
    'emailCampaigns',
    'trustSystem',
    'publicVerifiedBadge',
    'notifications',
    'privacyRequests',
    'activityLogs',
    'scheduledProductPublishing',
    'scheduledSales'
]);
const resolveCanonicalPlanKey = (value) => {
    const key = String(value || '').trim().toLowerCase();
    if (!PLAN_DEFINITIONS[key]) {
        const error = new Error('Plan must be beginner, starter, growth, or pro.');
        error.statusCode = 400;
        throw error;
    }
    return key;
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const safeSearchRegex = (value) => {
    const normalized = String(value || '').trim().slice(0, 80);
    return normalized ? new RegExp(escapeRegex(normalized), 'i') : null;
};

const getPagination = (query = {}) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    return { page, limit, skip: (page - 1) * limit };
};

const getSort = (query = {}, allowed = ['createdAt', 'updatedAt']) => {
    const sortBy = allowed.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortOrder = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    return { [sortBy]: sortOrder, _id: sortOrder };
};

const paginationPayload = ({ page, limit, total }) => ({
    page,
    pageSize: limit,
    limit,
    totalItems: total,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    pages: Math.ceil(total / limit) || 1,
    hasNextPage: page < (Math.ceil(total / limit) || 1),
    hasPrevPage: page > 1
});

const addDateRange = (query, params, field = 'createdAt') => {
    const range = {};
    if (params.dateFrom) range.$gte = new Date(params.dateFrom);
    if (params.dateTo) range.$lte = new Date(params.dateTo);
    if (Object.keys(range).length > 0) query[field] = range;
};

const getReason = (body = {}) => String(body.reason || body.suspensionReason || body.rejectionReason || '').trim();

const requireReason = (res, reason, message = 'Reason is required') => {
    if (reason) return false;
    res.status(400).json({ success: false, error: message });
    return true;
};

const invalidateShopCache = async (shop) => {
    if (!shop?._id) return;
    await Promise.all([
        shop.subdomain ? invalidateTenantCache(shop.subdomain) : Promise.resolve(),
        shop.customDomain?.domain ? invalidateTenantCache(shop.customDomain.domain) : Promise.resolve(),
        cache.del(`storefront:settings:${shop._id}`),
        cache.delPattern(`storefront:bootstrap:${shop._id}:*`)
    ]);
};

const asObjectId = (value) => mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;

const getOwnerMap = async (shops) => {
    const admins = await User.find({
        role: 'VendorAdmin',
        shop_id: { $in: shops.map(shop => shop._id) }
    }).select('fullName email shop_id').lean();

    return new Map(admins.map(admin => [String(admin.shop_id), admin]));
};

const daysUntil = (date) => {
    if (!date) return null;
    return Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
};
const { resolveSubscriptionAccess } = require('../services/billing/subscriptionAccessResolver');

const getBillingDisplay = (subscription, latestPayment = null) => {
    if (!subscription) {
        return {
            status: 'trialing',
            planDisplay: PLAN_DEFINITIONS.beginner.name,
            effectivePlan: 'beginner',
            pendingPlan: '',
            trialDaysLeft: null,
            paymentStatus: latestPayment?.status || ''
        };
    }

    const access = resolveSubscriptionAccess({ subscription });
    const planDisplay = access.subscriptionStatus === 'trialing'
        ? (PLAN_DEFINITIONS[access.effectivePlan]?.name || 'Beginner')
        : (
            subscription.activePlanName ||
            subscription.planId?.name ||
            PLAN_DEFINITIONS[access.effectivePlan]?.name ||
            'Starter'
        );
    if (access.subscriptionStatus === 'trialing') {
        const paymentPending = access.paymentReviewStatus === 'pending_approval';
        return {
            status: 'trialing',
            planDisplay,
            effectivePlan: access.effectivePlan,
            pendingPlan: paymentPending ? subscription.pendingPlanName || '' : '',
            intendedPlan: subscription.intendedPlanName || subscription.activePlanName || 'Beginner',
            trialDaysLeft: daysUntil(subscription.trialEndsAt),
            paymentStatus: latestPayment?.status || '',
            paymentReviewStatus: access.paymentReviewStatus
        };
    }

    if (access.paymentReviewStatus === 'pending_approval') {
        return {
            status: access.subscriptionStatus,
            planDisplay,
            effectivePlan: access.effectivePlan,
            pendingPlan: subscription.pendingPlanName || '',
            intendedPlan: subscription.intendedPlanName || subscription.pendingPlanName || '',
            trialDaysLeft: daysUntil(subscription.trialEndsAt),
            paymentStatus: latestPayment?.status || 'pending',
            paymentReviewStatus: access.paymentReviewStatus
        };
    }

    if (subscription.status === 'active') {
        return {
            status: 'active',
            planDisplay,
            effectivePlan: access.effectivePlan,
            pendingPlan: '',
            intendedPlan: subscription.intendedPlanName || '',
            trialDaysLeft: null,
            paymentStatus: latestPayment?.status || ''
        };
    }

    return {
        status: subscription.status,
        planDisplay,
        effectivePlan: access.effectivePlan,
        pendingPlan: subscription.pendingPlanName || '',
        trialDaysLeft: daysUntil(subscription.trialEndsAt),
        paymentStatus: latestPayment?.status || ''
    };
};

const getEffectiveFeatureSnapshot = (shop, subscription) => {
    const access = resolveSubscriptionAccess({ subscription, shop });
    const populatedPlan = subscription?.planId && typeof subscription.planId === 'object'
        ? subscription.planId
        : null;
    const plan = populatedPlan?.features
        ? populatedPlan
        : (PLAN_DEFINITIONS[access.effectivePlan] || PLAN_DEFINITIONS.starter);
    const planFeatures = Object.fromEntries(
        FEATURE_KEYS.map(key => [key, getPlanFeatureValue(plan, key)])
    );
    const statuses = computeFeatureStatuses(shop, planFeatures, access);

    return {
        effectivePlan: access.effectivePlan,
        effectiveFeatures: Object.fromEntries(
            Object.entries(statuses).map(([key, status]) => [key, status.enabled])
        ),
        featureEntitlements: Object.fromEntries(
            Object.entries(statuses).map(([key, status]) => [key, {
                enabled: status.enabled,
                reason: status.reason,
                planAllowed: status.planAllowed,
                shopOverride: status.shopOverride
            }])
        )
    };
};

const serializeShop = (shop, ownerMap, subscriptionMap = new Map(), paymentMap = new Map()) => {
    const subscription = subscriptionMap.get(String(shop._id)) || null;
    const latestPayment = paymentMap.get(String(shop._id)) || null;
    return {
        ...serializeSuperAdminShopListItem(shop),
        owner: serializeOwnerSummary(ownerMap.get(String(shop._id))),
        billing: getBillingDisplay(subscription, latestPayment),
        subscription: serializeSubscriptionSummary(subscription),
        ...getEffectiveFeatureSnapshot(shop, subscription)
    };
};

const buildShopSearchIds = async (search) => {
    if (!search) return null;
    const regex = safeSearchRegex(search);
    if (!regex) return null;
    const owners = await User.find({
        role: 'VendorAdmin',
        $or: [{ email: regex }, { fullName: regex }]
    }).select('shop_id').lean();
    return {
        regex,
        ownerShopIds: owners.map(owner => owner.shop_id).filter(Boolean)
    };
};

const assertCustomDomainAvailable = async (domain, shopId) => {
    const existingShop = await Shop.findOne({
        _id: { $ne: shopId },
        'customDomain.domain': domain
    }).select('_id shopName subdomain').lean();

    if (existingShop) {
        const error = new Error('This domain is already connected to another shop.');
        error.statusCode = 400;
        throw error;
    }
};

const getDomainWarnings = (domain, duplicateCount = 1) => {
    const normalizedDomain = normalizeCustomDomain(domain);
    const warnings = [];
    if (!normalizedDomain) return warnings;
    if (duplicateCount > 1) warnings.push('duplicate');
    if (isPlatformDomain(normalizedDomain)) warnings.push('platform_domain');
    if (!isValidCustomDomain(normalizedDomain)) warnings.push('invalid_domain');
    return [...new Set(warnings)];
};

const getVerificationSummaryCounts = async () => {
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

const getPriorityAlerts = async () => {
    const now = new Date();
    const soon = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    const [
        pendingVerifications,
        expiredVerifications,
        deadlineSoon,
        openAbuseReports,
        suspendedShops,
        failedPayments,
        pendingDomains
    ] = await Promise.all([
        VendorVerification.countDocuments({ status: 'pending' }),
        VendorVerification.countDocuments({ status: { $ne: 'approved' }, verificationDeadline: { $lt: now } }),
        VendorVerification.countDocuments({ status: { $ne: 'approved' }, verificationDeadline: { $gte: now, $lte: soon } }),
        AbuseReport.countDocuments({ status: 'Open' }),
        Shop.countDocuments({ $or: [{ isActive: false }, { approvalStatus: 'Suspended' }] }),
        Order.countDocuments({ 'payment.status': 'Failed' }),
        Shop.countDocuments({
            'customDomain.domain': { $ne: '' },
            'customDomain.status': { $in: ['PendingVerification', 'OwnershipVerified', 'RoutingPending'] }
        })
    ]);

    return {
        pendingVerifications,
        expiredVerifications,
        deadlineSoon,
        openAbuseReports,
        suspendedShops,
        failedPayments,
        pendingDomains
    };
};

exports.getPlatformOverview = async (req, res) => {
    try {
        const reportTo = new Date();
        const reportFrom = new Date(reportTo.getTime() - (30 * 24 * 60 * 60 * 1000));
        const [
            shopCount,
            activeShopCount,
            suspendedShopCount,
            customerCount,
            orderCount,
            orderStats,
            failedPayments,
            alerts,
            subscriptionStatuses,
            subscriptionPlans,
            paymentStats,
            verification,
            jobHealth,
            recentAudit
        ] = await Promise.all([
            Shop.countDocuments(),
            Shop.countDocuments({ isActive: true, approvalStatus: 'Approved' }),
            Shop.countDocuments({ $or: [{ isActive: false }, { approvalStatus: 'Suspended' }] }),
            User.countDocuments({ role: 'Customer' }),
            Order.estimatedDocumentCount(),
            Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: reportFrom, $lt: reportTo }
                    }
                },
                {
                    $group: {
                        _id: null,
                        orders: { $sum: 1 },
                        revenue: { $sum: '$pricing.total' }
                    }
                }
            ]),
            Order.countDocuments({ 'payment.status': 'Failed' }),
            getPriorityAlerts(),
            Subscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Subscription.aggregate([{ $group: { _id: '$activePlanSlug', count: { $sum: 1 } } }]),
            PaymentTransaction.aggregate([
                {
                    $match: {
                        status: { $in: ['approved', 'verified'] },
                        verifiedAt: { $gte: reportFrom, $lt: reportTo }
                    }
                },
                { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } }
            ]),
            getVerificationSummaryCounts(),
            Job.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            PlatformAuditLog.find()
                .select('actorName actorEmail actorRole action entityType entityId entityLabel shop_id message reason metadata severity createdAt')
                .sort({ createdAt: -1 })
                .limit(8)
                .populate('shop_id', 'shopName subdomain')
                .lean()
        ]);

        res.status(200).json({
            success: true,
            data: {
                shops: shopCount,
                activeShops: activeShopCount,
                suspendedShops: suspendedShopCount,
                customers: customerCount,
                orders: orderCount,
                reportingWindowOrders: orderStats[0]?.orders || 0,
                platformRevenue: orderStats[0]?.revenue || 0,
                grossMerchandiseValue: orderStats[0]?.revenue || 0,
                subscriptionRevenue: Number(paymentStats[0]?.amount) || 0,
                approvedPayments: Number(paymentStats[0]?.count) || 0,
                reportingWindow: {
                    type: 'rolling_days',
                    days: 30,
                    from: reportFrom,
                    to: reportTo
                },
                failedPayments,
                alerts,
                verification,
                subscriptionsByStatus: Object.fromEntries(
                    subscriptionStatuses.map(row => [row._id || 'unknown', row.count])
                ),
                subscriptionsByPlan: Object.fromEntries(
                    subscriptionPlans.map(row => [row._id || 'unknown', row.count])
                ),
                jobsByStatus: Object.fromEntries(
                    jobHealth.map(row => [row._id || 'unknown', row.count])
                ),
                recentAudit: recentAudit.map(serializePlatformAuditEvent)
            }
        });
    } catch (err) {
        console.error('Platform overview error:', err);
        res.status(500).json({ success: false, error: 'Failed to load platform overview' });
    }
};

exports.getShops = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const query = {};
        if (req.query.status && req.query.status !== 'all') query.approvalStatus = req.query.status;
        addDateRange(query, req.query);

        const searchData = await buildShopSearchIds(req.query.search);
        if (searchData) {
            query.$or = [
                { shopName: searchData.regex },
                { subdomain: searchData.regex },
                ...(searchData.ownerShopIds.length ? [{ _id: { $in: searchData.ownerShopIds } }] : [])
            ];
        }

        const [shops, total] = await Promise.all([
            Shop.find(query)
                .select('shopName displayName subdomain approvalStatus isActive suspensionReason plan featureFlags verification badgeStatus createdAt updatedAt')
                .sort(getSort(req.query, ['createdAt', 'updatedAt', 'shopName', 'approvalStatus']))
                .skip(skip)
                .limit(limit)
                .lean(),
            Shop.countDocuments(query)
        ]);
        const ownerMap = await getOwnerMap(shops);
        const shopIds = shops.map(shop => shop._id);
        const [subscriptions, payments] = await Promise.all([
            Subscription.find({ shopId: { $in: shopIds } })
                .populate('planId', 'name slug features limits storeBuilderAccess storeBuilderCapabilities')
                .lean(),
            PaymentTransaction.aggregate([
                { $match: { shopId: { $in: shopIds } } },
                { $sort: { shopId: 1, createdAt: -1, _id: -1 } },
                { $group: { _id: '$shopId', latest: { $first: '$$ROOT' } } },
                { $replaceRoot: { newRoot: '$latest' } }
            ])
        ]);
        const subscriptionMap = new Map(subscriptions.map(item => [String(item.shopId), item]));
        const paymentMap = payments.reduce((acc, payment) => {
            const key = String(payment.shopId);
            if (!acc.has(key)) acc.set(key, payment);
            return acc;
        }, new Map());

        res.status(200).json({
            success: true,
            data: shops.map(shop => serializeShop(shop, ownerMap, subscriptionMap, paymentMap)),
            pagination: paginationPayload({ page, limit, total })
        });
    } catch (err) {
        console.error('Get shops error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch shops' });
    }
};

exports.getShopDetail = async (req, res) => {
    try {
        const shopId = asObjectId(req.params.shopId);
        if (!shopId) return res.status(400).json({ success: false, error: 'Invalid shop id' });

        const [shop, owner, verification, abuseReports, recentAuditLogs, subscription, latestInvoice, latestPayment] = await Promise.all([
            Shop.findById(shopId)
                .select('shopName displayName subdomain approvalStatus isActive suspensionReason plan featureFlags verification badgeStatus badgeType badgeApprovedAt badgeExpiresAt badgeRevokedAt badgeRevokedReason customDomain createdAt updatedAt')
                .lean(),
            User.findOne({ shop_id: shopId, role: 'VendorAdmin' }).select('fullName email status').lean(),
            VendorVerification.findOne({ shop_id: shopId })
                .select('shop_id owner_id reviewedBy status nidName +nidNumber verificationDeadline submittedAt approvedAt rejectedAt rejectionReason createdAt updatedAt')
                .sort({ updatedAt: -1 })
                .lean(),
            AbuseReport.find({ shop_id: shopId }).sort({ createdAt: -1 }).limit(10).lean(),
            PlatformAuditLog.find({ shop_id: shopId }).sort({ createdAt: -1 }).limit(10).lean(),
            Subscription.findOne({ shopId })
                .populate('planId', 'name slug monthlyPrice yearlyPrice features limits storeBuilderAccess storeBuilderCapabilities')
                .lean(),
            Invoice.findOne({ shopId }).sort({ createdAt: -1 }).lean(),
            PaymentTransaction.findOne({ shopId }).sort({ createdAt: -1 }).lean()
        ]);

        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        const deadline = verification?.verificationDeadline || shop.verification?.deadline || null;
        const daysLeft = deadline
            ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
            : null;

        res.status(200).json({
            success: true,
            data: {
                shop: {
                    ...serializeSuperAdminShopDetail(shop),
                    ...getEffectiveFeatureSnapshot(shop, subscription)
                },
                owner: serializeOwnerSummary(owner),
                verification: verification ? serializeVerificationSummary(verification, {
                    daysLeft,
                    isExpired: deadline ? new Date(deadline).getTime() < Date.now() : false,
                    isVerificationSuspension: isVerificationSuspension(shop)
                }) : {
                    status: shop.verification?.status || 'not_submitted',
                    verificationDeadline: deadline,
                    daysLeft,
                    isExpired: deadline ? new Date(deadline).getTime() < Date.now() : false,
                    isVerificationSuspension: isVerificationSuspension(shop)
                },
                domain: serializeDomainSummary(shop.customDomain),
                billing: {
                    ...getBillingDisplay(subscription, latestPayment),
                    subscription: serializeSubscriptionSummary(subscription),
                    latestInvoice: serializeInvoiceSummary(latestInvoice),
                    latestPayment: serializePaymentSummary(latestPayment)
                },
                abuseReports: abuseReports.map(report => ({
                    _id: report._id,
                    reason: report.reason,
                    details: report.details || '',
                    status: report.status,
                    internalNote: report.internalNote || '',
                    resolutionReason: report.resolutionReason || '',
                    createdAt: report.createdAt,
                    updatedAt: report.updatedAt
                })),
                recentAuditLogs: recentAuditLogs.map(serializePlatformAuditEvent)
            }
        });
    } catch (err) {
        console.error('Get shop detail error:', err);
        res.status(500).json({ success: false, error: 'Failed to load shop detail' });
    }
};

const updateShopAndLog = async ({ req, shop, update, action, message, reason = '', metadata = {}, severity = 'info' }) => {
    const previousCustomDomain = shop.customDomain?.domain;
    const updated = await runCriticalGovernanceAction({
        mutate: async (session) => {
            const current = await Shop.findOne({ _id: shop._id, __v: shop.__v }).session(session);
            if (!current) {
                const error = new Error('The shop changed. Reload and try again.');
                error.code = 'SHOP_GOVERNANCE_CONFLICT';
                error.statusCode = 409;
                throw error;
            }
            Object.entries(update).forEach(([key, value]) => current.set(key, value));
            await current.save({ session });
            return current;
        },
        audit: (current) => ({
            req,
            action,
            entityType: 'Shop',
            entityId: current._id,
            entityLabel: current.shopName,
            shop_id: current._id,
            message,
            reason,
            metadata,
            severity
        })
    });
    await Promise.all([
        invalidateShopCache(updated),
        previousCustomDomain ? invalidateTenantCache(previousCustomDomain) : Promise.resolve()
    ]);
    return updated;
};

exports.updateShopStatus = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.shopId);
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        const status = req.body.status || req.body.approvalStatus;
        if (!['Pending', 'Approved', 'Suspended'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid shop status' });
        }

        if (status === 'Approved' && isVerificationSuspension(shop)) {
            return res.status(400).json({
                success: false,
                error: 'Approve the vendor verification record to reactivate this verification-suspended shop.'
            });
        }

        const reason = getReason(req.body);
        if (status === 'Suspended' && requireReason(res, reason, 'Suspension reason is required')) return;

        const update = {
            approvalStatus: status,
            isActive: status !== 'Suspended'
        };

        if (status === 'Suspended') {
            update.suspensionReason = reason;
        } else if (status === 'Approved' && !isVerificationSuspension(shop)) {
            update.suspensionReason = '';
        }

        const updated = await updateShopAndLog({
            req,
            shop,
            update,
            action: status === 'Suspended' ? 'shop.suspended' : status === 'Approved' ? 'shop.unsuspended' : 'shop.status_changed',
            message: `Shop status changed to ${status}`,
            reason,
            metadata: { before: { approvalStatus: shop.approvalStatus, isActive: shop.isActive }, after: update },
            severity: status === 'Suspended' ? 'warning' : 'info'
        });
        await Subscription.updateOne(
            { shopId: shop._id },
            { $inc: { entitlementVersion: 1 } }
        );

        res.status(200).json({ success: true, data: serializeSuperAdminShopDetail(updated) });
    } catch (err) {
        console.error('Update shop status error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update shop status' });
    }
};

exports.updateShopPlan = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.shopId);
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        const reason = getReason(req.body);
        if (requireReason(res, reason, 'A reason is required for a forced plan change')) return;
        const incoming = req.body.plan || req.body;
        const planKey = resolveCanonicalPlanKey(incoming.slug || incoming.name);
        const planDefinition = await getPlanBySlugOrNameOrDefault(planKey);
        const beforePlan = shop.plan?.toObject ? shop.plan.toObject() : shop.plan || {};
        const plan = {
            ...beforePlan,
            name: planDefinition.name,
            productLimit: planDefinition.limits?.productCount ?? planDefinition.productLimit ?? null,
            activePlanName: planDefinition.name,
            activePlanSlug: getPlanSlug(planDefinition)
        };
        const storedPlan = await VendorPlan.findOne({ slug: planKey }).select('_id name slug').lean();
        const subscription = await ensureSubscriptionExists(shop);
        const changed = await runCriticalGovernanceAction({
            mutate: async (session) => {
                const currentShop = await Shop.findOne({
                    _id: shop._id,
                    __v: shop.__v
                }).session(session);
                const currentSubscription = await Subscription.findOne({
                    _id: subscription._id,
                    __v: subscription.__v
                }).session(session);
                if (!currentShop || !currentSubscription) {
                    const error = new Error('The shop or subscription changed. Reload and try again.');
                    error.code = 'PLAN_CHANGE_CONFLICT';
                    error.statusCode = 409;
                    throw error;
                }

                currentShop.plan = plan;
                await currentShop.save({ session });
                currentSubscription.planId = storedPlan?._id || null;
                currentSubscription.activePlanName = planDefinition.name;
                currentSubscription.activePlanSlug = planKey;
                currentSubscription.entitlementVersion = Number(currentSubscription.entitlementVersion || 0) + 1;
                await currentSubscription.save({ session });
                return { shop: currentShop, subscription: currentSubscription };
            },
            audit: ({ shop: updatedShop, subscription: updatedSubscription }) => ({
                req,
                action: 'shop.plan_changed',
                entityType: 'Subscription',
                entityId: updatedSubscription._id,
                entityLabel: updatedShop.shopName,
                shop_id: updatedShop._id,
                message: `Shop plan changed to ${planDefinition.name}`,
                reason,
                metadata: {
                    fromPlan: beforePlan.activePlanSlug || beforePlan.activePlanName || beforePlan.name || '',
                    toPlan: planKey
                },
                severity: 'warning'
            })
        });
        await Promise.all([
            invalidateShopCache(changed.shop),
            shop.customDomain?.domain
                ? invalidateTenantCache(shop.customDomain.domain)
                : Promise.resolve()
        ]);
        const previousPlanKey = normalizePlanKey(
            beforePlan.activePlanSlug || beforePlan.activePlanName || beforePlan.name || 'starter'
        );
        const previousIndex = PLAN_ORDER.indexOf(previousPlanKey);
        const nextIndex = PLAN_ORDER.indexOf(planKey);
        const eventType = nextIndex > previousIndex
            ? SUBSCRIPTION_EVENTS.PLAN_UPGRADED
            : nextIndex < previousIndex
                ? SUBSCRIPTION_EVENTS.PLAN_DOWNGRADED
                : SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED;
        const eventResult = await emitSubscriptionEvent(eventType, {
            req,
            shopId: shop._id,
            subscriptionId: changed.subscription._id,
            planKey,
            oldValue: { planKey: previousPlanKey, planName: beforePlan.name || '' },
            newValue: { planKey, planName: planDefinition.name },
            reason,
            affectedResources: ['subscription', 'plan', 'features', 'quotas'],
            metadata: { oldPlanKey: previousPlanKey, newPlanKey: planKey, newPlanName: planDefinition.name }
        });
        const reconciliation = eventResult.results['subscription.reconciliation'] || {};
        const recipients = await getVendorAdminEmails(shop._id);
        if (recipients.length) {
            sendVendorNotificationEmailSafe({
                to: recipients,
                type: 'billing',
                senderName: 'ScaleUp Billing',
                subject: `Your ScaleUp plan is now ${planDefinition.name}`,
                html: buildVendorEventEmail({
                    title: `Plan changed to ${planDefinition.name}`,
                    intro: 'Your store plan was updated. Your data remains preserved, while access and usage limits now follow the new plan.',
                    rows: [
                        { label: 'Plan', value: planDefinition.name },
                        { label: 'Products blocked', value: reconciliation.scheduledProductsBlocked || 0 },
                        { label: 'Scheduled sales blocked', value: reconciliation.scheduledSalesBlocked || 0 }
                    ]
                }),
                text: `Your ScaleUp plan is now ${planDefinition.name}. Review Plan & Usage in your vendor admin.`
            });
        }

        res.status(200).json({
            success: true,
            data: serializeSuperAdminShopDetail(changed.shop),
            reconciliation
        });
    } catch (err) {
        console.error('Update shop plan error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update shop plan' });
    }
};

exports.updateShopFeatureFlags = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.shopId);
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        const featureFlags = req.body.featureFlags;
        if (!featureFlags || typeof featureFlags !== 'object' || Array.isArray(featureFlags)) {
            return res.status(400).json({
                success: false,
                code: 'FEATURE_FLAGS_REQUIRED',
                error: 'featureFlags must be an object containing supported boolean overrides.'
            });
        }
        const planKey = normalizePlanKey(
            shop.plan?.activePlanSlug || shop.plan?.activePlanName || shop.plan?.name || 'starter'
        );
        const planDefinition = await getPlanBySlugOrNameOrDefault(planKey);
        for (const [key, value] of Object.entries(featureFlags)) {
            const definition = FEATURE_REGISTRY[key];
            if (
                !definition ||
                definition.overridePolicy !== 'disable_only' ||
                typeof value !== 'boolean'
            ) {
                return res.status(400).json({
                    success: false,
                    code: 'INVALID_FEATURE_OVERRIDE',
                    error: `Feature override "${key}" is not supported.`
                });
            }
            if (value === true && planDefinition.features?.[key] !== true) {
                return res.status(403).json({
                    success: false,
                    code: 'PLAN_FEATURE_OVERRIDE_DENIED',
                    error: `The ${planDefinition.name} plan does not include ${definition.label}.`
                });
            }
        }
        const changedCriticalFlag = Object.keys(featureFlags).some(key => (
            CRITICAL_FEATURE_FLAGS.has(key) &&
            shop.featureFlags?.[key] === true &&
            featureFlags[key] === false
        ));
        const reason = getReason(req.body);
        if (changedCriticalFlag && requireReason(res, reason, 'Reason is required to disable this feature')) return;

        const nextFlags = { ...(shop.featureFlags?.toObject ? shop.featureFlags.toObject() : shop.featureFlags || {}), ...featureFlags };
        const updated = await updateShopAndLog({
            req,
            shop,
            update: { featureFlags: nextFlags },
            action: 'shop.feature_flags_changed',
            message: 'Shop feature flags changed',
            reason,
            metadata: { before: shop.featureFlags, after: nextFlags },
            severity: changedCriticalFlag ? 'warning' : 'info'
        });
        await Subscription.updateOne(
            { shopId: shop._id },
            { $inc: { entitlementVersion: 1 } }
        );

        await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.FEATURE_OVERRIDE_CHANGED, {
            req,
            shopId: shop._id,
            planKey: normalizePlanKey(shop.plan?.activePlanSlug || shop.plan?.name || 'starter'),
            oldValue: shop.featureFlags?.toObject ? shop.featureFlags.toObject() : shop.featureFlags || {},
            newValue: nextFlags,
            reason,
            affectedResources: Object.keys(featureFlags),
            metadata: { changedFeatures: Object.keys(featureFlags) }
        });

        res.status(200).json({ success: true, data: serializeSuperAdminShopDetail(updated) });
    } catch (err) {
        console.error('Update shop feature flags error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update feature flags' });
    }
};

exports.updateShopGovernance = async (req, res) => {
    try {
        const status = req.body.approvalStatus || req.body.status;
        if (status) {
            req.params.shopId = req.params.id;
            req.body.status = status;
            return exports.updateShopStatus(req, res);
        }

        if (req.body.plan) {
            req.params.shopId = req.params.id;
            return exports.updateShopPlan(req, res);
        }

        if (req.body.featureFlags) {
            req.params.shopId = req.params.id;
            return exports.updateShopFeatureFlags(req, res);
        }

        return res.status(400).json({
            success: false,
            code: 'UNSUPPORTED_SHOP_GOVERNANCE_FIELDS',
            error: 'Use a dedicated shop status, plan, feature, or domain operation.',
            unsupportedFields: Object.keys(req.body || {}).filter(key => key !== 'reason')
        });
    } catch (err) {
        console.error('Update shop governance error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update shop' });
    }
};

exports.getPlans = async (req, res) => {
    try {
        const plans = await VendorPlan.find().sort({ monthlyPrice: 1 });
        res.status(200).json({
            success: true,
            data: plans.map(serializePlanConfiguration),
            registry: {
                version: PLAN_CONFIG_VERSION,
                plans: PLAN_ORDER.map(key => ({
                    key,
                    name: PLAN_DEFINITIONS[key].name
                })),
                features: getFeatureRegistryMetadata(),
                subscriptionStatuses: SUBSCRIPTION_STATUS_REGISTRY,
                storeBuilderAccess: Object.keys(STORE_BUILDER_CAPABILITIES)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch plans' });
    }
};

exports.upsertPlan = async (req, res) => {
    try {
        const planKey = resolveCanonicalPlanKey(req.body.slug || req.body.name);
        const current = await VendorPlan.findOne({ slug: planKey }).lean();
        const limits = req.body.limits || {};
        const incomingFeatures = req.body.features || {};
        const unknownFeatures = Object.keys(incomingFeatures).filter(key => !FEATURE_REGISTRY[key]);
        if (unknownFeatures.length) {
            return res.status(400).json({
                success: false,
                code: 'UNKNOWN_PLAN_CAPABILITY',
                error: `Unsupported capabilities: ${unknownFeatures.join(', ')}`
            });
        }
        const nonEditableFeatures = Object.keys(incomingFeatures).filter(
            key => FEATURE_REGISTRY[key]?.editableCommercially !== true
        );
        if (nonEditableFeatures.length) {
            return res.status(400).json({
                success: false,
                code: 'PLAN_CAPABILITY_NOT_EDITABLE',
                error: `These capabilities are derived and cannot be edited directly: ${nonEditableFeatures.join(', ')}`
            });
        }
        if (Object.values(incomingFeatures).some(value => typeof value !== 'boolean')) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_PLAN_CAPABILITY_VALUE',
                error: 'Capability values must be true or false.'
            });
        }
        const numericFields = [
            req.body.monthlyPrice,
            req.body.yearlyPrice,
            req.body.productLimit,
            req.body.staffLimit,
            ...Object.values(limits)
        ].filter(value => value !== undefined && value !== null);
        if (numericFields.some(value => !Number.isFinite(Number(value)) || Number(value) < 0)) {
            return res.status(400).json({ success: false, error: 'Plan prices and limits must be zero or positive numbers.' });
        }
        const storeBuilderAccess = req.body.storeBuilderAccess || current?.storeBuilderAccess || PLAN_DEFINITIONS[planKey].storeBuilderAccess;
        if (!STORE_BUILDER_CAPABILITIES[storeBuilderAccess]) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_STORE_BUILDER_ACCESS',
                error: 'Store Builder access must be none, limited, or full.'
            });
        }
        const accessChanged = storeBuilderAccess !== current?.storeBuilderAccess;
        const features = {
            ...PLAN_DEFINITIONS[planKey].features,
            ...(current?.features || {}),
            ...incomingFeatures
        };
        assertValidPlanCapabilityMatrix({
            [planKey]: { features }
        });
        const payload = {
            name: planKey[0].toUpperCase() + planKey.slice(1),
            slug: planKey,
            monthlyPrice: req.body.monthlyPrice ?? current?.monthlyPrice ?? PLAN_DEFINITIONS[planKey].monthlyPrice,
            yearlyPrice: req.body.yearlyPrice ?? current?.yearlyPrice ?? PLAN_DEFINITIONS[planKey].yearlyPrice,
            currency: req.body.currency || current?.currency || PLAN_DEFINITIONS[planKey].currency,
            limits: {
                ...PLAN_DEFINITIONS[planKey].limits,
                ...(current?.limits || {}),
                ...limits
            },
            features,
            storeBuilderAccess,
            storeBuilderCapabilities: accessChanged
                ? { ...STORE_BUILDER_CAPABILITIES[storeBuilderAccess], ...(req.body.storeBuilderCapabilities || {}) }
                : {
                    ...STORE_BUILDER_CAPABILITIES[storeBuilderAccess],
                    ...(current?.storeBuilderCapabilities || {}),
                    ...(req.body.storeBuilderCapabilities || {})
                },
            badgeEligible: req.body.badgeEligible ?? current?.badgeEligible ?? PLAN_DEFINITIONS[planKey].badgeEligible,
            prioritySupport: req.body.prioritySupport ?? current?.prioritySupport ?? PLAN_DEFINITIONS[planKey].prioritySupport,
            isActive: req.body.isActive ?? current?.isActive ?? true
        };
        payload.planConfigVersion = PLAN_CONFIG_VERSION;
        payload.lastSyncedAt = new Date();
        payload.productLimit = payload.limits.productCount ?? payload.productLimit ?? current?.productLimit ?? null;
        payload.staffLimit = payload.limits.staffAccounts ?? payload.staffLimit ?? current?.staffLimit ?? null;
        const expectedVersion = req.body.expectedVersion;
        if (
            current &&
            expectedVersion !== undefined &&
            Number(expectedVersion) !== Number(current.__v || 0)
        ) {
            return res.status(409).json({
                success: false,
                code: 'PLAN_CONFIG_CONFLICT',
                error: 'This plan was changed by another administrator. Reload and try again.'
            });
        }

        const plan = await runCriticalGovernanceAction({
            mutate: async (session) => {
                if (!current) {
                    const [created] = await VendorPlan.create([{
                        ...payload,
                        configRevision: 1
                    }], { session });
                    return created;
                }

                const updated = await VendorPlan.findOneAndUpdate(
                    { _id: current._id, __v: current.__v || 0 },
                    {
                        $set: payload,
                        $inc: { __v: 1, configRevision: 1 }
                    },
                    { new: true, runValidators: true, session }
                );
                if (!updated) {
                    const conflict = new Error('This plan was changed by another administrator. Reload and try again.');
                    conflict.code = 'PLAN_CONFIG_CONFLICT';
                    conflict.statusCode = 409;
                    throw conflict;
                }
                return updated;
            },
            audit: updated => ({
                req,
                action: 'plan.upserted',
                entityType: 'VendorPlan',
                entityId: updated._id,
                entityLabel: updated.name,
                message: `Vendor plan ${updated.name} saved`,
                metadata: {
                    planKey,
                    previousRevision: current?.configRevision || 0,
                    newRevision: updated.configRevision,
                    changedCapabilities: Object.keys(incomingFeatures),
                    changedLimits: Object.keys(limits)
                }
            })
        });

        const affectedSubscriptions = await Subscription.find({
            $or: [
                { activePlanSlug: planKey },
                { planId: plan._id },
                ...(planKey === 'beginner' ? [{ status: 'trialing' }] : [])
            ]
        }).select('_id shopId').lean();
        await Subscription.updateMany(
            { _id: { $in: affectedSubscriptions.map(item => item._id) } },
            { $inc: { entitlementVersion: 1 } }
        );
        const reconciliation = { processed: 0, failed: 0 };
        for (const subscription of affectedSubscriptions) {
            try {
                const eventResult = await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.QUOTA_LIMIT_CHANGED, {
                    req,
                    shopId: subscription.shopId,
                    subscriptionId: subscription._id,
                    planKey,
                    oldValue: current ? { limits: current.limits, features: current.features } : null,
                    newValue: { limits: plan.limits, features: plan.features },
                    affectedResources: ['features', 'quotas'],
                    metadata: { newPlanKey: planKey, planDefinitionUpdated: true }
                });
                const reconciliationError = eventResult.errors.find(item => item.subscriber === 'subscription.reconciliation');
                if (reconciliationError) throw reconciliationError.error;
                reconciliation.processed += 1;
            } catch (_error) {
                reconciliation.failed += 1;
            }
        }

        res.status(200).json({
            success: true,
            data: serializePlanConfiguration(plan),
            reconciliation,
            registryVersion: PLAN_CONFIG_VERSION
        });
    } catch (err) {
        res.status(err.statusCode || 400).json({
            success: false,
            code: err.code || 'PLAN_SAVE_FAILED',
            error: err.message || 'Failed to save plan',
            validationErrors: err.validationErrors
        });
    }
};

exports.getDomains = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const query = { 'customDomain.domain': { $ne: '' } };
        if (req.query.status && req.query.status !== 'all') query['customDomain.status'] = req.query.status;
        addDateRange(query, req.query, 'customDomain.lastCheckedAt');
        const searchData = await buildShopSearchIds(req.query.search);
        if (searchData) {
            query.$or = [
                { 'customDomain.domain': searchData.regex },
                { shopName: searchData.regex },
                { subdomain: searchData.regex },
                ...(searchData.ownerShopIds.length ? [{ _id: { $in: searchData.ownerShopIds } }] : [])
            ];
        }

        const [shops, total] = await Promise.all([
            Shop.find(query)
                .select([
                    'shopName',
                    'subdomain',
                    'customDomain.domain',
                    'customDomain.status',
                    'customDomain.adminNote',
                    'customDomain.ownershipVerified',
                    'customDomain.routingVerified',
                    'customDomain.manuallyVerifiedRouting',
                    'customDomain.verifiedAt',
                    'customDomain.lastCheckedAt',
                    'customDomain.lastDnsCheckStatus',
                    'customDomain.lastDnsCheckError',
                    'customDomain.lastOwnershipCheckStatus',
                    'customDomain.lastRoutingCheckStatus'
                ].join(' '))
                .sort(getSort(req.query, ['updatedAt', 'createdAt', 'shopName']))
                .skip(skip)
                .limit(limit)
                .lean(),
            Shop.countDocuments(query)
        ]);
        const ownerMap = await getOwnerMap(shops);
        const domains = shops.map(shop => normalizeCustomDomain(shop.customDomain?.domain)).filter(Boolean);
        const duplicateCounts = domains.length > 0
            ? await Shop.aggregate([
                { $match: { 'customDomain.domain': { $in: domains } } },
                { $group: { _id: '$customDomain.domain', count: { $sum: 1 } } }
            ])
            : [];
        const countMap = new Map(duplicateCounts.map(item => [item._id, item.count]));

        res.status(200).json({
            success: true,
            data: shops.map(shop => {
                const domain = normalizeCustomDomain(shop.customDomain?.domain);
                return {
                    _id: shop._id,
                    shopName: shop.shopName || '',
                    subdomain: shop.subdomain || '',
                    customDomain: serializeDomainSummary(shop.customDomain),
                    owner: serializeOwnerSummary(ownerMap.get(String(shop._id))),
                    customDomainWarnings: getDomainWarnings(domain, countMap.get(domain) || 1)
                };
            }),
            pagination: paginationPayload({ page, limit, total })
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch domains' });
    }
};

exports.updateDomain = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.shopId);
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        const allowedStatuses = ['NotConfigured', 'PendingVerification', 'OwnershipVerified', 'RoutingPending', 'Verified', 'Failed'];
        const status = req.body.status || shop.customDomain?.status || 'NotConfigured';
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid domain status' });
        }
        const reason = getReason(req.body);
        if (status === 'Failed' && requireReason(res, reason, 'Reason is required when marking a domain as failed')) return;
        const adminNote = String(req.body.adminNote ?? shop.customDomain?.adminNote ?? '').trim();
        if (status === 'Verified' && !adminNote && requireReason(res, reason, 'Admin note or reason is required for manual domain verification')) return;

        const existingDomain = normalizeCustomDomain(shop.customDomain?.domain);
        if (status === 'Verified') {
            if (!existingDomain) {
                return res.status(400).json({ success: false, error: 'Custom domain is required before verification.' });
            }
            if (isPlatformDomain(existingDomain)) {
                return res.status(400).json({ success: false, error: 'Platform domains cannot be used as store custom domains.' });
            }
            if (!isValidCustomDomain(existingDomain)) {
                return res.status(400).json({ success: false, error: 'Invalid custom domain.' });
            }
            await assertCustomDomainAvailable(existingDomain, shop._id);
        }

        const now = new Date();
        const ownershipVerified = ['OwnershipVerified', 'RoutingPending', 'Verified'].includes(status);
        const routingVerified = Boolean(status === 'Verified' && shop.customDomain?.routingVerified);
        const manuallyVerifiedRouting = status === 'Verified' && !shop.customDomain?.routingVerified;
        const customDomain = {
            ...(shop.customDomain?.toObject ? shop.customDomain.toObject() : shop.customDomain || {}),
            domain: existingDomain,
            status,
            adminNote,
            ownershipVerified,
            routingVerified,
            manuallyVerifiedRouting,
            lastCheckedAt: req.body.lastCheckedAt ? new Date(req.body.lastCheckedAt) : now,
            verifiedAt: status === 'Verified' ? now : null,
            lastDnsCheckStatus: status === 'Verified'
                ? (manuallyVerifiedRouting ? 'manual_verified' : 'verified')
                : (status === 'Failed' ? 'failed' : shop.customDomain?.lastDnsCheckStatus || ''),
            lastDnsCheckError: status === 'Verified'
                ? ''
                : (status === 'Failed' ? reason : shop.customDomain?.lastDnsCheckError || ''),
            lastOwnershipCheckStatus: ownershipVerified
                ? (status === 'Verified' && manuallyVerifiedRouting ? 'manual_verified' : 'verified')
                : '',
            lastRoutingCheckStatus: status === 'Verified'
                ? (manuallyVerifiedRouting ? 'manual_verified' : 'verified')
                : (ownershipVerified ? 'not_verified' : '')
        };

        const updated = await updateShopAndLog({
            req,
            shop,
            update: { customDomain },
            action: 'domain.status_changed',
            message: status === 'Verified' && manuallyVerifiedRouting
                ? `Domain manually verified for ${existingDomain}`
                : `Domain status changed to ${status}`,
            reason: reason || (status === 'Verified' ? adminNote : ''),
            metadata: {
                customDomain: serializeDomainSummary(customDomain),
                manualRoutingVerification: manuallyVerifiedRouting
            },
            severity: status === 'Failed' ? 'warning' : 'info'
        });

        res.status(200).json({
            success: true,
            data: {
                ...serializeSuperAdminShopDetail(updated),
                customDomain: serializeDomainSummary(updated.customDomain)
            }
        });
    } catch (err) {
        console.error('Update domain error:', err);
        const duplicateDomain = err?.code === 11000 && String(err?.message || '').includes('customDomain');
        res.status(err.statusCode || 400).json({
            success: false,
            error: duplicateDomain ? 'This domain is already connected to another shop.' : err.message || 'Failed to update domain'
        });
    }
};

exports.getFailedPayments = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const query = { 'payment.status': 'Failed' };
        addDateRange(query, req.query);

        if (req.query.search) {
            const regex = safeSearchRegex(req.query.search);
            if (regex) {
                const customers = await User.find({ email: regex }).select('_id').lean();
                query.$or = [
                    { orderNumber: regex },
                    { orderId: regex },
                    ...(customers.length ? [{ customer: { $in: customers.map(customer => customer._id) } }] : [])
                ];
            }
        }

        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate('shop_id', 'shopName subdomain')
                .populate('customer', 'fullName email')
                .sort(getSort(req.query, ['createdAt', 'updatedAt']))
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: orders.map(order => ({
                id: order._id,
                orderNumber: order.orderNumber || order.orderId || '',
                shop: order.shop_id ? {
                    id: order.shop_id._id,
                    shopName: order.shop_id.shopName || '',
                    subdomain: order.shop_id.subdomain || ''
                } : null,
                customerAvailable: Boolean(order.customer),
                status: order.status || '',
                payment: {
                    status: order.payment?.status || '',
                    method: order.payment?.method || ''
                },
                total: Number(order.pricing?.total) || 0,
                currency: order.pricing?.currency || 'BDT',
                createdAt: order.createdAt || null,
                updatedAt: order.updatedAt || null
            })),
            pagination: paginationPayload({ page, limit, total })
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch failed payments' });
    }
};

exports.getAnnouncements = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const query = {};
        if (req.query.status === 'published') query.isPublished = true;
        if (req.query.status === 'unpublished') query.isPublished = false;
        if (req.query.status === 'archived') query.archivedAt = { $ne: null };
        if (req.query.status !== 'archived') query.archivedAt = null;
        if (req.query.severity && req.query.severity !== 'all') query.severity = req.query.severity;
        if (req.query.audience && req.query.audience !== 'all') query.audience = req.query.audience;
        if (req.query.search) {
            const regex = safeSearchRegex(req.query.search);
            if (regex) {
                query.$or = [{ title: regex }, { message: regex }, { severity: regex }, { audience: regex }];
            }
        }
        addDateRange(query, req.query);

        const [announcements, total] = await Promise.all([
            PlatformAnnouncement.find(query)
                .sort(getSort(req.query, ['createdAt', 'updatedAt', 'publishedAt', 'expiresAt']))
                .skip(skip)
                .limit(limit),
            PlatformAnnouncement.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: announcements.map(serializeAnnouncementSummary),
            pagination: paginationPayload({ page, limit, total }),
            registry: {
                plans: PLAN_ORDER.map(key => ({
                    key,
                    name: PLAN_DEFINITIONS[key]?.name || key
                })),
                subscriptionStatuses: SUBSCRIPTION_STATUS_REGISTRY
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch announcements' });
    }
};

const normalizeAnnouncementPayload = (body = {}) => {
    const allowed = [
        'title',
        'message',
        'audience',
        'targetAudience',
        'targetPlan',
        'targetPlanId',
        'targetShopId',
        'targetPlans',
        'targetStatuses',
        'severity',
        'isActive',
        'isPublished',
        'publishedAt',
        'startAt',
        'expiresAt'
    ];
    const payload = Object.fromEntries(
        allowed
            .filter(key => Object.prototype.hasOwnProperty.call(body, key))
            .map(key => [key, body[key]])
    );

    payload.targetPlan = String(payload.targetPlan || '').trim();
    if (payload.targetPlan.toLowerCase() === 'trial') {
        payload.targetPlan = '';
        payload.targetStatuses = ['trialing'];
    } else if (payload.targetPlan) {
        payload.targetPlan = resolveCanonicalPlanKey(payload.targetPlan);
    }
    payload.targetPlans = Array.isArray(payload.targetPlans)
        ? [...new Set(payload.targetPlans.map(resolveCanonicalPlanKey))]
        : [];
    const allowedStatuses = new Set(SUBSCRIPTION_STATUS_REGISTRY);
    payload.targetStatuses = Array.isArray(payload.targetStatuses)
        ? [...new Set(payload.targetStatuses.map(value => String(value || '').trim().toLowerCase()))]
        : [];
    const invalidStatuses = payload.targetStatuses.filter(status => !allowedStatuses.has(status));
    if (invalidStatuses.length) {
        const error = new Error(`Unsupported subscription statuses: ${invalidStatuses.join(', ')}`);
        error.code = 'INVALID_ANNOUNCEMENT_STATUS';
        error.statusCode = 400;
        throw error;
    }
    payload.targetPlanId = payload.targetPlanId ? asObjectId(payload.targetPlanId) : null;
    payload.targetShopId = payload.targetShopId ? asObjectId(payload.targetShopId) : null;

    const parseDateField = (value, boundary) => {
        if (!value) return null;

        const raw = String(value).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return new Date(`${raw}T${boundary === 'end' ? '23:59:59.999' : '00:00:00.000'}`);
        }

        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    if ('startAt' in payload) payload.startAt = parseDateField(payload.startAt, 'start');
    if ('expiresAt' in payload) payload.expiresAt = parseDateField(payload.expiresAt, 'end');

    if (!['all_vendors', 'all_shops', 'plan', 'shop'].includes(payload.targetAudience)) {
        if (payload.targetShopId) {
            payload.targetAudience = 'shop';
        } else if (
            payload.targetPlan ||
            payload.targetPlanId ||
            payload.targetPlans.length ||
            payload.targetStatuses.length
        ) {
            payload.targetAudience = 'plan';
        } else {
            payload.targetAudience = 'all_vendors';
        }
    }

    return payload;
};

exports.createAnnouncement = async (req, res) => {
    try {
        const payload = {
            ...normalizeAnnouncementPayload(req.body),
            isPublished: req.body.isPublished !== false,
            isActive: req.body.isPublished !== false,
            publishedAt: req.body.isPublished === false ? null : (req.body.publishedAt || new Date())
        };
        const announcement = await runCriticalGovernanceAction({
            mutate: async (session) => {
                const [created] = await PlatformAnnouncement.create([payload], { session });
                return created;
            },
            audit: created => ({
                req,
                action: 'announcement.created',
                entityType: 'PlatformAnnouncement',
                entityId: created._id,
                entityLabel: created.title,
                message: `Announcement created: ${created.title}`,
                metadata: {
                    status: created.isPublished ? 'published' : 'draft'
                }
            })
        });
        res.status(201).json({ success: true, data: serializeAnnouncementSummary(announcement) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to create announcement' });
    }
};

exports.updateAnnouncement = async (req, res) => {
    try {
        const payload = normalizeAnnouncementPayload(req.body);
        const announcement = await runCriticalGovernanceAction({
            mutate: async (session) => {
                const filter = { _id: req.params.id };
                if (Number.isFinite(Number(req.body.expectedVersion))) {
                    filter.__v = Number(req.body.expectedVersion);
                }
                const updated = await PlatformAnnouncement.findOneAndUpdate(
                    filter,
                    { $set: payload, $inc: { __v: 1 } },
                    { new: true, runValidators: true, session }
                );
                if (!updated) {
                    const conflict = new Error('Announcement changed or was not found. Reload and try again.');
                    conflict.statusCode = 409;
                    conflict.code = 'ANNOUNCEMENT_UPDATE_CONFLICT';
                    throw conflict;
                }
                return updated;
            },
            audit: updated => ({
                req,
                action: 'announcement.updated',
                entityType: 'PlatformAnnouncement',
                entityId: updated._id,
                entityLabel: updated.title,
                message: `Announcement updated: ${updated.title}`,
                metadata: { changedFields: Object.keys(payload) }
            })
        });
        res.status(200).json({ success: true, data: serializeAnnouncementSummary(announcement) });
    } catch (err) {
        res.status(err.statusCode || 400).json({
            success: false,
            code: err.code || 'ANNOUNCEMENT_UPDATE_FAILED',
            error: err.message || 'Failed to update announcement'
        });
    }
};

exports.publishAnnouncement = async (req, res) => {
    try {
        const announcement = await runCriticalGovernanceAction({
            mutate: async (session) => {
                const updated = await PlatformAnnouncement.findByIdAndUpdate(
                    req.params.id,
                    { isPublished: true, isActive: true, publishedAt: new Date(), archivedAt: null },
                    { new: true, runValidators: true, session }
                );
                if (!updated) {
                    const notFound = new Error('Announcement not found');
                    notFound.statusCode = 404;
                    throw notFound;
                }
                return updated;
            },
            audit: updated => ({
                req,
                action: 'announcement.published',
                entityType: 'PlatformAnnouncement',
                entityId: updated._id,
                entityLabel: updated.title,
                message: `Announcement published: ${updated.title}`
            })
        });
        res.status(200).json({ success: true, data: serializeAnnouncementSummary(announcement) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to publish announcement' });
    }
};

exports.unpublishAnnouncement = async (req, res) => {
    try {
        const announcement = await runCriticalGovernanceAction({
            mutate: async (session) => {
                const updated = await PlatformAnnouncement.findByIdAndUpdate(
                    req.params.id,
                    { isPublished: false, isActive: false },
                    { new: true, runValidators: true, session }
                );
                if (!updated) {
                    const notFound = new Error('Announcement not found');
                    notFound.statusCode = 404;
                    throw notFound;
                }
                return updated;
            },
            audit: updated => ({
                req,
                action: 'announcement.unpublished',
                entityType: 'PlatformAnnouncement',
                entityId: updated._id,
                entityLabel: updated.title,
                message: `Announcement unpublished: ${updated.title}`
            })
        });
        res.status(200).json({ success: true, data: serializeAnnouncementSummary(announcement) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to unpublish announcement' });
    }
};

exports.archiveAnnouncement = async (req, res) => {
    try {
        const announcement = await runCriticalGovernanceAction({
            mutate: async (session) => {
                const updated = await PlatformAnnouncement.findByIdAndUpdate(
                    req.params.id,
                    { isPublished: false, isActive: false, archivedAt: new Date() },
                    { new: true, runValidators: true, session }
                );
                if (!updated) {
                    const notFound = new Error('Announcement not found');
                    notFound.statusCode = 404;
                    throw notFound;
                }
                return updated;
            },
            audit: updated => ({
                req,
                action: 'announcement.archived',
                entityType: 'PlatformAnnouncement',
                entityId: updated._id,
                entityLabel: updated.title,
                message: `Announcement archived: ${updated.title}`,
                severity: 'warning'
            })
        });
        res.status(200).json({ success: true, data: serializeAnnouncementSummary(announcement) });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to archive announcement' });
    }
};

exports.getAbuseReports = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const query = {};
        if (req.query.status && req.query.status !== 'all') query.status = req.query.status;
        addDateRange(query, req.query);
        if (req.query.search) {
            const regex = safeSearchRegex(req.query.search);
            if (regex) {
                const shops = await Shop.find({ $or: [{ shopName: regex }, { subdomain: regex }] }).select('_id').lean();
                query.$or = [
                    { reporterEmail: regex },
                    { reason: regex },
                    { details: regex },
                    { status: regex },
                    ...(shops.length ? [{ shop_id: { $in: shops.map(shop => shop._id) } }] : [])
                ];
            }
        }

        const [reports, total] = await Promise.all([
            AbuseReport.find(query)
                .populate('shop_id', 'shopName subdomain approvalStatus isActive suspensionReason')
                .sort(getSort(req.query, ['createdAt', 'updatedAt', 'status']))
                .skip(skip)
                .limit(limit)
                .lean(),
            AbuseReport.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: reports.map(report => serializeAbuseReportSummary(report)),
            pagination: paginationPayload({ page, limit, total })
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch abuse reports' });
    }
};

exports.getAbuseReportById = async (req, res) => {
    try {
        const report = await AbuseReport.findById(req.params.id)
            .populate('shop_id', 'shopName subdomain approvalStatus isActive suspensionReason')
            .lean();
        if (!report) return res.status(404).json({ success: false, error: 'Abuse report not found' });
        res.status(200).json({ success: true, data: serializeAbuseReportSummary(report) });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch abuse report' });
    }
};

exports.updateAbuseReportStatus = async (req, res) => {
    try {
        const status = req.body.status;
        if (!['Open', 'Reviewing', 'Resolved', 'Dismissed'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid abuse report status' });
        }
        const reason = getReason(req.body);
        if (['Resolved', 'Dismissed'].includes(status) && requireReason(res, reason, 'Reason is required for this abuse action')) return;

        const report = await runCriticalGovernanceAction({
            mutate: async (session) => {
                const filter = { _id: req.params.id };
                if (Number.isFinite(Number(req.body.expectedVersion))) {
                    filter.__v = Number(req.body.expectedVersion);
                }
                const updated = await AbuseReport.findOneAndUpdate(
                    filter,
                    {
                        $set: {
                            status,
                            internalNote: String(req.body.internalNote || req.body.reason || '').trim(),
                            resolutionReason: ['Resolved', 'Dismissed'].includes(status) ? reason : ''
                        },
                        $inc: { __v: 1 }
                    },
                    { new: true, runValidators: true, session }
                ).populate('shop_id', 'shopName subdomain');
                if (!updated) {
                    const conflict = new Error('Abuse report changed or was not found. Reload and try again.');
                    conflict.statusCode = 409;
                    conflict.code = 'ABUSE_REPORT_CONFLICT';
                    throw conflict;
                }
                return updated;
            },
            audit: updated => ({
                req,
                action: 'abuse_report.status_changed',
                entityType: 'AbuseReport',
                entityId: updated._id,
                entityLabel: updated.reason,
                shop_id: updated.shop_id?._id || updated.shop_id,
                message: `Abuse report marked ${status}`,
                reason,
                metadata: { status },
                severity: ['Resolved', 'Dismissed'].includes(status) ? 'warning' : 'info'
            })
        });
        res.status(200).json({ success: true, data: serializeAbuseReportSummary(report) });
    } catch (err) {
        res.status(err.statusCode || 400).json({
            success: false,
            code: err.code || 'ABUSE_REPORT_UPDATE_FAILED',
            error: err.message || 'Failed to update abuse report'
        });
    }
};

exports.updateAbuseReport = exports.updateAbuseReportStatus;

exports.getPlatformAuditLogs = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const query = {};
        if (req.query.action && req.query.action !== 'all') query.action = req.query.action;
        if (req.query.entityType && req.query.entityType !== 'all') query.entityType = req.query.entityType;
        if (req.query.severity && req.query.severity !== 'all') query.severity = req.query.severity;
        const shopId = asObjectId(req.query.shopId);
        if (shopId) query.shop_id = shopId;
        addDateRange(query, req.query);
        if (req.query.search) {
            const regex = safeSearchRegex(req.query.search);
            if (regex) {
                query.$or = [
                    { actorName: regex },
                    { actorEmail: regex },
                    { action: regex },
                    { entityType: regex },
                    { entityLabel: regex },
                    { message: regex },
                    { reason: regex }
                ];
            }
        }

        const [logs, total] = await Promise.all([
            PlatformAuditLog.find(query)
                .populate('shop_id', 'shopName subdomain')
                .sort(getSort(req.query, ['createdAt', 'severity', 'action', 'entityType']))
                .skip(skip)
                .limit(limit)
                .lean(),
            PlatformAuditLog.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: logs.map(serializePlatformAuditEvent),
            pagination: paginationPayload({ page, limit, total })
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch platform audit logs' });
    }
};
