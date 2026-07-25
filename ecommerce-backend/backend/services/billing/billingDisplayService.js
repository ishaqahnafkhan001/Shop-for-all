const { getPlanSlug } = require('./billingPlanService');
const { resolveSubscriptionAccess } = require('./subscriptionAccessResolver');

const toPlain = (value) => {
    if (!value) return null;
    return typeof value.toObject === 'function' ? value.toObject() : value;
};

const getPlanName = (plan) => {
    const plain = toPlain(plan);
    return plain?.name || '';
};

const getBillingDisplayForSubscription = ({ subscription, activePlan, pendingPlan } = {}) => {
    const plain = toPlain(subscription);
    const activeName = plain?.activePlanName || getPlanName(activePlan) || '';
    const activeSlug = plain?.activePlanSlug || (activeName ? getPlanSlug(activeName) : '');
    const pendingName = plain?.pendingPlanName || getPlanName(pendingPlan) || '';
    const pendingSlug = plain?.pendingPlanSlug || (pendingName ? getPlanSlug(pendingName) : '');
    const intendedName = plain?.intendedPlanName || '';
    const intendedSlug = plain?.intendedPlanSlug || (intendedName ? getPlanSlug(intendedName) : '');
    const resolvedAccess = plain ? resolveSubscriptionAccess({ subscription: plain }) : null;

    if (!plain) {
        return {
            displayPlan: 'Trial',
            activePlanName: '',
            activePlanSlug: '',
            pendingPlanName: '',
            pendingPlanSlug: '',
            intendedPlanName: 'Beginner',
            intendedPlanSlug: 'beginner',
            effectivePlanName: 'Beginner',
            effectivePlanSlug: 'beginner'
        };
    }

    if (resolvedAccess.subscriptionStatus === 'trialing') {
        const effectiveName = activeName || getPlanName(activePlan) || 'Beginner';
        const effectiveSlug = activeSlug || getPlanSlug(effectiveName);
        const paymentPending = resolvedAccess.paymentReviewStatus === 'pending_approval';
        return {
            displayPlan: paymentPending ? `Trial · Pending ${pendingName || 'plan'}` : 'Trial',
            activePlanName: effectiveName,
            activePlanSlug: effectiveSlug,
            pendingPlanName: paymentPending ? pendingName : '',
            pendingPlanSlug: paymentPending ? pendingSlug : '',
            intendedPlanName: intendedName || effectiveName,
            intendedPlanSlug: intendedSlug || effectiveSlug,
            effectivePlanName: effectiveName,
            effectivePlanSlug: effectiveSlug,
            paymentReviewStatus: resolvedAccess.paymentReviewStatus
        };
    }

    if (resolvedAccess.paymentReviewStatus === 'pending_approval') {
        const effectiveName = activeName || 'Beginner';
        const effectiveSlug = activeSlug || 'beginner';
        return {
            displayPlan: `Pending ${pendingName || 'plan'}`,
            activePlanName: activeName,
            activePlanSlug: activeSlug,
            pendingPlanName: pendingName,
            pendingPlanSlug: pendingSlug,
            intendedPlanName: intendedName || pendingName || 'Starter',
            intendedPlanSlug: intendedSlug || pendingSlug || 'starter',
            effectivePlanName: effectiveName,
            effectivePlanSlug: effectiveSlug,
            paymentReviewStatus: resolvedAccess.paymentReviewStatus
        };
    }

    if (plain.status === 'active') {
        const displayName = activeName || 'Active plan';
        return {
            displayPlan: displayName,
            activePlanName: displayName,
            activePlanSlug: activeSlug || getPlanSlug(displayName),
            pendingPlanName: '',
            pendingPlanSlug: '',
            intendedPlanName: intendedName || displayName,
            intendedPlanSlug: intendedSlug || activeSlug || getPlanSlug(displayName),
            effectivePlanName: displayName,
            effectivePlanSlug: activeSlug || getPlanSlug(displayName)
        };
    }

    const fallbackName = activeName || 'Starter';
    return {
        displayPlan: fallbackName,
        activePlanName: activeName,
        activePlanSlug: activeSlug,
        pendingPlanName: pendingName,
        pendingPlanSlug: pendingSlug,
        intendedPlanName: intendedName || fallbackName,
        intendedPlanSlug: intendedSlug || activeSlug || getPlanSlug(fallbackName),
        effectivePlanName: fallbackName,
        effectivePlanSlug: activeSlug || getPlanSlug(fallbackName)
    };
};

module.exports = {
    getBillingDisplayForSubscription
};
