const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { FEATURE_KEYS, assertFeatureKey, getPlanFeatureValue } = require('../config/subscriptionFeatures');
const { PLAN_DEFINITIONS } = require('../config/subscriptionPlans');
const { normalizeThresholds } = require('../config/subscriptionUsage');
const { computeFeatureStatuses } = require('../services/shops/featureAccessService');
const { buildRichQuotaError } = require('../services/billing/quotaResponseService');
const { getCurrentUsageWarnings } = require('../services/billing/subscriptionWarningService');
const { subscribe, buildDomainEvent, publish } = require('../services/events/domainEventBus');
const { resolveAnalyticsType } = require('../services/billing/subscriptionAnalyticsService');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('subscription feature registry is the single typed plan capability source', () => {
    assert.ok(FEATURE_KEYS.includes('customDomain'));
    assert.ok(FEATURE_KEYS.includes('aiProductCreation'));
    assert.ok(FEATURE_KEYS.includes('platformBrandingRemoval'));
    assert.equal(getPlanFeatureValue(PLAN_DEFINITIONS.starter, 'customDomain'), false);
    assert.equal(getPlanFeatureValue(PLAN_DEFINITIONS.growth, 'customDomain'), true);
    assert.throws(() => assertFeatureKey('notAFeature'), error => error.code === 'UNKNOWN_SUBSCRIPTION_FEATURE');
});

test('feature statuses preserve disabling overrides but never let an override bypass a plan', () => {
    const activeShop = {
        isActive: true,
        approvalStatus: 'Approved',
        featureFlags: { customDomain: true, analytics: false }
    };
    const statuses = computeFeatureStatuses(activeShop, PLAN_DEFINITIONS.starter.features, 'active');
    assert.equal(statuses.customDomain.enabled, false);
    assert.equal(statuses.customDomain.reason, 'plan_disabled');
    assert.equal(statuses.analytics.enabled, false);
    assert.equal(statuses.analytics.reason, 'shop_override_disabled');
    assert.equal(statuses.storeBuilder.enabled, true);
});

test('usage thresholds are configurable and warnings expose backend-calculated usage', () => {
    assert.deepEqual(normalizeThresholds(['100', '80', '90', '80']), [80, 90, 100]);
    assert.deepEqual(normalizeThresholds(['bad', '0', '101']), [80, 90, 100]);
    const warnings = getCurrentUsageWarnings({
        planKey: 'growth',
        usage: {
            products: { used: 451, limit: 500, remaining: 49 },
            staff: { used: 1, limit: 3, remaining: 2 },
            aiGeneration: { used: 50, limit: 50, remaining: 0, resetsAt: '2026-07-26T00:00:00.000Z' }
        }
    });
    assert.deepEqual(warnings.map(item => [item.resource, item.threshold]), [
        ['products', 90],
        ['aiGeneration', 100]
    ]);
});

test('rich quota errors retain legacy fields and provide upgrade-ready data', () => {
    const result = buildRichQuotaError({
        context: { planKey: 'starter', planName: 'Starter' },
        resource: 'products',
        used: 100,
        limit: 100
    });
    assert.equal(result.code, 'PLAN_LIMIT_REACHED');
    assert.equal(result.errorCode, 'PRODUCT_LIMIT_REACHED');
    assert.deepEqual(result.usage, { used: 100, limit: 100, remaining: 0, unlimited: false });
    assert.equal(result.upgrade.recommended, 'growth');
    assert.equal(result.current, 100);
});

test('domain event bus supports ordered modular subscribers without business coupling', async () => {
    const eventType = `ArchitectureTest.${Date.now()}`;
    const calls = [];
    subscribe({ eventTypes: eventType, name: `${eventType}.late`, priority: 20, handler: async () => calls.push('late') });
    subscribe({ eventTypes: eventType, name: `${eventType}.early`, priority: 10, handler: async () => calls.push('early') });
    const event = buildDomainEvent(eventType, { shopId: 'shop-test' });
    const result = await publish(event);
    assert.deepEqual(calls, ['early', 'late']);
    assert.equal(result.errors.length, 0);
    assert.ok(event.eventId);
    assert.ok(event.correlationId);
});

test('subscription analytics maps business events without coupling to controllers', () => {
    assert.equal(resolveAnalyticsType({ type: 'PlanUpgraded' }), 'upgrade_successful');
    assert.equal(resolveAnalyticsType({ type: 'UsageChanged', metadata: { action: 'ai_generation' } }), 'ai_generation');
    assert.equal(resolveAnalyticsType({ type: 'UsageChanged', metadata: { action: 'product_created' } }), 'product_created');
});

test('usage, event, analytics, and immutable audit interfaces are mounted compatibly', () => {
    assert.match(read('app.js'), /\/api\/vendor\/billing/);
    assert.match(read('routes/billingRoutes.js'), /router\.get\('\/usage'/);
    assert.match(read('routes/billingRoutes.js'), /router\.get\('\/timeline'/);
    assert.match(read('routes/superAdminRoutes.js'), /\/subscription-timeline/);
    assert.match(read('routes/superAdminRoutes.js'), /\/subscription-analytics/);
    assert.match(read('models/SubscriptionAuditLog.js'), /immutable/);
    assert.match(read('services/billing/subscriptionEventHandlers.js'), /subscription\.analytics/);
    assert.match(read('services/billing/subscriptionEventHandlers.js'), /subscription\.audit/);
});
