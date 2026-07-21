const assert = require('node:assert/strict');
const test = require('node:test');

const Shop = require('../../models/Shop');
const Subscription = require('../../models/Subscription');
const SubscriptionAnalyticsEvent = require('../../models/SubscriptionAnalyticsEvent');
const SubscriptionAuditLog = require('../../models/SubscriptionAuditLog');
const SubscriptionUsageWarning = require('../../models/SubscriptionUsageWarning');
const VendorPlan = require('../../models/VendorPlan');
const { getFeatureStatus } = require('../../services/shops/featureAccessService');
const { createLaunchSafetyContext } = require('../helpers/launchSafetyHarness');

test('feature evaluation, usage warnings, analytics, and audit timeline remain tenant-safe', async t => {
    const ctx = await createLaunchSafetyContext(t);
    const { shopA, shopB } = ctx.data.shops;
    const starter = await VendorPlan.findOne({ slug: 'starter' });
    starter.limits.productCount = 1;
    starter.productLimit = 1;
    await starter.save();

    await Promise.all([
        Subscription.updateOne({ shopId: shopA._id }, {
            $set: {
                planId: starter._id,
                activePlanName: starter.name,
                activePlanSlug: starter.slug,
                status: 'active'
            }
        }),
        Shop.updateOne({ _id: shopA._id }, {
            $set: {
                'plan.name': starter.name,
                'plan.activePlanSlug': starter.slug,
                'featureFlags.customDomain': true
            }
        })
    ]);

    const customDomain = await getFeatureStatus(shopA._id, 'customDomain');
    assert.equal(customDomain.enabled, false);
    assert.equal(customDomain.reason, 'plan_disabled');

    const vendor = ctx.vendorAClient();
    const usage = await vendor.get('/api/vendor/billing/usage');
    assert.equal(usage.status, 200);
    assert.equal(usage.body.plan, 'Starter');
    assert.deepEqual(usage.body.usage.products, {
        used: 1,
        limit: 1,
        remaining: 0,
        unlimited: false
    });
    assert.equal(usage.body.warnings[0].threshold, 100);

    const warningCount = await SubscriptionUsageWarning.countDocuments({ shopId: shopA._id, resource: 'products' });
    assert.equal(warningCount, 3);
    await vendor.get('/api/vendor/billing/usage');
    assert.equal(await SubscriptionUsageWarning.countDocuments({ shopId: shopA._id, resource: 'products' }), 3);

    const upgrade = await vendor.unsafePost('/api/admin/billing/events/upgrade-clicked', {
        planKey: 'growth',
        source: 'integration_test'
    });
    assert.equal(upgrade.status, 202);

    assert.ok(await SubscriptionAnalyticsEvent.exists({ shopId: shopA._id, eventType: 'upgrade_clicked' }));
    assert.ok(await SubscriptionAuditLog.exists({ shopId: shopA._id, eventType: 'UpgradeClicked' }));

    const vendorTimeline = await vendor.get('/api/admin/billing/timeline?limit=100');
    assert.equal(vendorTimeline.status, 200);
    assert.ok(vendorTimeline.body.data.length > 0);
    assert.equal(vendorTimeline.body.data.every(item => !item.actor?.email && !item.ip && !item.userAgent), true);
    assert.equal(vendorTimeline.body.data.every(item => String(item.shopId || shopA._id) !== String(shopB._id)), true);

    const superTimeline = await ctx.superAdminClient().get(`/api/super-admin/subscription-timeline?shopId=${shopA._id}&limit=100`);
    assert.equal(superTimeline.status, 200);
    assert.equal(superTimeline.body.data.every(item => String(item.shopId) === String(shopA._id)), true);

    const shopBTimeline = await ctx.vendorBClient().get('/api/admin/billing/timeline?limit=100');
    assert.equal(shopBTimeline.status, 200);
    assert.equal(shopBTimeline.body.data.some(item => String(item.shopId) === String(shopA._id)), false);
});
