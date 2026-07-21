const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
    PLAN_DEFINITIONS,
    STORE_BUILDER_CAPABILITIES,
    normalizePlanKey
} = require('../config/subscriptionPlans');
const { getUtcWeekWindow } = require('../services/billing/planUsageService');
const { getActivityLogCutoff } = require('../services/billing/activityLogRetentionService');
const {
    assertStoreBuilderUpdateAllowed,
    getPublicThemeForPlan
} = require('../services/billing/storeBuilderPlanService');
const { serializePublicPlan } = require('../controllers/publicPlanController');
const { buildOrderLineItem } = require('../services/orders/orderPricingService');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('canonical subscription matrix uses exact launch prices, limits, and features', () => {
    assert.deepEqual(
        Object.fromEntries(Object.entries(PLAN_DEFINITIONS).map(([key, plan]) => [key, plan.monthlyPrice])),
        { starter: 999, growth: 1999, pro: 3999 }
    );
    assert.deepEqual(PLAN_DEFINITIONS.starter.limits, {
        aiProductCreationsPerWeek: 10,
        imagesPerProduct: 5,
        staffAccounts: 1,
        productCount: 100,
        activityLogRetentionDays: 7
    });
    assert.equal(PLAN_DEFINITIONS.growth.limits.aiProductCreationsPerWeek, 50);
    assert.equal(PLAN_DEFINITIONS.growth.limits.imagesPerProduct, 10);
    assert.equal(PLAN_DEFINITIONS.growth.limits.staffAccounts, 3);
    assert.equal(PLAN_DEFINITIONS.growth.limits.productCount, 500);
    assert.equal(PLAN_DEFINITIONS.growth.limits.activityLogRetentionDays, 30);
    assert.equal(PLAN_DEFINITIONS.pro.limits.aiProductCreationsPerWeek, null);
    assert.equal(PLAN_DEFINITIONS.pro.limits.productCount, null);
    assert.equal(PLAN_DEFINITIONS.pro.limits.imagesPerProduct, 15);
    assert.equal(PLAN_DEFINITIONS.pro.limits.staffAccounts, 10);
    assert.equal(PLAN_DEFINITIONS.pro.limits.activityLogRetentionDays, 45);
    assert.equal(PLAN_DEFINITIONS.starter.features.scheduledSales, false);
    assert.equal(PLAN_DEFINITIONS.growth.features.scheduledSales, true);
    assert.equal(PLAN_DEFINITIONS.growth.features.scheduledProductPublishing, false);
    assert.equal(PLAN_DEFINITIONS.pro.features.scheduledProductPublishing, true);
});

test('legacy plan names normalize safely and unlimited is represented only by null', () => {
    assert.equal(normalizePlanKey('Growth Plan'), 'growth');
    assert.equal(normalizePlanKey('PRO'), 'pro');
    assert.equal(normalizePlanKey('legacy-free-plan'), 'starter');
    assert.equal(PLAN_DEFINITIONS.pro.limits.productCount, null);
    assert.equal(PLAN_DEFINITIONS.pro.limits.aiProductCreationsPerWeek, null);
    assert.doesNotMatch(JSON.stringify(PLAN_DEFINITIONS), /999999|Infinity|"-1"/);
});

test('weekly AI usage resets on Sunday at 00:00 UTC', () => {
    const { start, end } = getUtcWeekWindow(new Date('2026-07-08T18:45:00.000Z'));
    assert.equal(start.toISOString(), '2026-07-05T00:00:00.000Z');
    assert.equal(end.toISOString(), '2026-07-12T00:00:00.000Z');
    const boundary = getUtcWeekWindow(new Date('2026-07-12T00:00:00.000Z'));
    assert.equal(boundary.start.toISOString(), '2026-07-12T00:00:00.000Z');
});

test('activity log cutoffs match plan retention without affecting platform logs', () => {
    const now = new Date('2026-07-19T00:00:00.000Z');
    assert.equal(getActivityLogCutoff(7, now).toISOString(), '2026-07-12T00:00:00.000Z');
    assert.equal(getActivityLogCutoff(30, now).toISOString(), '2026-06-19T00:00:00.000Z');
    assert.equal(getActivityLogCutoff(45, now).toISOString(), '2026-06-04T00:00:00.000Z');
    assert.doesNotMatch(read('services/billing/activityLogRetentionService.js'), /PlatformAuditLog/);
});

