const { normalizePlanKey } = require('../../config/subscriptionPlans');

const toPlain = (value) => {
    if (!value) return {};
    return typeof value.toObject === 'function' ? value.toObject() : value;
};

const toDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getEffectivePlanRef = ({ subscription, shop } = {}) => {
    const plainSubscription = toPlain(subscription);
    const plainShop = toPlain(shop);
    const activePlanRef = plainSubscription.activePlanSlug ||
        plainSubscription.activePlanName ||
        plainSubscription.planId;
    const normalizedActivePlanRef = typeof activePlanRef === 'string'
        ? activePlanRef.trim().toLowerCase().replace(/[\s-]+/g, '_')
        : '';
    const isLegacyTrialMarker = ['trial', 'free_trial', '14_day_trial'].includes(normalizedActivePlanRef);

    if (activePlanRef && !isLegacyTrialMarker) return activePlanRef;
    if (plainSubscription.status === 'trialing' || plainSubscription.trialStartedAt) {
        return 'beginner';
    }

    return plainShop.plan?.activePlanSlug ||
        plainShop.plan?.activePlanName ||
        plainShop.plan?.name ||
        'starter';
};

const resolveSubscriptionAccess = ({
    subscription,
    shop = null,
    now = new Date()
} = {}) => {
    const plain = toPlain(subscription);
    const currentTime = toDate(now) || new Date();
    const trialEndsAt = toDate(plain.trialEndsAt);
    const currentPeriodEnd = toDate(plain.currentPeriodEnd);
    const graceEndsAt = toDate(plain.graceEndsAt);
    const rawStatus = String(plain.status || 'trialing');
    const isLegacyPendingApproval = rawStatus === 'pending_approval';
    const paymentReviewStatus = plain.paymentReviewStatus ||
        (isLegacyPendingApproval ? 'pending_approval' : 'none');
    const trialWasStarted = Boolean(plain.trialStartedAt || trialEndsAt);
    const isTrialActive = trialWasStarted &&
        Boolean(trialEndsAt && trialEndsAt.getTime() > currentTime.getTime()) &&
        ['trialing', 'pending_approval'].includes(rawStatus);
    const hasPaidAccessEvidence = Boolean(
        plain.activatedAt ||
        ['active', 'past_due', 'grace'].includes(rawStatus)
    );
    const paidPeriodActive = Boolean(
        hasPaidAccessEvidence &&
        currentPeriodEnd &&
        currentPeriodEnd.getTime() > currentTime.getTime()
    );

    let subscriptionStatus = rawStatus;
    if (isLegacyPendingApproval) {
        if (isTrialActive) subscriptionStatus = 'trialing';
        else if (paidPeriodActive) subscriptionStatus = 'active';
        else subscriptionStatus = 'pending_approval_expired';
    } else if (rawStatus === 'trialing' && trialEndsAt && !isTrialActive) {
        subscriptionStatus = 'trial_expired';
    } else if (rawStatus === 'active' && currentPeriodEnd && !paidPeriodActive) {
        subscriptionStatus = 'period_expired';
    } else if (['past_due', 'grace'].includes(rawStatus) && graceEndsAt && graceEndsAt <= currentTime) {
        subscriptionStatus = 'grace_expired';
    }

    const isOperational = (
        (subscriptionStatus === 'trialing' && isTrialActive) ||
        (subscriptionStatus === 'active' && (!currentPeriodEnd || paidPeriodActive)) ||
        (['past_due', 'grace'].includes(subscriptionStatus) &&
            (!graceEndsAt || graceEndsAt.getTime() > currentTime.getTime()))
    );
    const effectivePlanRef = getEffectivePlanRef({ subscription: plain, shop });
    const effectivePlan = typeof effectivePlanRef === 'string'
        ? normalizePlanKey(effectivePlanRef)
        : effectivePlanRef;

    return {
        effectivePlan,
        effectivePlanRef,
        subscriptionStatus,
        rawSubscriptionStatus: rawStatus,
        paymentReviewStatus,
        isTrialActive,
        isOperational,
        trialEndsAt,
        currentPeriodEnd,
        graceEndsAt,
        entitlementVersion: Math.max(0, Number(plain.entitlementVersion) || 0)
    };
};

module.exports = {
    getEffectivePlanRef,
    resolveSubscriptionAccess
};
