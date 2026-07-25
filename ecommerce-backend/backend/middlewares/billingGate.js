const Product = require('../models/Product');
const User = require('../models/User');
const Shop = require('../models/Shop');
const { ensureSubscriptionExists, isBillingSuspension } = require('../services/billing/subscriptionService');
const { getPlanByIdOrNameOrDefault } = require('../services/billing/billingPlanService');
const { getStaffCapacity } = require('../services/staff/staffCapacityService');
const { getEffectivePlanRef } = require('../services/shops/featureAccessService');
const { getShopPlanAccess, buildLimitError } = require('../services/billing/planAccessService');
const { reserveQuota, releaseQuotaSafely } = require('../services/billing/planQuotaReservationService');
const { SUBSCRIPTION_EVENTS, emitSubscriptionEvent } = require('../services/billing/subscriptionEvents');

const OPERATIONAL_SUBSCRIPTION_STATUSES = new Set(['trialing', 'active', 'past_due', 'grace']);

const billingDenied = (res, message = 'Your subscription is not active.') => res.status(403).json({
    success: false,
    error: message,
    code: 'SUBSCRIPTION_INACTIVE'
});

const getShopId = (req) => req.tenantId || req.user?.shopId || req.user?.shop_id;

const emitQuotaReached = (req, context, resource, usage) => emitSubscriptionEvent(
    SUBSCRIPTION_EVENTS.QUOTA_REACHED,
    {
        req,
        shopId: getShopId(req),
        subscriptionId: context?.subscription?._id,
        planKey: context?.planKey,
        affectedResources: [resource],
        metadata: { resource, usage, notifyVendor: false }
    }
);

const emitUsageChangedAfterSuccess = (req, res, context, action, resource) => {
    let emitted = false;
    res.once('finish', () => {
        if (emitted || res.statusCode >= 400) return;
        emitted = true;
        emitSubscriptionEvent(SUBSCRIPTION_EVENTS.USAGE_CHANGED, {
            req,
            shopId: getShopId(req),
            subscriptionId: context?.subscription?._id,
            planKey: context?.planKey,
            affectedResources: [resource],
            metadata: { action, resource }
        }).catch(error => console.error('Usage event error:', error.message));
    });
};

const getEffectivePlan = async (shop, subscription) => {
    return getPlanByIdOrNameOrDefault(getEffectivePlanRef(shop, subscription));
};

const getBillingContext = async (req) => {
    const shopId = getShopId(req);
    if (!shopId) throw new Error('Shop context is required');

    const shop = await Shop.findById(shopId).select('plan approvalStatus isActive suspensionReason verification');
    if (!shop) throw new Error('Shop not found');

    const subscription = await ensureSubscriptionExists(shop);
    const plan = await getEffectivePlan(shop, subscription);
    return { shopId, shop, subscription, plan };
};

const blockBillingSuspendedShop = async (req, res, next) => {
    try {
        const { shop, subscription } = await getBillingContext(req);
        const blockedBySubscription = !OPERATIONAL_SUBSCRIPTION_STATUSES.has(subscription.status);
        const blockedByShop = isBillingSuspension(shop);

        if (blockedBySubscription || blockedByShop) {
            return billingDenied(res, 'Your store billing is not active. Please submit payment for verification.');
        }

        return next();
    } catch (err) {
        console.error('Billing gate error:', err);
        return res.status(500).json({ success: false, error: 'Unable to verify billing access' });
    }
};

const requireProductLimit = (getRequestedCount = () => 1) => async (req, res, next) => {
    try {
        const { shopId, subscription } = await getBillingContext(req);
        if (!OPERATIONAL_SUBSCRIPTION_STATUSES.has(subscription.status)) {
            return billingDenied(res, 'Your store billing is not active. Please submit payment for verification.');
        }

        const context = await getShopPlanAccess(shopId);
        req.planAccess = context;
        const limit = context.limits.productCount;
        const requestedCount = Math.max(1, Number(getRequestedCount(req)) || 1);
        if (limit === null) return next();

        let reservation;
        try {
            reservation = await reserveQuota({
                shopId,
                resource: 'products',
                requested: requestedCount,
                limit,
                getCommittedUsage: () => Product.countDocuments({
                    shop_id: shopId,
                    isDeleted: { $ne: true },
                    status: { $ne: 'Archived' }
                })
            });
        } catch (error) {
            if (error.code !== 'PLAN_LIMIT_REACHED') throw error;
            const payload = await buildLimitError(context, 'productCount', error.usage, limit);
            await emitQuotaReached(req, context, 'products', payload.usage);
            return res.status(403).json(payload);
        }

        req.planQuotaReservation = reservation;
        res.once('finish', () => releaseQuotaSafely(reservation));
        res.once('close', () => releaseQuotaSafely(reservation));
        emitUsageChangedAfterSuccess(req, res, context, 'product_created', 'products');

        return next();
    } catch (err) {
        console.error('Product limit gate error:', err);
        return res.status(500).json({ success: false, error: 'Unable to verify product limit' });
    }
};

const requireStaffLimit = async (req, res, next) => {
    try {
        if (req.body?.role && req.body.role !== 'VendorStaff') return next();

        const { subscription } = await getBillingContext(req);
        if (!OPERATIONAL_SUBSCRIPTION_STATUSES.has(subscription.status)) {
            return billingDenied(res, 'Your store billing is not active. Please submit payment for verification.');
        }

        const shopId = getShopId(req);
        const capacity = await getStaffCapacity(shopId);
        const context = await getShopPlanAccess(shopId);
        req.planAccess = req.planAccess || context;
        let reservation = null;
        if (capacity.canAddStaff) {
            try {
                reservation = await reserveQuota({
                    shopId,
                    resource: 'staff',
                    requested: 1,
                    limit: capacity.staffLimit,
                    getCommittedUsage: () => User.countDocuments({
                        shop_id: shopId,
                        role: 'VendorStaff',
                        status: 'Active'
                    })
                });
            } catch (error) {
                if (error.code !== 'PLAN_LIMIT_REACHED') throw error;
                capacity.canAddStaff = false;
                capacity.usedStaffCount = error.usage;
            }
        }
        if (!capacity.canAddStaff) {
            const payload = await buildLimitError(context, 'staffAccounts', capacity.usedStaffCount, capacity.staffLimit);
            payload.remainingStaffSlots = capacity.remainingStaffSlots;
            await emitQuotaReached(req, context, 'staff', payload.usage);
            return res.status(403).json(payload);
        }

        req.planQuotaReservation = reservation;
        res.once('finish', () => releaseQuotaSafely(reservation));
        res.once('close', () => releaseQuotaSafely(reservation));
        emitUsageChangedAfterSuccess(req, res, context, 'staff_added', 'staff');

        return next();
    } catch (err) {
        console.error('Staff limit gate error:', err);
        return res.status(500).json({ success: false, error: 'Unable to verify staff limit' });
    }
};

module.exports = {
    OPERATIONAL_SUBSCRIPTION_STATUSES,
    blockBillingSuspendedShop,
    requireProductLimit,
    requireStaffLimit
};
