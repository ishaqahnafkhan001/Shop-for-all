const { PLAN_ORDER } = require('../../config/subscriptionPlans');

const RESOURCE_DEFINITIONS = Object.freeze({
    products: {
        errorCode: 'PRODUCT_LIMIT_REACHED',
        label: 'Product',
        limitKey: 'productCount',
        upgradeReason: 'Add more products and expand your catalogue'
    },
    staff: {
        errorCode: 'STAFF_LIMIT_REACHED',
        label: 'Staff',
        limitKey: 'staffAccounts',
        upgradeReason: 'Add more staff accounts'
    },
    aiGeneration: {
        errorCode: 'AI_GENERATION_LIMIT_REACHED',
        label: 'AI generation',
        limitKey: 'aiProductCreationsPerWeek',
        upgradeReason: 'Increase weekly AI generation capacity'
    },
    images: {
        errorCode: 'IMAGE_LIMIT_REACHED',
        label: 'Product image',
        limitKey: 'imagesPerProduct',
        upgradeReason: 'Show more product angles, details, and variants'
    }
});

const buildUsageValue = ({ used = 0, limit = null }) => ({
    used: Math.max(Number(used) || 0, 0),
    limit: limit === null ? null : Math.max(Number(limit) || 0, 0),
    remaining: limit === null ? null : Math.max(Number(limit || 0) - Number(used || 0), 0),
    unlimited: limit === null
});

const buildRichQuotaError = ({ context, resource, used, limit, message = '' }) => {
    const definition = RESOURCE_DEFINITIONS[resource] || {
        errorCode: 'PLAN_LIMIT_REACHED',
        label: 'Plan',
        limitKey: resource,
        upgradeReason: 'Increase plan capacity'
    };
    const currentIndex = PLAN_ORDER.indexOf(context?.planKey);
    const recommended = currentIndex >= 0 && currentIndex < PLAN_ORDER.length - 1
        ? PLAN_ORDER[currentIndex + 1]
        : null;
    const finalMessage = message || `${definition.label} limit reached.`;
    return {
        success: false,
        code: 'PLAN_LIMIT_REACHED',
        errorCode: definition.errorCode,
        error: finalMessage,
        message: finalMessage,
        limitKey: definition.limitKey,
        plan: context?.planName || context?.planKey || 'Starter',
        currentPlan: context?.planKey || 'starter',
        usage: buildUsageValue({ used, limit }),
        // Legacy fields remain while existing admin consumers migrate.
        limit,
        current: Math.max(Number(used) || 0, 0),
        upgrade: {
            recommended,
            reason: definition.upgradeReason
        },
        recommendedPlan: recommended,
        upgradeReason: definition.upgradeReason
    };
};

module.exports = {
    RESOURCE_DEFINITIONS,
    buildUsageValue,
    buildRichQuotaError
};
