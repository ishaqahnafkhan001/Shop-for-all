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
const cache = require('../services/cacheService');
const { invalidateTenantCache } = require('../middlewares/tenant');
const { logPlatformAudit } = require('../services/platformAuditLogService');
const { VERIFICATION_SUSPENSION_REASON, isVerificationSuspension } = require('../services/vendorVerificationService');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const CRITICAL_FEATURE_FLAGS = new Set(['storeBuilder', 'analytics', 'staffAccounts', 'growthCenter']);

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
    limit,
    total,
    pages: Math.ceil(total / limit) || 1
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

const getBillingDisplay = (subscription, latestPayment = null) => {
    if (!subscription) {
        return {
            status: 'trialing',
            planDisplay: 'Trial',
            pendingPlan: '',
            trialDaysLeft: null,
            paymentStatus: latestPayment?.status || ''
        };
    }

    if (subscription.status === 'trialing') {
        return {
            status: 'trialing',
            planDisplay: 'Trial',
            pendingPlan: '',
            trialDaysLeft: daysUntil(subscription.trialEndsAt),
            paymentStatus: latestPayment?.status || ''
        };
    }

    if (subscription.status === 'pending_approval') {
        return {
            status: 'pending_approval',
            planDisplay: `Pending ${subscription.pendingPlanName || 'plan'}`,
            pendingPlan: subscription.pendingPlanName || '',
            trialDaysLeft: daysUntil(subscription.trialEndsAt),
            paymentStatus: latestPayment?.status || 'pending'
        };
    }

    if (subscription.status === 'active') {
        return {
            status: 'active',
            planDisplay: subscription.planId?.name || 'Active plan',
            pendingPlan: '',
            trialDaysLeft: null,
            paymentStatus: latestPayment?.status || ''
        };
    }

    return {
        status: subscription.status,
        planDisplay: subscription.status === 'past_due' ? 'Trial expired' : 'Payment required',
        pendingPlan: subscription.pendingPlanName || '',
        trialDaysLeft: daysUntil(subscription.trialEndsAt),
        paymentStatus: latestPayment?.status || ''
    };
};

const serializeShop = (shop, ownerMap, subscriptionMap = new Map(), paymentMap = new Map()) => {
    const subscription = subscriptionMap.get(String(shop._id)) || null;
    const latestPayment = paymentMap.get(String(shop._id)) || null;
    return {
        ...shop,
        owner: ownerMap.get(String(shop._id)) || null,
        billing: getBillingDisplay(subscription, latestPayment),
        subscription
    };
};

