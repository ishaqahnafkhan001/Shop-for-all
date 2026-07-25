const Shop = require('../../models/Shop');
const Subscription = require('../../models/Subscription');
const VendorPlan = require('../../models/VendorPlan');
const { isVerificationSuspension } = require('../vendorVerificationService');
const { logPlatformAudit } = require('../platformAuditLogService');
const { PLAN_ORDER } = require('../../config/subscriptionPlans');
const { SUBSCRIPTION_EVENTS, emitSubscriptionEvent } = require('./subscriptionEvents');
const { resolveSubscriptionAccess } = require('./subscriptionAccessResolver');
const {
    getPlanByNameOrDefault,
    getPlanByIdOrNameOrDefault,
    getPlanSlug,
    normalizePlanName,
    normalizePlanSlug
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

const isShopRecord = (value) => Boolean(
    value &&
    typeof value === 'object' &&
    value._id &&
    (
        typeof value.toObject === 'function' ||
        Object.prototype.hasOwnProperty.call(value, 'shopName') ||
        Object.prototype.hasOwnProperty.call(value, 'plan')
    )
);

const getShopDocument = async (shopOrId, session) => {
    if (isShopRecord(shopOrId)) return shopOrId;
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

const findPlanDocument = async (planRef, session) => {
    if (!planRef) return null;

    if (String(planRef).match(/^[a-f\d]{24}$/i)) {
        const byId = await queryWithSession(
            VendorPlan.findById(planRef).lean(),
            session
        );
        if (byId) return byId;
    }

    const rawValue = String(planRef || '').trim();
    const name = normalizePlanName(planRef);
    const slug = normalizePlanSlug(planRef);
    const rawSlug = rawValue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return queryWithSession(
        VendorPlan.findOne({
            isActive: { $ne: false },
            $or: [
                { name: rawValue },
                { slug: rawSlug },
                { name },
                { slug }
            ]
        }).lean(),
        session
    );
};

const DEFAULT_TRIAL_PLAN = 'beginner';

const getPlanIdentity = async (planRef = 'Starter', session) => {
    const storedPlan = await findPlanDocument(planRef, session);
    const plan = storedPlan || await getPlanByIdOrNameOrDefault(planRef || 'Starter');
    return {
        id: storedPlan?._id || plan?._id || null,
        name: plan?.name || normalizePlanName(planRef),
        slug: plan?.slug || getPlanSlug(plan?.name || planRef)
    };
};

const createTrialForShop = async (shopOrId, options = {}) => {
    const { session, now = new Date() } = options;
    const shop = await getShopDocument(shopOrId, session);
    if (!shop) throw new Error('Shop not found');

    const existing = await getCurrentSubscriptionForShop(shop._id, { session });
    if (existing) return existing;

    const intendedPlanRef = options.intendedPlanId ||
        options.intendedPlanSlug ||
        options.selectedPlanSlug ||
        options.intendedPlanName ||
        shop.plan?.intendedPlanSlug ||
        shop.plan?.intendedPlanName ||
        DEFAULT_TRIAL_PLAN;
    const intendedPlan = await getPlanIdentity(intendedPlanRef, session);
    const effectiveTrialPlan = await getPlanIdentity(DEFAULT_TRIAL_PLAN, session);
    const trialPlanDetails = await getPlanByIdOrNameOrDefault(
        effectiveTrialPlan.id || effectiveTrialPlan.slug || effectiveTrialPlan.name
    );
    const trialEndsAt = shop.plan?.trialEndsAt || addDays(now, TRIAL_DAYS);

    const [subscription] = await Subscription.create([{
        shopId: shop._id,
        planId: effectiveTrialPlan.id,
        activePlanName: effectiveTrialPlan.name,
        activePlanSlug: effectiveTrialPlan.slug,
        intendedPlanId: intendedPlan.id,
        intendedPlanName: intendedPlan.name,
        intendedPlanSlug: intendedPlan.slug,
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
                    'plan.productLimit': trialPlanDetails?.limits?.productCount ??
                        trialPlanDetails?.productLimit ??
                        shop.plan?.productLimit ??
                        25,
                    'plan.activePlanName': effectiveTrialPlan.name,
                    'plan.activePlanSlug': effectiveTrialPlan.slug,
                    'plan.intendedPlanName': intendedPlan.name,
                    'plan.intendedPlanSlug': intendedPlan.slug
                }
            }
        ),
        session
    );

    if (!session) {
        await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.TRIAL_STARTED, {
            req: options.req || null,
            shopId: shop._id,
            subscriptionId: subscription._id,
            planKey: effectiveTrialPlan.slug,
            newValue: {
                status: subscription.status,
                planKey: effectiveTrialPlan.slug,
                planName: effectiveTrialPlan.name,
                trialStartedAt: now,
                trialEndsAt
            },
            affectedResources: ['subscription', 'trial']
        });
    }

    return subscription;
};

