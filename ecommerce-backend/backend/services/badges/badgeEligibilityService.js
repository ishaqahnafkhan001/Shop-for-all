const Shop = require('../../models/Shop');
const Subscription = require('../../models/Subscription');
const Order = require('../../models/Order');
const Review = require('../../models/Review');
const AbuseReport = require('../../models/AbuseReport');
const ReturnRequest = require('../../models/ReturnRequest');
const VendorPlan = require('../../models/VendorPlan');
const { isBillingSuspension } = require('../billing/subscriptionService');
const { isVerificationSuspension } = require('../vendorVerificationService');

const BADGE_THRESHOLDS = {
    minShopAgeDays: 60,
    minCompletedSales: 100,
    minAverageRating: 4.0,
    minReviewCount: 20,
    maxUnresolvedAbuseReports: 0,
    maxRefundRate: 0.15,
    analysisApproveScore: 85,
    analysisReviewScore: 70
};

const REQUIRED_PLAN_NAMES = new Set(['Growth', 'Pro']);

const daysBetween = (from, to = new Date()) => {
    if (!from) return 0;
    return Math.floor((to.getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000));
};

const collectLinks = (theme = {}) => {
    const links = [];
    const pushLink = (item) => {
        if (!item) return;
        if (item.url) links.push(String(item.url));
        if (Array.isArray(item.children)) item.children.forEach(pushLink);
    };

    (theme.navigation || []).forEach(pushLink);
    (theme.footer?.links || []).forEach(pushLink);
    return links;
};

const hasFacebookLink = (shop) => {
    return collectLinks(shop?.theme || {}).some(url => /(?:facebook\.com|fb\.com)\//i.test(url));
};

const getPlanName = async (shop, subscription) => {
    if (subscription?.planId) {
        const plan = await VendorPlan.findById(subscription.planId).select('name').lean();
        if (plan?.name) return plan.name;
    }
    return shop?.plan?.name || 'Starter';
};

const getReviewStats = async (shopId) => {
    const [stats] = await Review.aggregate([
        { $match: { shop_id: shopId } },
        {
            $group: {
                _id: '$shop_id',
                averageRating: { $avg: '$rating' },
                reviewCount: { $sum: 1 }
            }
        }
    ]);

    return {
        averageRating: stats ? Math.round(Number(stats.averageRating || 0) * 10) / 10 : 0,
        reviewCount: stats?.reviewCount || 0
    };
};

const getEligibilitySnapshot = async (shopId) => {
    const shop = await Shop.findById(shopId).select('createdAt plan theme verification approvalStatus isActive suspensionReason badgeStatus');
    if (!shop) throw new Error('Shop not found');

    const subscription = await Subscription.findOne({ shopId: shop._id }).sort({ createdAt: -1 });
    const plan = await getPlanName(shop, subscription);
    const [
        completedSales,
        unresolvedAbuseReports,
        reviewStats,
        returnCount
    ] = await Promise.all([
        Order.countDocuments({ shop_id: shop._id, status: 'Delivered', isDeleted: { $ne: true } }),
        AbuseReport.countDocuments({ shop_id: shop._id, status: { $in: ['Open', 'Reviewing'] } }),
        getReviewStats(shop._id),
        ReturnRequest.countDocuments({ shop_id: shop._id, isDeleted: { $ne: true }, status: { $in: ['Requested', 'Approved', 'Refunded'] } })
    ]);

    const refundRate = completedSales > 0 ? Math.round((returnCount / completedSales) * 1000) / 1000 : 0;

    return {
        shop,
        subscription,
        snapshot: {
            plan,
            subscriptionStatus: subscription?.status || 'missing',
            verificationStatus: shop.verification?.status || 'not_submitted',
            shopAgeDays: daysBetween(shop.createdAt),
            completedSales,
            facebookLinkPresent: hasFacebookLink(shop),
            averageRating: reviewStats.averageRating,
            reviewCount: reviewStats.reviewCount,
            unresolvedAbuseReports,
            refundRate
        }
    };
};

const buildRequirementChecklist = (shop, subscription, snapshot) => {
    const activePaidSubscription = subscription?.status === 'active';
    const planEligible = REQUIRED_PLAN_NAMES.has(snapshot.plan);
    const verificationApproved = snapshot.verificationStatus === 'approved';
    const activeShop = shop.isActive !== false &&
        shop.approvalStatus !== 'Suspended' &&
        !isVerificationSuspension(shop) &&
        !isBillingSuspension(shop);

    return [
        {
            key: 'activeSubscription',
            label: 'Active paid subscription',
            complete: activePaidSubscription,
            detail: `Current subscription status: ${snapshot.subscriptionStatus}`
        },
        {
            key: 'eligiblePlan',
            label: 'Growth or Pro plan',
            complete: planEligible,
            detail: `Current plan: ${snapshot.plan}`
        },
        {
            key: 'verificationApproved',
            label: 'NID verification approved',
            complete: verificationApproved,
            detail: `Verification status: ${snapshot.verificationStatus}`
        },
        {
            key: 'shopAge',
            label: `Shop age at least ${BADGE_THRESHOLDS.minShopAgeDays} days`,
            complete: snapshot.shopAgeDays >= BADGE_THRESHOLDS.minShopAgeDays,
            detail: `${snapshot.shopAgeDays} days old`
        },
        {
            key: 'completedSales',
            label: `At least ${BADGE_THRESHOLDS.minCompletedSales} delivered orders`,
            complete: snapshot.completedSales >= BADGE_THRESHOLDS.minCompletedSales,
            detail: `${snapshot.completedSales} delivered orders`
        },
        {
            key: 'facebookLink',
            label: 'Facebook page link added',
            complete: snapshot.facebookLinkPresent,
            detail: 'Add a facebook.com or fb.com link in Store Builder navigation/footer.'
        },
        {
            key: 'activeShop',
            label: 'No active manual suspension',
            complete: activeShop,
            detail: shop.suspensionReason || 'Shop is active'
        },
        {
            key: 'abuseReports',
            label: 'No unresolved abuse reports',
            complete: snapshot.unresolvedAbuseReports <= BADGE_THRESHOLDS.maxUnresolvedAbuseReports,
            detail: `${snapshot.unresolvedAbuseReports} unresolved reports`
        },
        {
            key: 'averageRating',
            label: `Average rating at least ${BADGE_THRESHOLDS.minAverageRating}`,
            complete: snapshot.averageRating >= BADGE_THRESHOLDS.minAverageRating,
            detail: `${snapshot.averageRating || 0} average rating`
        },
        {
            key: 'reviewCount',
            label: `At least ${BADGE_THRESHOLDS.minReviewCount} product reviews`,
            complete: snapshot.reviewCount >= BADGE_THRESHOLDS.minReviewCount,
            detail: `${snapshot.reviewCount} reviews`
        }
    ];
};

const getBadgeEligibility = async (shopId) => {
    const { shop, subscription, snapshot } = await getEligibilitySnapshot(shopId);
    const checklist = buildRequirementChecklist(shop, subscription, snapshot);
    const eligible = checklist.every(item => item.complete);

    return {
        shop,
        subscription,
        snapshot,
        checklist,
        eligible,
        missingRequirements: checklist.filter(item => !item.complete)
    };
};

module.exports = {
    BADGE_THRESHOLDS,
    getBadgeEligibility,
    getEligibilitySnapshot,
    buildRequirementChecklist,
    hasFacebookLink
};
