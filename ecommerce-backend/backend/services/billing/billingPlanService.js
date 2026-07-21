const VendorPlan = require('../../models/VendorPlan');
const mongoose = require('mongoose');
const {
    PLAN_DEFINITIONS,
    normalizePlanKey,
    getCanonicalPlan
} = require('../../config/subscriptionPlans');

const toLegacyPlanShape = (plan) => ({
    ...plan,
    productLimit: plan.limits.productCount,
    staffLimit: plan.limits.staffAccounts
});

const DEFAULT_PLAN_DEFINITIONS = Object.values(PLAN_DEFINITIONS).reduce((acc, plan) => {
    acc[plan.name] = toLegacyPlanShape(plan);
    return acc;
}, {});

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
    return getCanonicalPlan(name).name;
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
    const fallback = toLegacyPlanShape(getCanonicalPlan(storedPlan?.slug || storedPlan?.name || fallbackName));
    const storedLimits = storedPlan?.limits || {};
    const productLimit = storedLimits.productCount !== undefined
        ? storedLimits.productCount
        : (storedPlan?.productLimit !== undefined ? storedPlan.productLimit : fallback.productLimit);
    const staffLimit = storedLimits.staffAccounts !== undefined
        ? storedLimits.staffAccounts
        : (storedPlan?.staffLimit !== undefined ? storedPlan.staffLimit : fallback.staffLimit);
    return {
        ...fallback,
        ...(storedPlan || {}),
        slug: storedPlan?.slug || fallback.slug || slugifyPlanName(storedPlan?.name || fallback.name),
        yearlyPrice: storedPlan?.yearlyPrice ?? storedPlan?.annualPrice ?? fallback.yearlyPrice,
        productLimit,
        staffLimit,
        limits: {
            ...fallback.limits,
            ...storedLimits,
            productCount: productLimit,
            staffAccounts: staffLimit
        },
        features: {
            ...fallback.features,
            ...(storedPlan?.features || {})
        },
        storeBuilderAccess: storedPlan?.storeBuilderAccess || fallback.storeBuilderAccess,
        storeBuilderCapabilities: {
            ...fallback.storeBuilderCapabilities,
            ...(storedPlan?.storeBuilderCapabilities || {})
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
        ...plan.limits,
        productLimit: plan.limits?.productCount ?? plan.productLimit ?? null,
        staffLimit: plan.limits?.staffAccounts ?? plan.staffLimit ?? null
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
    normalizePlanKey,
    getPlanSlug,
    mergePlan,
    getPlanByNameOrDefault,
    getPlanBySlugOrNameOrDefault,
    getPlanByIdOrNameOrDefault,
    getPlanLimits,
    getPlanFeatures,
    calculatePlanPrice
};