const markPendingApproval = async ({
    subscription,
    subscriptionId,
    planId,
    planName = '',
    planSlug = '',
    billingCycle = 'monthly',
    invoiceId = null,
    req = null
}) => {
    const current = subscription || await Subscription.findById(subscriptionId);
    if (!current) throw new Error('Subscription not found');
    const previous = {
        status: current.status,
        paymentReviewStatus: current.paymentReviewStatus || 'none',
        pendingPlanSlug: current.pendingPlanSlug || '',
        pendingPlanName: current.pendingPlanName || ''
    };

    current.paymentReviewStatus = 'pending_approval';
    current.paymentReviewStartedAt = new Date();
    current.paymentReviewCompletedAt = null;
    current.pendingPlanId = planId || null;
    current.pendingPlanName = planName || '';
    current.pendingPlanSlug = planSlug || getPlanSlug(planName || 'Starter');
    current.billingCycle = billingCycle || current.billingCycle || 'monthly';
    current.lastInvoiceId = invoiceId || current.lastInvoiceId || null;
    await current.save();

    await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED, {
        req,
        shopId: current.shopId,
        subscriptionId: current._id,
        planKey: current.activePlanSlug || DEFAULT_TRIAL_PLAN,
        oldValue: previous,
        newValue: {
            status: current.status,
            paymentReviewStatus: current.paymentReviewStatus,
            pendingPlanSlug: current.pendingPlanSlug,
            pendingPlanName: current.pendingPlanName,
            billingCycle: current.billingCycle
        },
        affectedResources: ['subscription', 'payment_approval'],
        metadata: { notifyVendor: false }
    });

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
    const planSlug = getPlanSlug(planName);
    const legacyStatus = shop.plan?.status || 'Trialing';

    if (legacyStatus === 'Active') {
        const currentPeriodEnd = shop.plan?.renewsAt || addDays(now, 30);
        const [subscription] = await Subscription.create([{
            shopId: shop._id,
            planId,
            activePlanName: planName,
            activePlanSlug: planSlug,
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
            activePlanName: planName,
            activePlanSlug: planSlug,
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
            activePlanName: planName,
            activePlanSlug: planSlug,
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
    now = new Date(),
    session = null,
    skipAudit = false,
    deferEvents = false
}) => {
    const current = subscription || await Subscription.findById(subscriptionId).session(session || null);
    if (!current) throw new Error('Subscription not found');
    if (
        current.status === 'active' &&
        invoiceId &&
        String(current.lastInvoiceId || '') === String(invoiceId)
    ) {
        return current;
    }
    const previous = {
        status: current.status,
        paymentReviewStatus: current.paymentReviewStatus || 'none',
        planKey: current.activePlanSlug || current.pendingPlanSlug || '',
        planName: current.activePlanName || current.pendingPlanName || '',
        currentPeriodEnd: current.currentPeriodEnd || null,
        hadActiveSubscription: Boolean(current.activatedAt || current.currentPeriodStart)
    };

    const effectivePlanRef = planId || current.pendingPlanId || current.planId || current.pendingPlanSlug || current.pendingPlanName || 'Starter';
    const plan = await getPlanIdentity(effectivePlanRef, session);

    const periodDays = billingCycle === 'yearly' ? 365 : 30;
    current.planId = plan.id || null;
    current.activePlanName = plan.name;
    current.activePlanSlug = plan.slug;
    current.status = 'active';
    current.paymentReviewStatus = 'approved';
    current.paymentReviewCompletedAt = now;
    current.billingCycle = billingCycle;
    current.currentPeriodStart = now;
    current.currentPeriodEnd = addDays(now, periodDays);
    current.activatedAt = now;
    current.pendingPlanId = null;
    current.pendingPlanName = '';
    current.pendingPlanSlug = '';
    current.pendingPlanEffectiveAt = null;
    if (current.reconciliation?.status && ['pending', 'failed'].includes(current.reconciliation.status)) {
        current.reconciliation.status = 'cancelled';
        current.reconciliation.cancelledAt = now;
        current.reconciliation.reason = 'Cancelled because a new plan payment was activated.';
    }
    current.graceEndsAt = undefined;
    current.suspendedAt = undefined;
    current.suspensionReason = '';
    current.lastInvoiceId = invoiceId || current.lastInvoiceId || null;
    current.entitlementVersion = Math.max(0, Number(current.entitlementVersion) || 0) + 1;
    await current.save({ session });

    const shop = await Shop.findById(current.shopId).session(session || null);
    if (shop) {
        const hydratedPlan = await getPlanByNameOrDefault(plan.name || 'Starter');
        const planName = plan?.name || shop.plan?.name || 'Starter';
        const update = {
            'plan.name': planName,
            'plan.status': 'Active',
            'plan.renewsAt': current.currentPeriodEnd,
            'plan.productLimit': hydratedPlan?.productLimit || shop.plan?.productLimit || 100,
            'plan.activePlanName': planName,
            'plan.activePlanSlug': plan.slug
        };

        if (isBillingSuspension(shop) && !isVerificationSuspension(shop)) {
            update.approvalStatus = 'Approved';
            update.isActive = true;
            update.suspensionReason = '';
        }

        await Shop.updateOne({ _id: shop._id }, { $set: update }, { session });
    }

    if (!skipAudit) await logPlatformAudit({
        req,
        action: 'billing.subscription_activated',
        entityType: 'Subscription',
        entityId: current._id,
        shop_id: current.shopId,
        message: 'Subscription activated after billing verification',
        metadata: {
            billingCycle,
            planId: current.planId,
            planName: current.activePlanName,
            currentPeriodEnd: current.currentPeriodEnd
        }
    });

    const previousPlanIndex = PLAN_ORDER.indexOf(previous.planKey);
    const nextPlanIndex = PLAN_ORDER.indexOf(current.activePlanSlug);
    let eventType = SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED;
    if (previous.status === 'trialing' || (
        previous.paymentReviewStatus === 'pending_approval' &&
        !previous.hadActiveSubscription
    )) {
        eventType = SUBSCRIPTION_EVENTS.TRIAL_CONVERTED;
    } else if (previous.status === 'active' && previous.planKey === current.activePlanSlug) {
        eventType = SUBSCRIPTION_EVENTS.SUBSCRIPTION_RENEWED;
    } else if (previousPlanIndex >= 0 && nextPlanIndex > previousPlanIndex) {
        eventType = SUBSCRIPTION_EVENTS.PLAN_UPGRADED;
    } else if (previousPlanIndex >= 0 && nextPlanIndex < previousPlanIndex) {
        eventType = SUBSCRIPTION_EVENTS.PLAN_DOWNGRADED;
    }

    const eventPayload = {
        req,
        shopId: current.shopId,
        subscriptionId: current._id,
        planKey: current.activePlanSlug,
        oldValue: previous,
        newValue: {
            status: current.status,
            planKey: current.activePlanSlug,
            planName: current.activePlanName,
            billingCycle,
            currentPeriodEnd: current.currentPeriodEnd
        },
        affectedResources: ['subscription', 'plan', 'features', 'quotas'],
        metadata: { billingCycle, invoiceId: current.lastInvoiceId || null }
    };
    if (deferEvents) {
        current.$locals.deferredSubscriptionEvent = { eventType, eventPayload };
    } else {
        await emitSubscriptionEvent(eventType, eventPayload);
    }

    return current;
};

const markPastDue = async (subscription, options = {}) => {
    const now = options.now || new Date();
    const previousStatus = subscription.status;
    if (previousStatus === 'past_due') return subscription;
    subscription.status = 'past_due';
    subscription.graceEndsAt = addDays(now, GRACE_DAYS);
    subscription.entitlementVersion = Math.max(0, Number(subscription.entitlementVersion) || 0) + 1;
    await subscription.save();
    await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_EXPIRED, {
        req: options.req || null,
        shopId: subscription.shopId,
        subscriptionId: subscription._id,
        planKey: subscription.activePlanSlug,
        oldValue: { status: previousStatus },
        newValue: { status: subscription.status, graceEndsAt: subscription.graceEndsAt },
        affectedResources: ['subscription']
    });
    return subscription;
};

const returnToTrialOrPastDueAfterRejection = async (subscription, options = {}) => {
    const now = options.now || new Date();
    const previous = {
        status: subscription.status,
        paymentReviewStatus: subscription.paymentReviewStatus || 'none',
        pendingPlanSlug: subscription.pendingPlanSlug || '',
        pendingPlanName: subscription.pendingPlanName || ''
    };
    const trialEndsAt = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
    subscription.pendingPlanId = null;
    subscription.pendingPlanName = '';
    subscription.pendingPlanSlug = '';
    subscription.paymentReviewStatus = 'rejected';
    subscription.paymentReviewCompletedAt = now;

    const access = resolveSubscriptionAccess({ subscription, now });
    if (subscription.status === 'active' && access.isOperational) {
        await subscription.save({ session: options.session });
        const eventPayload = {
            req: options.req || null,
            shopId: subscription.shopId,
            subscriptionId: subscription._id,
            planKey: subscription.activePlanSlug,
            oldValue: previous,
            newValue: { status: subscription.status, pendingPlanSlug: '' },
            reason: options.reason || 'Payment rejected',
            affectedResources: ['subscription', 'payment_approval'],
            metadata: { notifyVendor: false }
        };
        if (options.deferEvents) {
            subscription.$locals.deferredSubscriptionEvent = {
                eventType: SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED,
                eventPayload
            };
        } else {
            await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED, eventPayload);
        }
        return subscription;
    }

    if (trialEndsAt && trialEndsAt.getTime() > now.getTime()) {
        subscription.status = 'trialing';
        subscription.graceEndsAt = undefined;
    } else {
        subscription.status = 'past_due';
        subscription.graceEndsAt = addDays(now, GRACE_DAYS);
    }

    await subscription.save({ session: options.session });
    const eventPayload = {
        req: options.req || null,
        shopId: subscription.shopId,
        subscriptionId: subscription._id,
        planKey: subscription.activePlanSlug || DEFAULT_TRIAL_PLAN,
        oldValue: previous,
        newValue: { status: subscription.status, pendingPlanSlug: '', graceEndsAt: subscription.graceEndsAt || null },
        reason: options.reason || 'Payment rejected',
        affectedResources: ['subscription', 'payment_approval'],
        metadata: { notifyVendor: false }
    };
    if (options.deferEvents) {
        subscription.$locals.deferredSubscriptionEvent = {
            eventType: SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED,
            eventPayload
        };
    } else {
        await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED, eventPayload);
    }
    return subscription;
};

