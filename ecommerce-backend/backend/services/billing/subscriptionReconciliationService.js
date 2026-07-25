const Product = require('../../models/Product');
const ScheduledSale = require('../../models/ScheduledSale');
const Promotion = require('../../models/Promotion');
const Banner = require('../../models/Banner');
const Shop = require('../../models/Shop');
const User = require('../../models/User');
const ShopMembership = require('../../models/ShopMembership');
const CustomerEmailCampaign = require('../../models/CustomerEmailCampaign');
const cache = require('../cacheService');
const { cancelJobs } = require('../jobQueueService');
const { normalizeSourceIdentity } = require('../products/productMediaService');
const { getPlanBySlugOrNameOrDefault } = require('./billingPlanService');
const { getPlanFeatureValue } = require('../../config/subscriptionFeatures');

const statusRank = (product = {}) => {
    const status = product.planArchive?.active
        ? product.planArchive.previousStatus
        : product.status;
    if (status === 'Published') return 0;
    if (status === 'Draft') return 1;
    return 2;
};

const compareProductsForRetention = (left, right) => (
    statusRank(left) - statusRank(right) ||
    new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime() ||
    String(left._id).localeCompare(String(right._id))
);

const getUniqueMediaSources = (product = {}) => {
    const values = [
        product.coverMediaId,
        ...(product.images || []),
        ...(product.variants || []).map(variant => variant.image)
    ];
    const seen = new Set();
    return values.reduce((sources, value) => {
        const raw = String(value || '').trim();
        const identity = normalizeSourceIdentity(raw);
        if (!raw || !identity || seen.has(identity)) return sources;
        seen.add(identity);
        sources.push(raw);
        return sources;
    }, []);
};

const buildRetentionSelection = ({ products = [], limit = null, retainedProductIds = [] }) => {
    const candidates = products.filter(product => (
        product.planArchive?.active || product.status !== 'Archived'
    ));
    const requested = new Set((retainedProductIds || []).map(String));
    const explicitlyRetained = candidates
        .filter(product => requested.has(String(product._id)))
        .sort(compareProductsForRetention);
    const remaining = candidates
        .filter(product => !requested.has(String(product._id)))
        .sort(compareProductsForRetention);
    const ordered = [...explicitlyRetained, ...remaining];
    const keep = limit === null
        ? ordered
        : ordered.slice(0, Math.max(0, Number(limit) || 0));

    return {
        keepIds: new Set(keep.map(product => String(product._id))),
        orderedIds: ordered.map(product => product._id),
        selectedIds: keep.map(product => product._id)
    };
};

const reconcileProducts = async ({
    shopId,
    plan,
    retainedProductIds = [],
    operationId = ''
}) => {
    const products = await Product.find({
        shop_id: shopId,
        isDeleted: { $ne: true }
    }).select(
        '_id status isActive updatedAt images coverMediaId variants.image ' +
        'planArchive entitlementMedia publicationStatus publishAt planPausedPublication'
    ).lean();
    const productLimit = plan.limits?.productCount ?? plan.productLimit ?? null;
    const imageLimit = plan.limits?.imagesPerProduct ?? null;
    const selection = buildRetentionSelection({
        products,
        limit: productLimit,
        retainedProductIds
    });
    const now = new Date();
    const operations = [];
    let archived = 0;
    let restored = 0;
    let mediaRestricted = 0;

    for (const product of products) {
        const productId = String(product._id);
        const shouldKeep = selection.keepIds.has(productId);
        const update = {};

        if (!shouldKeep && product.status !== 'Archived' && !product.planArchive?.active) {
            update.status = 'Archived';
            update.isActive = false;
            update['planArchive.active'] = true;
            update['planArchive.planKey'] = plan.slug;
            update['planArchive.archivedAt'] = now;
            update['planArchive.previousStatus'] = product.status || 'Draft';
            update['planArchive.previousIsActive'] = product.isActive !== false;
            update['planArchive.reconciliationId'] = operationId;
            archived += 1;
        } else if (shouldKeep && product.planArchive?.active) {
            update.status = product.planArchive.previousStatus || 'Draft';
            update.isActive = product.planArchive.previousIsActive !== false;
            update['planArchive.active'] = false;
            update['planArchive.planKey'] = '';
            update['planArchive.archivedAt'] = null;
            update['planArchive.previousStatus'] = '';
            update['planArchive.previousIsActive'] = true;
            update['planArchive.reconciliationId'] = '';
            restored += 1;
        }

        const sources = getUniqueMediaSources(product);
        const visibleSources = imageLimit === null
            ? sources
            : sources.slice(0, Math.max(0, Number(imageLimit) || 0));
        const restricted = imageLimit !== null && sources.length > Number(imageLimit);
        update['entitlementMedia.restricted'] = restricted;
        update['entitlementMedia.visibleSources'] = visibleSources;
        update['entitlementMedia.restrictedAt'] = restricted ? now : null;
        update['entitlementMedia.planKey'] = restricted ? plan.slug : '';
        if (restricted) mediaRestricted += 1;

        operations.push({
            updateOne: {
                filter: { _id: product._id, shop_id: shopId },
                update: { $set: update }
            }
        });
    }

    if (operations.length) await Product.bulkWrite(operations, { ordered: false });

    return {
        archived,
        restored,
        mediaRestricted,
        retainedProductIds: selection.selectedIds
    };
};