test('Starter Store Builder keeps essential controls and hides advanced public sections', () => {
    assert.equal(STORE_BUILDER_CAPABILITIES.limited.basicBranding, true);
    assert.equal(STORE_BUILDER_CAPABILITIES.limited.basicHeader, true);
    assert.equal(STORE_BUILDER_CAPABILITIES.limited.standardHero, true);
    assert.equal(STORE_BUILDER_CAPABILITIES.limited.featuredProducts, true);
    assert.equal(STORE_BUILDER_CAPABILITIES.limited.advancedSections, false);
    const theme = {
        navigation: { announcement: 'Saved header' },
        typography: { headingFont: 'Inter' },
        homepageSections: [
            { id: 'featured', type: 'FeaturedProducts' },
            { id: 'reviews', type: 'Reviews' }
        ]
    };
    const publicTheme = getPublicThemeForPlan(theme, { storeBuilderAccess: 'limited' });
    assert.deepEqual(publicTheme.homepageSections.map(section => section.type), ['FeaturedProducts']);
    assert.equal(publicTheme.navigation.announcement, 'Saved header');
    assert.doesNotThrow(() => assertStoreBuilderUpdateAllowed({
        currentTheme: theme,
        incomingTheme: { navigation: { announcement: 'Updated header' }, typography: { headingFont: 'Arial' } },
        planAccess: { storeBuilderAccess: 'limited' }
    }));
    assert.throws(() => assertStoreBuilderUpdateAllowed({
        currentTheme: theme,
        incomingTheme: { layout: { container: 'wide' } },
        planAccess: { storeBuilderAccess: 'limited' }
    }), error => error.code === 'STORE_BUILDER_CAPABILITY_REQUIRED');
});

test('public plan serializer exposes only public pricing and plan comparison fields', () => {
    const plan = serializePublicPlan(PLAN_DEFINITIONS.growth);
    assert.equal(plan.price, '৳1,999');
    assert.equal(plan.highlighted, true);
    assert.match(plan.features.join(' | '), /50 AI products per week/);
    assert.match(plan.features.join(' | '), /Scheduled sales/);
    assert.equal(Object.hasOwn(plan, 'storeBuilderCapabilities'), false);
    assert.equal(Object.hasOwn(plan, 'prioritySupport'), false);
});

test('order pricing does not treat a missing scheduled-sale override as zero', () => {
    const line = buildOrderLineItem({
        product: {
            _id: 'product-1',
            title: 'Launch product',
            category: 'Test',
            collections: [],
            pricing: { sellingPrice: 1200, buyingPrice: 500, discount: 0 }
        },
        variant: {
            _id: 'variant-1',
            sku: 'SKU-1',
            attributes: [],
            pricing: { price: 1200, costPrice: 500 }
        },
        item: { quantity: 1 },
        unitPriceOverride: null
    });

    assert.equal(line.subtotal, 1200);
    assert.equal(line.orderItem.price, 1200);
});

test('restricted routes use backend plan features and quota middleware', () => {
    const adminRoutes = read('routes/adminRoutes.js');
    const builderRoutes = read('routes/storeBuilderRoutes.js');
    const badgeRoutes = read('routes/badgeRoutes.js');
    const salesRoutes = read('routes/scheduledSaleRoutes.js');
    assert.match(adminRoutes, /requireProductLimit/);
    assert.match(adminRoutes, /requireStaffLimit/);
    assert.match(adminRoutes, /requireShopFeature\('customerSection'\)/);
    assert.match(adminRoutes, /requireShopFeature\('notifications'\)/);
    assert.match(builderRoutes, /requireShopFeatureWhenCustomDomainChanges\('customDomain'\)/);
    assert.match(badgeRoutes, /requireShopFeature\('trustSystem'\)/);
    assert.match(salesRoutes, /requireShopFeature\('scheduledSales'\)/);
});
