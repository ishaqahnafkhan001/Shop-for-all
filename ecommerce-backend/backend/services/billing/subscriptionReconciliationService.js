const Product = require('../../models/Product');
const ScheduledSale = require('../../models/ScheduledSale');
const Shop = require('../../models/Shop');
const cache = require('../cacheService');
const { getPlanBySlugOrNameOrDefault } = require('./billingPlanService');
const { getPlanFeatureValue } = require('../../config/subscriptionFeatures');

const reconcileShopPlan = async ({ shopId, planKey, plan: suppliedPlan = null }) => {
    const plan = suppliedPlan || await getPlanBySlugOrNameOrDefault(planKey);
    const now = new Date();
    const summary = {
        plan: plan.slug,
        scheduledProductsBlocked: 0,
        scheduledSalesBlocked: 0,
        activeSalesEnded: 0,
        customDomainInactive: false,
        trustBadgeInactive: false
    };

    const scheduledProductPublishing = getPlanFeatureValue(plan, 'scheduledProductPublishing');
    const scheduledSales = getPlanFeatureValue(plan, 'scheduledSales');
    const customDomain = getPlanFeatureValue(plan, 'customDomain');
    const trustSystem = getPlanFeatureValue(plan, 'trustSystem');

    if (!scheduledProductPublishing) {
        const result = await Product.updateMany(
            {
                shop_id: shopId,
                isDeleted: { $ne: true },
                publicationStatus: 'scheduled'
            },
            {
                $set: {
                    schedulePlanBlockedAt: now,
                    schedulePlanBlockedReason: 'Scheduled publishing is not available on the current plan.'
                }
            }
        );
        summary.scheduledProductsBlocked = result.modifiedCount || 0;
    }

    if (!scheduledSales) {
        const [pending, active] = await Promise.all([
            ScheduledSale.updateMany(
                { shop_id: shopId, status: 'scheduled' },
                { $set: { status: 'plan_blocked', processingState: 'completed', processingCompletedAt: now } }
            ),
            ScheduledSale.updateMany(
                { shop_id: shopId, status: 'active' },
                { $set: { status: 'ended', endsAt: now, processingState: 'completed', processingCompletedAt: now } }
            )
        ]);
        summary.scheduledSalesBlocked = pending.modifiedCount || 0;
        summary.activeSalesEnded = active.modifiedCount || 0;
    }

    const shopUpdate = {
        'customDomain.planInactive': !customDomain,
        'customDomain.planInactiveAt': !customDomain ? now : null,
        badgePlanInactive: !trustSystem,
        badgePlanInactiveAt: !trustSystem ? now : null
    };
    const shop = await Shop.findByIdAndUpdate(shopId, { $set: shopUpdate }, { new: true })
        .select('customDomain.domain badgeStatus')
        .lean();
    summary.customDomainInactive = Boolean(shop?.customDomain?.domain && !customDomain);
    summary.trustBadgeInactive = Boolean(shop?.badgeStatus === 'active' && !trustSystem);

    await Promise.all([
        cache.delPattern(`storefront:bootstrap:${shopId}:*`),
        cache.delPattern(`storefront:product:${shopId}:*`),
        cache.delPattern(`storefront:collections:${shopId}:*`),
        cache.del(`storefront:settings:${shopId}`)
    ]);

    return summary;
};

module.exports = { reconcileShopPlan };
