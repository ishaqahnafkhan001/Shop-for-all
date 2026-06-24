const VendorPlan = require('../../models/VendorPlan');
const mongoose = require('mongoose');

const DEFAULT_PLAN_DEFINITIONS = {
    Starter: {
        name: 'Starter',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        productLimit: 100,
        staffLimit: 1,
        features: {
            storeBuilder: true,
            coupons: true,
            analytics: true,
            customDomain: false,
            staffAccounts: true,
            bulkProductTools: false,
            growthCenter: false,
            aiAdGenerator: false
        },
        badgeEligible: false,
        prioritySupport: false
    },
    Growth: {
        name: 'Growth',
        monthlyPrice: 2499,
        yearlyPrice: 24990,
        productLimit: 500,
        staffLimit: 3,
        features: {
            storeBuilder: true,
            coupons: true,
            analytics: true,
            customDomain: true,
            staffAccounts: true,
            bulkProductTools: true,
            growthCenter: true,
            aiAdGenerator: true
        },
        badgeEligible: true,
        prioritySupport: false
    },
    Pro: {
        name: 'Pro',
        monthlyPrice: 5999,
        yearlyPrice: 59990,
        productLimit: 2000,
        staffLimit: 10,
        features: {
            storeBuilder: true,
            coupons: true,
            analytics: true,
            customDomain: true,
            staffAccounts: true,
            bulkProductTools: true,
            growthCenter: true,
            aiAdGenerator: true
        },
        badgeEligible: true,
        prioritySupport: true
    }
};

const normalizePlanName = (name) => {
    const value = String(name || 'Starter').trim();
    return DEFAULT_PLAN_DEFINITIONS[value] ? value : 'Starter';
};

const mergePlan = (storedPlan, fallbackName = 'Starter') => {
    const fallback = DEFAULT_PLAN_DEFINITIONS[normalizePlanName(storedPlan?.name || fallbackName)];
    return {
        ...fallback,
        ...(storedPlan || {}),
        yearlyPrice: storedPlan?.yearlyPrice ?? storedPlan?.annualPrice ?? fallback.yearlyPrice,
        features: {
            ...fallback.features,
            ...(storedPlan?.features || {})
        }
    };
};

const getPlanByNameOrDefault = async (planName = 'Starter') => {
    const normalizedName = normalizePlanName(planName);
    const storedPlan = await VendorPlan.findOne({ name: normalizedName, isActive: { $ne: false } }).lean();
    return mergePlan(storedPlan, normalizedName);
};

const getPlanByIdOrNameOrDefault = async (planRef = 'Starter') => {
    if (planRef && mongoose.Types.ObjectId.isValid(String(planRef))) {
        const storedPlan = await VendorPlan.findById(planRef).lean();
        if (storedPlan) return mergePlan(storedPlan, storedPlan.name);
    }

    return getPlanByNameOrDefault(planRef);
};

const getPlanLimits = async (planOrName = 'Starter') => {
    const plan = typeof planOrName === 'string' || mongoose.Types.ObjectId.isValid(String(planOrName || ''))
        ? await getPlanByIdOrNameOrDefault(planOrName)
        : mergePlan(planOrName, planOrName?.name);

    return {
        productLimit: Number(plan.productLimit || 0),
        staffLimit: Number(plan.staffLimit || 0)
    };
};

const getPlanFeatures = async (planOrName = 'Starter') => {
    const plan = typeof planOrName === 'string' || mongoose.Types.ObjectId.isValid(String(planOrName || ''))
        ? await getPlanByIdOrNameOrDefault(planOrName)
        : mergePlan(planOrName, planOrName?.name);

    return { ...(plan.features || {}) };
};

const calculatePlanPrice = async (planOrName = 'Starter', billingCycle = 'monthly') => {
    const plan = typeof planOrName === 'string' || mongoose.Types.ObjectId.isValid(String(planOrName || ''))
        ? await getPlanByIdOrNameOrDefault(planOrName)
        : mergePlan(planOrName, planOrName?.name);

    return billingCycle === 'yearly'
        ? Number(plan.yearlyPrice || 0)
        : Number(plan.monthlyPrice || 0);
};

module.exports = {
    DEFAULT_PLAN_DEFINITIONS,
    normalizePlanName,
    mergePlan,
    getPlanByNameOrDefault,
    getPlanByIdOrNameOrDefault,
    getPlanLimits,
    getPlanFeatures,
    calculatePlanPrice
};
