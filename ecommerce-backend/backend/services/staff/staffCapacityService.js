const User = require('../../models/User');
const Shop = require('../../models/Shop');
const { getPlanByIdOrNameOrDefault } = require('../billing/billingPlanService');
const { ensureSubscriptionExists } = require('../billing/subscriptionService');
const { computeEffectiveFeatures, getEffectivePlanRef, getPlanFeatures } = require('../shops/featureAccessService');

const STAFF_PERMISSION_KEYS = [
    'products',
    'orders',
    'customers',
    'promotions',
    'analytics',
    'storeBuilder',
    'settings',
    'staff'
];

const DEFAULT_STAFF_PERMISSIONS = {
    products: true,
    orders: true,
    customers: false,
    promotions: false,
    analytics: false,
    storeBuilder: false,
    settings: false,
    staff: false
};

const normalizeStaffLimit = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.trim().toLowerCase() === 'unlimited') return null;

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    if (numeric < 0) return null;
    return Math.max(0, Math.floor(numeric));
};

const sanitizeStaffPermissions = (input = {}, base = DEFAULT_STAFF_PERMISSIONS) => {
    return STAFF_PERMISSION_KEYS.reduce((acc, key) => {
        acc[key] = Boolean(Object.prototype.hasOwnProperty.call(input, key) ? input[key] : base[key]);
        return acc;
    }, {});
};

const getEffectivePlanForShop = async (shop, subscription) => {
    return getPlanByIdOrNameOrDefault(getEffectivePlanRef(shop, subscription));
};

const getStaffCapacity = async (shopId) => {
    const shop = await Shop.findById(shopId)
        .select('shopName plan featureFlags isActive approvalStatus suspensionReason verification')
        .lean();

    if (!shop) {
        const err = new Error('Shop not found');
        err.statusCode = 404;
        throw err;
    }

    const subscription = await ensureSubscriptionExists(shop);
    const [planFeatures, usedStaffCount] = await Promise.all([
        getPlanFeatures(shop, subscription),
        User.countDocuments({
            shop_id: shopId,
            role: 'VendorStaff',
            status: 'Active'
        })
    ]);
    const effectiveFeatures = computeEffectiveFeatures(shop, planFeatures, subscription.status);
    const plan = await getEffectivePlanForShop(shop, subscription);
    const staffLimit = normalizeStaffLimit(plan.staffLimit);
    const featureEnabled = Boolean(effectiveFeatures.staffAccounts);
    const remainingStaffSlots = staffLimit === null
        ? null
        : Math.max(staffLimit - usedStaffCount, 0);
    const canAddStaff = featureEnabled && (
        staffLimit === null || usedStaffCount < staffLimit
    );

    let message = '';
    if (!featureEnabled) {
        message = 'Staff accounts are not available on your current plan.';
    } else if (staffLimit === 0) {
        message = 'Your current plan does not include staff accounts.';
    } else if (staffLimit !== null && usedStaffCount >= staffLimit) {
        message = 'You have reached your staff limit for this plan.';
    }

    return {
        staffLimit,
        usedStaffCount,
        remainingStaffSlots,
        canAddStaff,
        featureEnabled,
        planName: plan.name || shop.plan?.name || 'Starter',
        subscriptionStatus: subscription?.status || 'active',
        message
    };
};

module.exports = {
    STAFF_PERMISSION_KEYS,
    DEFAULT_STAFF_PERMISSIONS,
    normalizeStaffLimit,
    sanitizeStaffPermissions,
    getStaffCapacity
};