const emitDeferredSubscriptionEvent = async (subscription) => {
    const deferred = subscription?.$locals?.deferredSubscriptionEvent;
    if (!deferred) return null;
    delete subscription.$locals.deferredSubscriptionEvent;
    return emitSubscriptionEvent(deferred.eventType, deferred.eventPayload);
};

const enterGracePeriod = async (subscription, options = {}) => {
    const now = options.now || new Date();
    const previousStatus = subscription.status;
    if (previousStatus === 'grace') return subscription;
    subscription.status = 'grace';
    subscription.graceEndsAt = subscription.graceEndsAt || addDays(now, GRACE_DAYS);
    subscription.entitlementVersion = Math.max(0, Number(subscription.entitlementVersion) || 0) + 1;
    await subscription.save();
    await emitSubscriptionEvent(
        ['trialing', 'pending_approval'].includes(previousStatus)
            ? SUBSCRIPTION_EVENTS.TRIAL_ENDED
            : SUBSCRIPTION_EVENTS.SUBSCRIPTION_EXPIRED,
        {
            req: options.req || null,
            shopId: subscription.shopId,
            subscriptionId: subscription._id,
            planKey: subscription.activePlanSlug || DEFAULT_TRIAL_PLAN,
            oldValue: { status: previousStatus },
            newValue: { status: subscription.status, graceEndsAt: subscription.graceEndsAt },
            affectedResources: ['subscription', 'trial'],
            metadata: { graceEndsAt: subscription.graceEndsAt }
        }
    );
    return subscription;
};

