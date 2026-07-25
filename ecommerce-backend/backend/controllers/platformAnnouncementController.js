const PlatformAnnouncement = require('../models/PlatformAnnouncement');
const Shop = require('../models/Shop');
const Subscription = require('../models/Subscription');
const { resolveSubscriptionAccess } = require('../services/billing/subscriptionAccessResolver');
const { normalizePlanKey } = require('../config/subscriptionPlans');

const isSameId = (a, b) => String(a || '') === String(b || '');

const serializeVendorAnnouncement = (announcement) => ({
    _id: announcement._id,
    title: announcement.title,
    message: announcement.message,
    severity: announcement.severity,
    createdAt: announcement.createdAt,
    publishedAt: announcement.publishedAt,
    expiresAt: announcement.expiresAt
});

const getVendorAnnouncementContext = async (shopId) => {
    if (!shopId) {
        return {
            shop: null,
            isTrial: false,
            activePlanNames: new Set(),
            activePlanIds: new Set(),
            activePlanKeys: new Set(),
            subscriptionStatus: ''
        };
    }

    const [shop, subscription] = await Promise.all([
        Shop.findById(shopId).select('plan').lean(),
        Subscription.findOne({ shopId }).populate('planId', 'name').lean()
    ]);

    const activePlanNames = new Set();
    const activePlanIds = new Set();
    const activePlanKeys = new Set();
    let isTrial = false;
    let subscriptionStatus = '';

    if (subscription) {
        const access = resolveSubscriptionAccess({ subscription, shop });
        subscriptionStatus = access.subscriptionStatus || subscription.status || '';
        const planName = subscription.activePlanName || subscription.planId?.name || '';
        const planKey = subscription.activePlanSlug || planName;
        if (planName) activePlanNames.add(planName);
        if (planKey) activePlanKeys.add(normalizePlanKey(planKey));
        if (subscription.planId?._id) activePlanIds.add(String(subscription.planId._id));
        if (access.subscriptionStatus === 'trialing') {
            isTrial = true;
        }

        if (access.subscriptionStatus === 'active' && subscription.planId?.name) {
            activePlanNames.add(subscription.planId.name);
            activePlanIds.add(String(subscription.planId._id));
            activePlanKeys.add(normalizePlanKey(subscription.activePlanSlug || subscription.planId.name));
        }

        if (access.subscriptionStatus === 'trialing' && (subscription.activePlanName || subscription.planId?.name)) {
            activePlanNames.add(subscription.activePlanName || subscription.planId.name);
            activePlanKeys.add(normalizePlanKey(subscription.activePlanSlug || subscription.activePlanName || subscription.planId.name));
            if (subscription.planId?._id) {
                activePlanIds.add(String(subscription.planId._id));
            }
        }
    }

    if (shop?.plan?.status === 'Trialing') {
        isTrial = true;
    } else if (shop?.plan?.name) {
        activePlanNames.add(shop.plan.name);
        activePlanKeys.add(normalizePlanKey(shop.plan.activePlanSlug || shop.plan.name));
    }

    if (shop?.plan?.status === 'Active' && shop.plan.name) {
        activePlanNames.add(shop.plan.name);
        activePlanKeys.add(normalizePlanKey(shop.plan.activePlanSlug || shop.plan.name));
    }

    return {
        shop,
        isTrial,
        activePlanNames,
        activePlanIds,
        activePlanKeys,
        subscriptionStatus
    };
};

const matchesAnnouncementTarget = (announcement, { shopId, context }) => {
    if (announcement.targetShopId) {
        return isSameId(announcement.targetShopId, shopId);
    }

    const targetPlans = Array.isArray(announcement.targetPlans)
        ? announcement.targetPlans.filter(Boolean)
        : [];
    const targetStatuses = Array.isArray(announcement.targetStatuses)
        ? announcement.targetStatuses.filter(Boolean)
        : [];
    if (announcement.targetPlanId && !context.activePlanIds.has(String(announcement.targetPlanId))) {
        return false;
    }
    if (targetPlans.length && !targetPlans.some(plan => context.activePlanKeys.has(normalizePlanKey(plan)))) {
        return false;
    }
    if (targetStatuses.length && !targetStatuses.includes(context.subscriptionStatus)) {
        return false;
    }
    if (announcement.targetPlanId || targetPlans.length || targetStatuses.length) return true;

    const targetPlan = String(announcement.targetPlan || '').trim();
    if (targetPlan) {
        if (targetPlan.toLowerCase() === 'trial') return context.isTrial;
        return context.activePlanNames.has(targetPlan);
    }

    if (announcement.targetAudience === 'shop' || announcement.targetAudience === 'plan') {
        return false;
    }

    return true;
};

exports.getVendorAnnouncements = async (req, res) => {
    try {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const shopId = req.tenantId || req.user?.shopId || req.user?.shop_id;
        const context = await getVendorAnnouncementContext(shopId);

        const candidates = await PlatformAnnouncement.find({
            isPublished: true,
            archivedAt: null,
            $and: [
                {
                    $or: [
                        { isActive: true },
                        { isActive: { $exists: false } }
                    ]
                },
                {
                    $or: [
                        { startAt: null },
                        { startAt: { $exists: false } },
                        { startAt: { $lte: now } }
                    ]
                },
                {
                    $or: [
                        { expiresAt: null },
                        { expiresAt: { $exists: false } },
                        { expiresAt: { $gte: startOfToday } }
                    ]
                },
                {
                    $or: [
                        { audience: 'All' },
                        { audience: req.user?.role }
                    ]
                }
            ]
        })
            .sort({ severity: -1, publishedAt: -1, createdAt: -1 })
            .limit(30)
            .lean();

        const announcements = candidates
            .filter(announcement => matchesAnnouncementTarget(announcement, { shopId, context }))
            .slice(0, 5)
            .map(serializeVendorAnnouncement);

        res.status(200).json({
            success: true,
            data: announcements
        });
    } catch (err) {
        console.error('Get vendor announcements error:', err);
        res.status(500).json({ success: false, error: 'Failed to load announcements' });
    }
};
