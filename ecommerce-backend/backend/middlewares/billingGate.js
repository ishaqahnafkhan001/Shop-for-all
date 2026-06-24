const Product = require('../models/Product');
const User = require('../models/User');
const Shop = require('../models/Shop');
const VendorPlan = require('../models/VendorPlan');
const { ensureSubscriptionExists, isBillingSuspension } = require('../services/billing/subscriptionService');
const { getPlanByNameOrDefault, mergePlan } = require('../services/billing/billingPlanService');

const billingDenied = (res, message = 'Billing is required to use this feature') => res.status(403).json({
    success: false,
    error: message,
    code: 'BILLING_REQUIRED'
});

const getShopId = (req) => req.tenantId || req.user?.shopId || req.user?.shop_id;

const getEffectivePlan = async (shop, subscription) => {
    if (subscription?.planId) {
        const storedPlan = await VendorPlan.findById(subscription.planId).lean();
        if (storedPlan) return mergePlan(storedPlan, storedPlan.name);
    }

    return getPlanByNameOrDefault(shop?.plan?.name || 'Starter');
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
        const blockedBySubscription = ['suspended', 'cancelled'].includes(subscription.status);
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
        const { shopId, subscription, plan } = await getBillingContext(req);
        if (['suspended', 'cancelled'].includes(subscription.status)) {
            return billingDenied(res, 'Your store billing is not active. Please submit payment for verification.');
        }

        const limit = Number(plan.productLimit || 0);
        const requestedCount = Math.max(1, Number(getRequestedCount(req)) || 1);
        if (!limit) return next();

        const existingCount = await Product.countDocuments({
            shop_id: shopId,
            isDeleted: { $ne: true }
        });

        if (existingCount + requestedCount > limit) {
            return res.status(403).json({
                success: false,
                error: `Your current plan allows up to ${limit} products. Upgrade your plan to add more.`,
                code: 'PRODUCT_LIMIT_REACHED',
                limit,
                current: existingCount
            });
        }

        return next();
    } catch (err) {
        console.error('Product limit gate error:', err);
        return res.status(500).json({ success: false, error: 'Unable to verify product limit' });
    }
};

const requireStaffLimit = async (req, res, next) => {
    try {
        if (req.body?.role && req.body.role !== 'VendorStaff') return next();

        const { shopId, subscription, plan } = await getBillingContext(req);
        if (['suspended', 'cancelled'].includes(subscription.status)) {
            return billingDenied(res, 'Your store billing is not active. Please submit payment for verification.');
        }

        const limit = Number(plan.staffLimit || 0);
        if (!limit) return next();

        const existingStaff = await User.countDocuments({
            shop_id: shopId,
            role: 'VendorStaff'
        });

        if (existingStaff >= limit) {
            return res.status(403).json({
                success: false,
                error: `Your current plan allows up to ${limit} staff account${limit === 1 ? '' : 's'}. Upgrade your plan to add more.`,
                code: 'STAFF_LIMIT_REACHED',
                limit,
                current: existingStaff
            });
        }

        return next();
    } catch (err) {
        console.error('Staff limit gate error:', err);
        return res.status(500).json({ success: false, error: 'Unable to verify staff limit' });
    }
};

module.exports = {
    blockBillingSuspendedShop,
    requireProductLimit,
    requireStaffLimit
};