const suspendForBilling = async (subscription, options = {}) => {
    const reason = options.reason || BILLING_SUSPENSION_REASON;
    const now = options.now || new Date();

    const previousStatus = subscription.status;
    if (previousStatus === 'suspended') return subscription;
    subscription.status = 'suspended';
    subscription.suspendedAt = now;
    subscription.suspensionReason = reason;
    subscription.entitlementVersion = Math.max(0, Number(subscription.entitlementVersion) || 0) + 1;
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

    await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_CHANGED, {
        req: options.req || null,
        shopId: subscription.shopId,
        subscriptionId: subscription._id,
        planKey: subscription.activePlanSlug,
        oldValue: { status: previousStatus },
        newValue: { status: subscription.status, suspendedAt: now },
        reason,
        affectedResources: ['subscription', 'shop'],
        metadata: { billingSuspension: true }
    });

    return subscription;
};

const cancelSubscription = async (subscription, options = {}) => {
    const previousStatus = subscription.status;
    if (previousStatus === 'cancelled') return subscription;
    subscription.status = 'cancelled';
    subscription.cancelledAt = options.now || new Date();
    subscription.entitlementVersion = Math.max(0, Number(subscription.entitlementVersion) || 0) + 1;
    await subscription.save();
    await emitSubscriptionEvent(SUBSCRIPTION_EVENTS.SUBSCRIPTION_CANCELLED, {
        req: options.req || null,
        shopId: subscription.shopId,
        subscriptionId: subscription._id,
        planKey: subscription.activePlanSlug,
        oldValue: { status: previousStatus },
        newValue: { status: subscription.status, cancelledAt: subscription.cancelledAt },
        reason: options.reason || '',
        affectedResources: ['subscription']
    });
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
    emitDeferredSubscriptionEvent,
    markPendingApproval,
    returnToTrialOrPastDueAfterRejection,
    markPastDue,
    enterGracePeriod,
    suspendForBilling,
    cancelSubscription
};
