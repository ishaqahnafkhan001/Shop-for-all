const {
    getPlanBySlugOrNameOrDefault,
    getPlanSlug
} = require('../services/billing/billingPlanService');

const formatLimit = (value, singular, plural = `${singular}s`) => {
    if (value === null || value === undefined) return `Unlimited ${plural}`;
    return `${Number(value).toLocaleString('en-BD')} ${Number(value) === 1 ? singular : plural}`;
};

const buildPlanFeatures = (plan) => {
    const limits = plan.limits || {};
    const features = plan.features || {};
    const items = [
        limits.productCount == null ? 'Unlimited products' : `Up to ${Number(limits.productCount).toLocaleString('en-BD')} products`,
        limits.aiProductCreationsPerWeek === 0
            ? 'No AI product creation'
            : limits.aiProductCreationsPerWeek == null
            ? 'Unlimited AI product creation'
            : `${Number(limits.aiProductCreationsPerWeek).toLocaleString('en-BD')} AI products per week`,
        `Up to ${Number(limits.imagesPerProduct || 0).toLocaleString('en-BD')} images per product`,
        limits.staffAccounts === 0 ? 'No staff accounts' : formatLimit(limits.staffAccounts, 'staff account'),
        plan.storeBuilderAccess === 'none'
            ? 'Fixed responsive storefront'
            : plan.storeBuilderAccess === 'full'
                ? 'Full Store Builder'
                : 'Limited Store Builder'
    ];

    const featureLabels = [
        ['aiProductCreation', 'AI product creation'],
        ['storeBuilder', 'Store Builder'],
        ['homepageSeo', 'Homepage SEO'],
        ['growthCenter', 'Growth Center'],
        ['customDomain', 'Custom domain'],
        ['customerSection', 'Customer management'],
        ['trustSystem', 'Trust system'],
        ['notifications', 'Notification Center'],
        ['lowStockAlerts', 'Low-stock alerts'],
        ['scheduledSales', 'Scheduled sales'],
        ['scheduledProductPublishing', 'Scheduled product publishing']
    ];

    featureLabels.forEach(([key, label]) => {
        items.push(features[key] ? label : `No ${label.toLowerCase()}`);
    });

    if (!features.customDomain) items.splice(6, 0, 'Scaleup subdomain');
    return items;
};

const serializePublicPlan = (plan) => {
    const slug = getPlanSlug(plan);
    return {
        name: plan.name,
        slug,
        price: `৳${Number(plan.monthlyPrice || 0).toLocaleString('en-BD')}`,
        monthlyPrice: Number(plan.monthlyPrice || 0),
        yearlyPrice: Number(plan.yearlyPrice || 0),
        period: '/month',
        yearly: `৳${Number(plan.yearlyPrice || 0).toLocaleString('en-BD')}/year`,
        currency: plan.currency || 'BDT',
        audience: slug === 'beginner'
            ? 'Best for launching your first store'
            : slug === 'starter'
            ? 'Best for new sellers'
            : slug === 'growth'
                ? 'Best for growing businesses'
                : 'Best for established brands',
        cta: ['beginner', 'starter'].includes(slug) ? 'Start Free Trial' : `Choose ${plan.name}`,
        highlighted: slug === 'growth',
        badge: slug === 'growth' ? 'Recommended' : null,
        features: buildPlanFeatures(plan)
    };
};

exports.getPublicPlans = async (req, res) => {
    try {
        const plans = await Promise.all(
            ['beginner', 'starter', 'growth', 'pro'].map(getPlanBySlugOrNameOrDefault)
        );

        return res.status(200).json({
            success: true,
            data: plans.map(serializePublicPlan),
            trialDays: 14
        });
    } catch (error) {
        console.error('Public plan lookup failed:', error.message);
        return res.status(503).json({
            success: false,
            error: 'Plan information is temporarily unavailable.'
        });
    }
};

exports.serializePublicPlan = serializePublicPlan;