const pauseScheduledProducts = async ({ shopId, planKey }) => {
    const scheduled = await Product.find({
        shop_id: shopId,
        isDeleted: { $ne: true },
        publicationStatus: 'scheduled'
    }).select('_id publishAt').lean();
    if (!scheduled.length) return 0;

    const now = new Date();
    await Product.bulkWrite(scheduled.map(product => ({
        updateOne: {
            filter: { _id: product._id, shop_id: shopId, publicationStatus: 'scheduled' },
            update: {
                $set: {
                    publicationStatus: 'draft',
                    status: 'Draft',
                    publishAt: null,
                    schedulePlanBlockedAt: now,
                    schedulePlanBlockedReason: 'Scheduled publishing is not available on the current plan.',
                    'planPausedPublication.active': true,
                    'planPausedPublication.publishAt': product.publishAt || null,
                    'planPausedPublication.pausedAt': now,
                    'planPausedPublication.planKey': planKey
                }
            }
        }
    })), { ordered: false });
    return scheduled.length;
};

const suspendStaffForPlan = async ({ shopId, planKey }) => {
    const staff = await User.find({
        shop_id: shopId,
        role: 'VendorStaff',
        status: 'Active'
    }).select('_id membership_id').lean();
    if (!staff.length) return 0;

    const now = new Date();
    const userIds = staff.map(user => user._id);
    const membershipIds = staff.map(user => user.membership_id).filter(Boolean);
    await Promise.all([
        User.updateMany(
            { _id: { $in: userIds }, shop_id: shopId, role: 'VendorStaff' },
            {
                $set: {
                    status: 'Suspended',
                    planSuspendedAt: now,
                    planSuspendedFor: planKey
                },
                $inc: { sessionVersion: 1 }
            }
        ),
        ShopMembership.updateMany(
            {
                shop_id: shopId,
                role: 'VendorStaff',
                ...(membershipIds.length ? { _id: { $in: membershipIds } } : {})
            },
            {
                $set: {
                    status: 'Suspended',
                    planSuspendedAt: now,
                    planSuspendedFor: planKey
                }
            }
        )
    ]);
    return staff.length;
};

const cancelPlanBlockedJobs = async ({ shopId, plan }) => {
    const queueFilters = [];
    if (!getPlanFeatureValue(plan, 'lowStockAlerts')) queueFilters.push('inventory-alerts');
    if (!getPlanFeatureValue(plan, 'emailCampaigns')) queueFilters.push('customer-email');
    if (!getPlanFeatureValue(plan, 'trustSystem')) queueFilters.push('badges');
    if (!getPlanFeatureValue(plan, 'scheduledProductPublishing')) queueFilters.push('scheduled-products');
    if (!queueFilters.length) return 0;

    const result = await cancelJobs(
        { shop_id: shopId, queue: { $in: queueFilters } },
        `Cancelled because the ${plan.name} plan does not include the required capability.`
    );
    return result.modifiedCount || 0;
};

const resetUnsentLowStockLatches = async (shopId) => {
    const result = await Product.updateMany(
        { shop_id: shopId, isDeleted: { $ne: true } },
        {
            $set: {
                'variants.$[variant].inventory.lowStockAlertActive': false,
                'variants.$[variant].inventory.lowStockAlertStatus': 'not_triggered',
                'variants.$[variant].inventory.lowStockAlertSentAt': null
            }
        },
        {
            arrayFilters: [{
                'variant.inventory.lowStockAlertStatus': { $in: ['queued', 'failed'] }
            }]
        }
    );
    return result.modifiedCount || 0;
};