const buildShopSearchIds = async (search) => {
    if (!search) return null;
    const regex = new RegExp(escapeRegex(String(search).trim()), 'i');
    const owners = await User.find({
        role: 'VendorAdmin',
        $or: [{ email: regex }, { fullName: regex }]
    }).select('shop_id').lean();
    return {
        regex,
        ownerShopIds: owners.map(owner => owner.shop_id).filter(Boolean)
    };
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
        Shop.countDocuments({ 'customDomain.domain': { $ne: '' }, 'customDomain.status': 'PendingVerification' })
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
        const [
            shopCount,
            activeShopCount,
            suspendedShopCount,
            customerCount,
            orderStats,
            failedPayments,
            alerts
        ] = await Promise.all([
            Shop.countDocuments(),
            Shop.countDocuments({ isActive: true, approvalStatus: 'Approved' }),
            Shop.countDocuments({ $or: [{ isActive: false }, { approvalStatus: 'Suspended' }] }),
            User.countDocuments({ role: 'Customer' }),
            Order.aggregate([
                {
                    $group: {
                        _id: null,
                        orders: { $sum: 1 },
                        revenue: { $sum: '$pricing.total' }
                    }
                }
            ]),
            Order.countDocuments({ 'payment.status': 'Failed' }),
            getPriorityAlerts()
        ]);

        res.status(200).json({
            success: true,
            data: {
                shops: shopCount,
                activeShops: activeShopCount,
                suspendedShops: suspendedShopCount,
                customers: customerCount,
                orders: orderStats[0]?.orders || 0,
                platformRevenue: orderStats[0]?.revenue || 0,
                failedPayments,
                alerts
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
                .populate('planId', 'name')
                .lean(),
            PaymentTransaction.find({ shopId: { $in: shopIds } })
                .sort({ createdAt: -1 })
                .lean()
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
            Shop.findById(shopId).lean(),
            User.findOne({ shop_id: shopId, role: 'VendorAdmin' }).select('fullName email status').lean(),
            VendorVerification.findOne({ shop_id: shopId }).sort({ updatedAt: -1 }).lean(),
            AbuseReport.find({ shop_id: shopId }).sort({ createdAt: -1 }).limit(10).lean(),
            PlatformAuditLog.find({ shop_id: shopId }).sort({ createdAt: -1 }).limit(10).lean(),
            Subscription.findOne({ shopId }).populate('planId', 'name monthlyPrice yearlyPrice').lean(),
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
                shop,
                owner,
                verification: verification ? {
                    ...verification,
                    daysLeft,
                    isExpired: deadline ? new Date(deadline).getTime() < Date.now() : false,
                    isVerificationSuspension: isVerificationSuspension(shop)
                } : {
                    status: shop.verification?.status || 'not_submitted',
                    verificationDeadline: deadline,
                    daysLeft,
                    isExpired: deadline ? new Date(deadline).getTime() < Date.now() : false,
                    isVerificationSuspension: isVerificationSuspension(shop)
                },
                domain: shop.customDomain || null,
                billing: {
                    ...getBillingDisplay(subscription, latestPayment),
                    subscription,
                    latestInvoice,
                    latestPayment
                },
                abuseReports,
                recentAuditLogs
            }
        });
    } catch (err) {
        console.error('Get shop detail error:', err);
        res.status(500).json({ success: false, error: 'Failed to load shop detail' });
    }
};

const updateShopAndLog = async ({ req, shop, update, action, message, reason = '', metadata = {}, severity = 'info' }) => {
    Object.entries(update).forEach(([key, value]) => shop.set(key, value));
    await shop.save();
    await invalidateShopCache(shop);
    await logPlatformAudit({
        req,
        action,
        entityType: 'Shop',
        entityId: shop._id,
        entityLabel: shop.shopName,
        shop_id: shop._id,
        message,
        reason,
        metadata,
        severity
    });
    return shop;
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

        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error('Update shop status error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update shop status' });
    }
};

exports.updateShopPlan = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.shopId);
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        const plan = { ...(shop.plan?.toObject ? shop.plan.toObject() : shop.plan || {}), ...(req.body.plan || req.body) };
        const updated = await updateShopAndLog({
            req,
            shop,
            update: { plan },
            action: 'shop.plan_changed',
            message: `Shop plan changed to ${plan.name || shop.plan?.name || 'unknown'}`,
            metadata: { before: shop.plan, after: plan }
        });

        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error('Update shop plan error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update shop plan' });
    }
};

exports.updateShopFeatureFlags = async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.shopId);
        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });

        const featureFlags = req.body.featureFlags || req.body;
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

        res.status(200).json({ success: true, data: updated });
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

        const reason = getReason(req.body);
        if (req.body.isActive === false && requireReason(res, reason, 'Suspension reason is required')) return;
        if (req.body.customDomain?.status === 'Failed' && requireReason(res, reason, 'Reason is required when marking a domain as failed')) return;

        const updatePayload = { ...req.body };
        if (updatePayload.isActive === false && !updatePayload.suspensionReason) {
            updatePayload.suspensionReason = reason;
        }

        const shop = await Shop.findByIdAndUpdate(
            req.params.id,
            { $set: updatePayload },
            { new: true, runValidators: true }
        );

        if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });
        await invalidateShopCache(shop);
        await logPlatformAudit({
            req,
            action: 'shop.governance_updated',
            entityType: 'Shop',
            entityId: shop._id,
            entityLabel: shop.shopName,
            shop_id: shop._id,
            message: 'Shop governance fields updated',
            reason,
            metadata: { updatedFields: Object.keys(updatePayload) },
            severity: updatePayload.isActive === false ? 'warning' : 'info'
        });

        res.status(200).json({ success: true, data: shop });
    } catch (err) {
        console.error('Update shop governance error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update shop' });
    }
};

