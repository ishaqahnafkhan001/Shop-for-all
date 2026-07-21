const Product = require('../../models/Product');
const User = require('../../models/User');
const { getWeeklyAiUsage } = require('./planUsageService');
const { buildUsageValue } = require('./quotaResponseService');

const getSubscriptionUsage = async (shopOrId, options = {}) => {
    const access = options.access || await require('./planAccessService').getShopPlanAccess(shopOrId);
    const shopId = access.shop?._id || shopOrId?._id || shopOrId;
    const [productCount, staffCount, aiGeneration] = await Promise.all([
        Product.countDocuments({ shop_id: shopId, isDeleted: { $ne: true } }),
        User.countDocuments({ shop_id: shopId, role: 'VendorStaff', status: 'Active' }),
        getWeeklyAiUsage({ shopId, limit: access.limits.aiProductCreationsPerWeek })
    ]);

    const usage = {
        products: buildUsageValue({ used: productCount, limit: access.limits.productCount }),
        staff: buildUsageValue({ used: staffCount, limit: access.limits.staffAccounts }),
        aiGeneration: {
            ...buildUsageValue({ used: aiGeneration.used, limit: aiGeneration.limit }),
            resetsAt: aiGeneration.resetsAt
        },
        imagesPerProduct: access.limits.imagesPerProduct
    };

    const payload = {
        plan: access.planName,
        planKey: access.planKey,
        subscriptionStatus: access.subscriptionStatus,
        usage
    };

    if (options.evaluateWarnings) {
        payload.warnings = await require('./subscriptionWarningService').evaluateUsageWarnings({
            shopId,
            planKey: access.planKey,
            usage,
            req: options.req || null
        });
    } else {
        payload.warnings = require('./subscriptionWarningService').getCurrentUsageWarnings({
            planKey: access.planKey,
            usage
        });
    }

    return payload;
};

const toLegacyUsageShape = (usagePayload) => ({
    products: usagePayload.usage.products.used,
    staff: usagePayload.usage.staff.used,
    ai: {
        used: usagePayload.usage.aiGeneration.used,
        limit: usagePayload.usage.aiGeneration.limit,
        remaining: usagePayload.usage.aiGeneration.remaining,
        unlimited: usagePayload.usage.aiGeneration.unlimited,
        resetsAt: usagePayload.usage.aiGeneration.resetsAt
    }
});

module.exports = {
    getSubscriptionUsage,
    toLegacyUsageShape
};