const reconcileShopPlan = async ({
    shopId,
    planKey,
    plan: suppliedPlan = null,
    retainedProductIds = [],
    operationId = ''
}) => {
    const plan = suppliedPlan || await getPlanBySlugOrNameOrDefault(planKey);
    const now = new Date();
    const summary = {
        plan: plan.slug,
        productsArchived: 0,
        productsRestored: 0,
        productsWithRestrictedMedia: 0,
        scheduledProductsBlocked: 0,
        scheduledSalesBlocked: 0,
        activeSalesEnded: 0,
        promotionsDisabled: 0,
        promotionsRestored: 0,
        bannersDisabled: 0,
        bannersRestored: 0,
        staffSuspended: 0,
        jobsCancelled: 0,
        lowStockLatchesReset: 0,
        customDomainInactive: false,
        trustBadgeInactive: false,
        retainedProductIds: []
    };

    const productResult = await reconcileProducts({
        shopId,
        plan,
        retainedProductIds,
        operationId
    });
    summary.productsArchived = productResult.archived;
    summary.productsRestored = productResult.restored;
    summary.productsWithRestrictedMedia = productResult.mediaRestricted;
    summary.retainedProductIds = productResult.retainedProductIds;

    const scheduledProductPublishing = getPlanFeatureValue(plan, 'scheduledProductPublishing');
    const scheduledSales = getPlanFeatureValue(plan, 'scheduledSales');
    const coupons = getPlanFeatureValue(plan, 'coupons');
    const scheduledBanners = getPlanFeatureValue(plan, 'scheduledBanners');
    const customDomain = getPlanFeatureValue(plan, 'customDomain');
    const trustSystem = getPlanFeatureValue(plan, 'trustSystem');
    const lowStockAlerts = getPlanFeatureValue(plan, 'lowStockAlerts');
    const emailCampaigns = getPlanFeatureValue(plan, 'emailCampaigns');
    const staffLimit = plan.limits?.staffAccounts ?? plan.staffLimit ?? null;

    if (!scheduledProductPublishing) {
        summary.scheduledProductsBlocked = await pauseScheduledProducts({
            shopId,
            planKey: plan.slug
        });
    }

    if (!scheduledSales) {
        const [pending, active] = await Promise.all([
            ScheduledSale.updateMany(
                { shop_id: shopId, status: 'scheduled' },
                { $set: { status: 'plan_blocked', processingState: 'completed', processingCompletedAt: now } }
            ),
            ScheduledSale.updateMany(
                { shop_id: shopId, status: 'active' },
                { $set: { status: 'ended', endsAt: now, processingState: 'completed', processingCompletedAt: now } }
            )
        ]);
        summary.scheduledSalesBlocked = pending.modifiedCount || 0;
        summary.activeSalesEnded = active.modifiedCount || 0;
    }

    if (!coupons) {
        const result = await Promotion.updateMany(
            { shop_id: shopId, isActive: true },
            {
                $set: {
                    isActive: false,
                    planInactiveAt: now,
                    planInactiveFor: plan.slug,
                    planPreviousActive: true
                }
            }
        );
        summary.promotionsDisabled = result.modifiedCount || 0;
    } else {
        const result = await Promotion.updateMany(
            {
                shop_id: shopId,
                planPreviousActive: true,
                $or: [
                    { expiresAt: null },
                    { expiresAt: { $gt: now } }
                ]
            },
            {
                $set: {
                    isActive: true,
                    planInactiveAt: null,
                    planInactiveFor: '',
                    planPreviousActive: false
                }
            }
        );
        summary.promotionsRestored = result.modifiedCount || 0;
    }

    if (!scheduledBanners) {
        const result = await Banner.updateMany(
            { shop_id: shopId, isActive: true },
            {
                $set: {
                    isActive: false,
                    planInactiveAt: now,
                    planInactiveFor: plan.slug,
                    planPreviousActive: true
                }
            }
        );
        summary.bannersDisabled = result.modifiedCount || 0;
    } else {
        const result = await Banner.updateMany(
            {
                shop_id: shopId,
                planPreviousActive: true,
                $or: [
                    { endsAt: null },
                    { endsAt: { $gt: now } }
                ]
            },
            {
                $set: {
                    isActive: true,
                    planInactiveAt: null,
                    planInactiveFor: '',
                    planPreviousActive: false
                }
            }
        );
        summary.bannersRestored = result.modifiedCount || 0;
    }

    if (Number(staffLimit) === 0) {
        summary.staffSuspended = await suspendStaffForPlan({
            shopId,
            planKey: plan.slug
        });
    }

    summary.jobsCancelled = await cancelPlanBlockedJobs({ shopId, plan });
    if (!lowStockAlerts) {
        summary.lowStockLatchesReset = await resetUnsentLowStockLatches(shopId);
    }
    if (!emailCampaigns) {
        await CustomerEmailCampaign.updateMany(
            { shopId, status: { $in: ['queued', 'sending', 'failed'] } },
            {
                $set: {
                    status: 'cancelled',
                    lastError: `Campaign cancelled because ${plan.name} does not include customer email campaigns.`
                }
            }
        );
    }

    const shopUpdate = {
        'customDomain.planInactive': !customDomain,
        'customDomain.planInactiveAt': !customDomain ? now : null,
        badgePlanInactive: !trustSystem,
        badgePlanInactiveAt: !trustSystem ? now : null
    };
    const shop = await Shop.findByIdAndUpdate(shopId, { $set: shopUpdate }, { new: true })
        .select('subdomain customDomain.domain badgeStatus')
        .lean();
    summary.customDomainInactive = Boolean(shop?.customDomain?.domain && !customDomain);
    summary.trustBadgeInactive = Boolean(shop?.badgeStatus === 'active' && !trustSystem);

    await Promise.all([
        cache.delPattern(`storefront:*:${shopId}:*`),
        cache.delPattern(`admin:dashboard-overview:${shopId}:*`),
        cache.del(`storefront:settings:${shopId}`),
        cache.del(`subscription:usage:${shopId}`),
        shop?.subdomain ? cache.del(`tenant:${shop.subdomain}`) : null,
        shop?.customDomain?.domain ? cache.del(`tenant:${shop.customDomain.domain}`) : null
    ]);

    return summary;
};

module.exports = {
    compareProductsForRetention,
    getUniqueMediaSources,
    buildRetentionSelection,
    reconcileProducts,
    reconcileShopPlan
};
