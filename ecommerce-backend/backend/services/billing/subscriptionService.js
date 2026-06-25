const Shop = require('../../models/Shop');
const Subscription = require('../../models/Subscription');
const VendorPlan = require('../../models/VendorPlan');
const { isVerificationSuspension } = require('../vendorVerificationService');
const { logPlatformAudit } = require('../platformAuditLogService');
const { createNotification } = require('../notificationService');
const {
    getPlanByNameOrDefault,
    normalizePlanName
} = require('./billingPlanService');

const TRIAL_DAYS = 14;
const GRACE_DAYS = 3;
const BILLING_SUSPENSION_REASON = 'Billing trial or subscription expired. Payment verification is required.';

const addDays = (date, days) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
};

const isBillingSuspension = (shop) => {
    const reason = String(shop?.suspensionReason || '').toLowerCase();
    return reason.includes('billing') || reason.includes('payment') || reason.includes('subscription');
};

const queryWithSession = (query, session) => (session ? query.session(session) : query);

const getShopDocument = async (shopOrId, session) => {
    if (shopOrId && typeof shopOrId === 'object' && shopOrId._id) return shopOrId;
    return queryWithSession(Shop.findById(shopOrId), session);
};

const getCurrentSubscriptionForShop = async (shopId, options = {}) => {
    return queryWithSession(
        Subscription.findOne({ shopId }).sort({ createdAt: -1 }),
        options.session
    );
};

const findPlanId = async (planName, session) => {
    const plan = await queryWithSession(
        VendorPlan.findOne({ name: normalizePlanName(planName), isActive: { $ne: false } }).select('_id'),
        session
    );
    return plan?._id || null;
};

const createTrialForShop = async (shopOrId, options = {}) => {
    const { session, now = new Date() } = options;
    const shop = await getShopDocument(shopOrId, session);
    if (!shop) throw new Error('Shop not found');

    const existing = await getCurrentSubscriptionForShop(shop._id, { session });
    if (existing) return existing;

    const planName = normalizePlanName(shop.plan?.name || 'Starter');
    const trialEndsAt = shop.plan?.trialEndsAt || addDays(now, TRIAL_DAYS);
    const planId = await findPlanId(planName, session);

    const [subscription] = await Subscription.create([{
        shopId: shop._id,
        planId,
        status: 'trialing',
        billingCycle: 'monthly',
        trialStartedAt: now,
        trialEndsAt
    }], { session });

    await queryWithSession(
        Shop.updateOne(
            { _id: shop._id },
            {
                $set: {
                    'plan.name': 'Trial',
                    'plan.status': 'Trialing',
                    'plan.trialEndsAt': trialEndsAt,
                    'plan.productLimit': shop.plan?.productLimit || 100
                }
            }
        ),
        session
    );

    return subscription;
};

const markPendingApproval = async ({
    subscription,
    subscriptionId,
    planId,
    planName = '',
    billingCycle = 'monthly',
    invoiceId = null
}) => {
    const current = subscription || await Subscription.findById(subscriptionId);
    if (!current) throw new Error('Subscription not found');

    current.status = 'pending_approval';
    current.pendingPlanId = planId || null;
    current.pendingPlanName = planName || '';
    current.billingCycle = billingCycle || current.billingCycle || 'monthly';
    current.lastInvoiceId = invoiceId || current.lastInvoiceId || null;
    await current.save();

    return current;
};

const ensureSubscriptionExists = async (shopOrId, options = {}) => {
    const { session, now = new Date() } = options;
    const shop = await getShopDocument(shopOrId, session);
    if (!shop) throw new Error('Shop not found');

    const existing = await getCurrentSubscriptionForShop(shop._id, { session });
    if (existing) return existing;

    const planName = normalizePlanName(shop.plan?.name || 'Starter');
    const planId = await findPlanId(planName, session);
    const legacyStatus = shop.plan?.status || 'Trialing';

    if (legacyStatus === 'Active') {
        const currentPeriodEnd = shop.plan?.renewsAt || addDays(now, 30);
        const [subscription] = await Subscription.create([{
            shopId: shop._id,
            planId,
            status: 'active',
            billingCycle: 'monthly',
            currentPeriodStart: now,
            currentPeriodEnd
        }], { session });
        return subscription;
    }

    if (legacyStatus === 'PastDue') {
        const [subscription] = await Subscription.create([{
            shopId: shop._id,
            planId,
            status: 'past_due',
            billingCycle: 'monthly',
            graceEndsAt: addDays(now, GRACE_DAYS)
        }], { session });
        return subscription;
    }

    if (legacyStatus === 'Cancelled') {
        const [subscription] = await Subscription.create([{
            shopId: shop._id,
            planId,
            status: 'cancelled',
            billingCycle: 'monthly',
            cancelledAt: now
        }], { session });
        return subscription;
    }

    return createTrialForShop(shop, { session, now });
};