exports.getPlans = async (req, res) => {
    try {
        const plans = await VendorPlan.find().sort({ monthlyPrice: 1 });
        res.status(200).json({ success: true, data: plans });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch plans' });
    }
};

exports.upsertPlan = async (req, res) => {
    try {
        const plan = await VendorPlan.findOneAndUpdate(
            { name: req.body.name },
            req.body,
            { upsert: true, new: true, runValidators: true }
        );

        await logPlatformAudit({
            req,
            action: 'plan.upserted',
            entityType: 'VendorPlan',
            entityId: plan._id,
            entityLabel: plan.name,
            message: `Vendor plan ${plan.name} saved`,
            metadata: { plan }
        });

        res.status(200).json({ success: true, data: plan });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to save plan' });
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
                .select('shopName subdomain customDomain')
                .sort(getSort(req.query, ['updatedAt', 'createdAt', 'shopName']))
                .skip(skip)
                .limit(limit)
                .lean(),
            Shop.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: shops,
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

        const allowedStatuses = ['NotConfigured', 'PendingVerification', 'Verified', 'Failed'];
        const status = req.body.status || shop.customDomain?.status || 'NotConfigured';
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid domain status' });
        }
        const reason = getReason(req.body);
        if (status === 'Failed' && requireReason(res, reason, 'Reason is required when marking a domain as failed')) return;

        const customDomain = {
            ...(shop.customDomain?.toObject ? shop.customDomain.toObject() : shop.customDomain || {}),
            status,
            adminNote: req.body.adminNote ?? shop.customDomain?.adminNote ?? '',
            lastCheckedAt: req.body.lastCheckedAt ? new Date(req.body.lastCheckedAt) : new Date(),
            verifiedAt: status === 'Verified' ? new Date() : shop.customDomain?.verifiedAt || null
        };

        const updated = await updateShopAndLog({
            req,
            shop,
            update: { customDomain },
            action: 'domain.status_changed',
            message: `Domain status changed to ${status}`,
            reason,
            metadata: { customDomain },
            severity: status === 'Failed' ? 'warning' : 'info'
        });

        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error('Update domain error:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to update domain' });
    }
};

exports.getFailedPayments = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const query = { 'payment.status': 'Failed' };
        addDateRange(query, req.query);

        if (req.query.search) {
            const regex = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
            const customers = await User.find({ email: regex }).select('_id').lean();
            query.$or = [
                { orderNumber: regex },
                { orderId: regex },
                ...(customers.length ? [{ customer: { $in: customers.map(customer => customer._id) } }] : [])
            ];
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
            data: orders,
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
            const regex = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
            query.$or = [{ title: regex }, { message: regex }, { severity: regex }, { audience: regex }];
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
            data: announcements,
            pagination: paginationPayload({ page, limit, total })
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch announcements' });
    }
};

const normalizeAnnouncementPayload = (body = {}) => {
    const payload = { ...body };

    payload.targetPlan = String(payload.targetPlan || '').trim();
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
        } else if (payload.targetPlan || payload.targetPlanId) {
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
        const announcement = await PlatformAnnouncement.create(payload);
        await logPlatformAudit({
            req,
            action: 'announcement.created',
            entityType: 'PlatformAnnouncement',
            entityId: announcement._id,
            entityLabel: announcement.title,
            message: `Announcement created: ${announcement.title}`,
            metadata: { announcement }
        });
        res.status(201).json({ success: true, data: announcement });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to create announcement' });
    }
};

