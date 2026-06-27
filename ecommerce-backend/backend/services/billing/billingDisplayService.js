const { getPlanSlug } = require('./billingPlanService');

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

    if (!plain) {
        return {
            displayPlan: 'Trial',
            activePlanName: '',
            activePlanSlug: '',
            pendingPlanName: '',
            pendingPlanSlug: '',
            intendedPlanName: 'Starter',
            intendedPlanSlug: 'starter',
            effectivePlanName: 'Starter',
            effectivePlanSlug: 'starter'
        };
    }

    if (plain.status === 'trialing') {
        return {
            displayPlan: 'Trial',
            activePlanName: '',
            activePlanSlug: '',
            pendingPlanName: '',
            pendingPlanSlug: '',
            intendedPlanName: intendedName || 'Starter',
            intendedPlanSlug: intendedSlug || 'starter',
            effectivePlanName: 'Starter',
            effectivePlanSlug: 'starter'
        };
    }

    if (plain.status === 'pending_approval') {
        const effectiveName = activeName || 'Starter';
        const effectiveSlug = activeSlug || 'starter';
        return {
            displayPlan: `Pending ${pendingName || 'plan'}`,
            activePlanName: activeName,
            activePlanSlug: activeSlug,
            pendingPlanName: pendingName,
            pendingPlanSlug: pendingSlug,
            intendedPlanName: intendedName || pendingName || 'Starter',
            intendedPlanSlug: intendedSlug || pendingSlug || 'starter',
            effectivePlanName: effectiveName,
            effectivePlanSlug: effectiveSlug
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