const activateSubscription = async ({
    subscription,
    subscriptionId,
    planId,
    billingCycle = 'monthly',
    invoiceId = null,
    req = null,
    now = new Date()
}) => {
    const current = subscription || await Subscription.findById(subscriptionId);
    if (!current) throw new Error('Subscription not found');

    const plan = planId
        ? await VendorPlan.findById(planId).lean()
        : await getPlanByNameOrDefault('Starter');

    const periodDays = billingCycle === 'yearly' ? 365 : 30;
    current.planId = plan?._id || current.planId || null;
    current.status = 'active';
    current.billingCycle = billingCycle;
    current.currentPeriodStart = now;
    current.currentPeriodEnd = addDays(now, periodDays);
    current.activatedAt = now;
    current.pendingPlanId = null;
    current.pendingPlanName = '';
    current.graceEndsAt = undefined;
    current.suspendedAt = undefined;
    current.suspensionReason = '';
    current.lastInvoiceId = invoiceId || current.lastInvoiceId || null;
    await current.save();

    const shop = await Shop.findById(current.shopId);
    if (shop) {
        const planName = plan?.name || shop.plan?.name || 'Starter';
        const update = {
            'plan.name': planName,
            'plan.status': 'Active',
            'plan.renewsAt': current.currentPeriodEnd,
            'plan.productLimit': plan?.productLimit || shop.plan?.productLimit || 100
        };

        if (isBillingSuspension(shop) && !isVerificationSuspension(shop)) {
            update.approvalStatus = 'Approved';
            update.isActive = true;
            update.suspensionReason = '';
        }

        await Shop.updateOne({ _id: shop._id }, { $set: update });
    }

    await logPlatformAudit({
        req,
        action: 'billing.subscription_activated',
        entityType: 'Subscription',
        entityId: current._id,
        shop_id: current.shopId,
        message: 'Subscription activated after billing verification',
        metadata: {
            billingCycle,
            planId: current.planId,
            currentPeriodEnd: current.currentPeriodEnd
        }
    });

    await createNotification({
        shop_id: current.shopId,
        type: 'system',
        title: 'Subscription activated',
        message: 'Your subscription is active. Your store billing is healthy.',
        entityType: 'Subscription',
        entityId: current._id,
        severity: 'success',
        metadata: {
            billingCycle,
            planId: current.planId,
            currentPeriodEnd: current.currentPeriodEnd
        }
    });

    return current;
};

const markPastDue = async (subscription, options = {}) => {
    const now = options.now || new Date();
    subscription.status = 'past_due';
    subscription.graceEndsAt = addDays(now, GRACE_DAYS);
    await subscription.save();
    return subscription;
};

const returnToTrialOrPastDueAfterRejection = async (subscription, options = {}) => {
    const now = options.now || new Date();
    const trialEndsAt = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
    subscription.pendingPlanId = null;
    subscription.pendingPlanName = '';

    if (subscription.status === 'active') {
        await subscription.save();
        return subscription;
    }

    if (trialEndsAt && trialEndsAt.getTime() > now.getTime()) {
        subscription.status = 'trialing';
        subscription.graceEndsAt = undefined;
    } else {
        subscription.status = 'past_due';
        subscription.graceEndsAt = addDays(now, GRACE_DAYS);
    }

    await subscription.save();
    return subscription;
};

const enterGracePeriod = async (subscription, options = {}) => {
    const now = options.now || new Date();
    subscription.status = 'grace';
    subscription.graceEndsAt = subscription.graceEndsAt || addDays(now, GRACE_DAYS);
    await subscription.save();
    await createNotification({
        shop_id: subscription.shopId,
        type: 'system',
        title: 'Billing grace period started',
        message: `Your trial or invoice is overdue. Please submit payment before ${subscription.graceEndsAt.toDateString()} to avoid store restrictions.`,
        entityType: 'Subscription',
        entityId: subscription._id,
        severity: 'warning',
        metadata: { graceEndsAt: subscription.graceEndsAt }
    });
    return subscription;
};

const suspendForBilling = async (subscription, options = {}) => {
    const reason = options.reason || BILLING_SUSPENSION_REASON;
    const now = options.now || new Date();

    subscription.status = 'suspended';
    subscription.suspendedAt = now;
    subscription.suspensionReason = reason;
    await subscription.save();

    const shop = await Shop.findById(subscription.shopId);
    if (shop && !isVerificationSuspension(shop) && !isBillingSuspension(shop)) {
        await Shop.updateOne(
            { _id: shop._id },
            {
                $set: {
                    approvalStatus: 'Suspended',
                    isActive: false,
                    suspensionReason: reason
                }
            }
        );
    }

    await logPlatformAudit({
        req: options.req,
        action: 'billing.shop_suspended',
        entityType: 'Subscription',
        entityId: subscription._id,
        shop_id: subscription.shopId,
        message: 'Shop suspended for billing',
        reason,
        severity: 'warning'
    });

    await createNotification({
        shop_id: subscription.shopId,
        type: 'system',
        title: 'Store restricted for billing',
        message: 'Your store billing is suspended. Submit payment for Super Admin verification to reactivate billing.',
        entityType: 'Subscription',
        entityId: subscription._id,
        severity: 'critical',
        metadata: { reason }
    });

    return subscription;
};

const cancelSubscription = async (subscription, options = {}) => {
    subscription.status = 'cancelled';
    subscription.cancelledAt = options.now || new Date();
    await subscription.save();
    return subscription;
};

module.exports = {
    TRIAL_DAYS,
    GRACE_DAYS,
    BILLING_SUSPENSION_REASON,
    addDays,
    isBillingSuspension,
    getCurrentSubscriptionForShop,
    createTrialForShop,
    ensureSubscriptionExists,
    activateSubscription,
    markPendingApproval,
    returnToTrialOrPastDueAfterRejection,
    markPastDue,
    enterGracePeriod,
    suspendForBilling,
    cancelSubscription
};