exports.updateAnnouncement = async (req, res) => {
    try {
        const payload = normalizeAnnouncementPayload(req.body);
        const announcement = await PlatformAnnouncement.findByIdAndUpdate(
            req.params.id,
            payload,
            { new: true, runValidators: true }
        );

        if (!announcement) return res.status(404).json({ success: false, error: 'Announcement not found' });

        await logPlatformAudit({
            req,
            action: 'announcement.updated',
            entityType: 'PlatformAnnouncement',
            entityId: announcement._id,
            entityLabel: announcement.title,
            message: `Announcement updated: ${announcement.title}`,
            metadata: { update: payload }
        });

        res.status(200).json({ success: true, data: announcement });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to update announcement' });
    }
};

exports.publishAnnouncement = async (req, res) => {
    try {
        const announcement = await PlatformAnnouncement.findByIdAndUpdate(
            req.params.id,
            { isPublished: true, isActive: true, publishedAt: new Date(), archivedAt: null },
            { new: true, runValidators: true }
        );
        if (!announcement) return res.status(404).json({ success: false, error: 'Announcement not found' });
        await logPlatformAudit({
            req,
            action: 'announcement.published',
            entityType: 'PlatformAnnouncement',
            entityId: announcement._id,
            entityLabel: announcement.title,
            message: `Announcement published: ${announcement.title}`
        });
        res.status(200).json({ success: true, data: announcement });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to publish announcement' });
    }
};

exports.unpublishAnnouncement = async (req, res) => {
    try {
        const announcement = await PlatformAnnouncement.findByIdAndUpdate(
            req.params.id,
            { isPublished: false, isActive: false },
            { new: true, runValidators: true }
        );
        if (!announcement) return res.status(404).json({ success: false, error: 'Announcement not found' });
        await logPlatformAudit({
            req,
            action: 'announcement.unpublished',
            entityType: 'PlatformAnnouncement',
            entityId: announcement._id,
            entityLabel: announcement.title,
            message: `Announcement unpublished: ${announcement.title}`
        });
        res.status(200).json({ success: true, data: announcement });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to unpublish announcement' });
    }
};

exports.archiveAnnouncement = async (req, res) => {
    try {
        const announcement = await PlatformAnnouncement.findByIdAndUpdate(
            req.params.id,
            { isPublished: false, isActive: false, archivedAt: new Date() },
            { new: true, runValidators: true }
        );
        if (!announcement) return res.status(404).json({ success: false, error: 'Announcement not found' });
        await logPlatformAudit({
            req,
            action: 'announcement.archived',
            entityType: 'PlatformAnnouncement',
            entityId: announcement._id,
            entityLabel: announcement.title,
            message: `Announcement archived: ${announcement.title}`,
            severity: 'warning'
        });
        res.status(200).json({ success: true, data: announcement });
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
            const regex = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
            const shops = await Shop.find({ $or: [{ shopName: regex }, { subdomain: regex }] }).select('_id').lean();
            query.$or = [
                { reporterEmail: regex },
                { reason: regex },
                { details: regex },
                { status: regex },
                ...(shops.length ? [{ shop_id: { $in: shops.map(shop => shop._id) } }] : [])
            ];
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
            data: reports,
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
        res.status(200).json({ success: true, data: report });
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

        const report = await AbuseReport.findByIdAndUpdate(
            req.params.id,
            {
                status,
                internalNote: req.body.internalNote || req.body.reason || '',
                resolutionReason: ['Resolved', 'Dismissed'].includes(status) ? reason : ''
            },
            { new: true, runValidators: true }
        ).populate('shop_id', 'shopName subdomain');

        if (!report) return res.status(404).json({ success: false, error: 'Abuse report not found' });

        await logPlatformAudit({
            req,
            action: 'abuse_report.status_changed',
            entityType: 'AbuseReport',
            entityId: report._id,
            entityLabel: report.reason,
            shop_id: report.shop_id?._id || report.shop_id,
            message: `Abuse report marked ${status}`,
            reason,
            metadata: { status, internalNote: req.body.internalNote || '' },
            severity: ['Resolved', 'Dismissed'].includes(status) ? 'warning' : 'info'
        });

        res.status(200).json({ success: true, data: report });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message || 'Failed to update abuse report' });
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
            const regex = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
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
            data: logs,
            pagination: paginationPayload({ page, limit, total })
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch platform audit logs' });
    }
};
