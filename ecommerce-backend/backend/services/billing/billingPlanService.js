const VendorPlan = require('../../models/VendorPlan');
const mongoose = require('mongoose');

const DEFAULT_PLAN_DEFINITIONS = {
    Starter: {
        name: 'Starter',
        slug: 'starter',
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
        slug: 'growth',
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
        slug: 'pro',
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

const slugifyPlanName = (value = 'Starter') => String(value || 'Starter')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'starter';

const PLAN_SLUG_TO_NAME = Object.values(DEFAULT_PLAN_DEFINITIONS).reduce((acc, plan) => {
    acc[plan.slug] = plan.name;
    return acc;
}, {});

const normalizePlanName = (name) => {
    const value = String(name || 'Starter').trim();
    if (DEFAULT_PLAN_DEFINITIONS[value]) return value;
    return PLAN_SLUG_TO_NAME[slugifyPlanName(value)] || 'Starter';
};

const normalizePlanSlug = (value) => {
    const slug = slugifyPlanName(value || 'starter');
    return PLAN_SLUG_TO_NAME[slug] ? slug : DEFAULT_PLAN_DEFINITIONS[normalizePlanName(value)]?.slug || 'starter';
};

const getPlanSlug = (planOrName = 'Starter') => {
    if (planOrName && typeof planOrName === 'object') {
        return planOrName.slug || slugifyPlanName(planOrName.name || 'Starter');
    }

    return DEFAULT_PLAN_DEFINITIONS[normalizePlanName(planOrName)]?.slug || slugifyPlanName(planOrName);
};

const mergePlan = (storedPlan, fallbackName = 'Starter') => {
    const fallback = DEFAULT_PLAN_DEFINITIONS[normalizePlanName(storedPlan?.name || fallbackName)];
    return {
        ...fallback,
        ...(storedPlan || {}),
        slug: storedPlan?.slug || fallback.slug || slugifyPlanName(storedPlan?.name || fallback.name),
        yearlyPrice: storedPlan?.yearlyPrice ?? storedPlan?.annualPrice ?? fallback.yearlyPrice,
        features: {
            ...fallback.features,
            ...(storedPlan?.features || {})
        }
    };
};

const getPlanByNameOrDefault = async (planName = 'Starter') => {
    const rawValue = String(planName || 'Starter').trim() || 'Starter';
    const normalizedName = normalizePlanName(planName);
    const normalizedSlug = normalizePlanSlug(planName);
    const rawSlug = slugifyPlanName(rawValue);
    const storedPlan = await VendorPlan.findOne({
        isActive: { $ne: false },
        $or: [
            { name: rawValue },
            { slug: rawSlug },
            { name: normalizedName },
            { slug: normalizedSlug }
        ]
    }).lean();
    return mergePlan(storedPlan, storedPlan?.name || normalizedName);
};

const getPlanBySlugOrNameOrDefault = async (planSlugOrName = 'starter') => {
    return getPlanByNameOrDefault(planSlugOrName);
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
    PLAN_SLUG_TO_NAME,
    slugifyPlanName,
    normalizePlanName,
    normalizePlanSlug,
    getPlanSlug,
    mergePlan,
    getPlanByNameOrDefault,
    getPlanBySlugOrNameOrDefault,
    getPlanByIdOrNameOrDefault,
    getPlanLimits,
    getPlanFeatures,
    calculatePlanPrice
};
