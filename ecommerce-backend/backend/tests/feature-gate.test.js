const assert = require('node:assert/strict');
const test = require('node:test');

const {
    computeEffectiveFeatures
} = require('../services/shops/featureAccessService');
const {
    shouldRequireCustomDomainFeature
} = require('../middlewares/featureGate');

test('feature access uses plan defaults and denies explicit shop overrides', () => {
    const shop = {
        isActive: true,
        approvalStatus: 'Approved',
        featureFlags: {
            analytics: false,
            storeBuilder: true
        }
    };
    const planFeatures = {
        analytics: true,
        storeBuilder: true,
        coupons: true
    };

    const effective = computeEffectiveFeatures(shop, planFeatures);

    assert.equal(effective.analytics, false);
    assert.equal(effective.storeBuilder, true);
    assert.equal(effective.coupons, true);
});

test('feature access denies plan-disabled features even when shop flag is true', () => {
    const shop = {
        isActive: true,
        approvalStatus: 'Approved',
        featureFlags: {
            customDomain: true,
            staffAccounts: true
        }
    };
    const planFeatures = {
        customDomain: false,
        staffAccounts: true
    };

    const effective = computeEffectiveFeatures(shop, planFeatures);

    assert.equal(effective.customDomain, false);
    assert.equal(effective.staffAccounts, true);
});

test('feature access denies operational features for suspended shops', () => {
    const shop = {
        isActive: false,
        approvalStatus: 'Suspended',
        featureFlags: {
            analytics: true,
            storeBuilder: true,
            coupons: true
        }
    };

    const effective = computeEffectiveFeatures(shop, {
        analytics: true,
        storeBuilder: true,
        coupons: true
    });

    assert.equal(effective.analytics, false);
    assert.equal(effective.storeBuilder, false);
    assert.equal(effective.coupons, false);
});

test('feature access denies operational features for billing-suspended subscriptions', () => {
    const shop = {
        isActive: true,
        approvalStatus: 'Approved',
        featureFlags: {
            analytics: true,
            storeBuilder: true,
            coupons: true
        }
    };

    const effective = computeEffectiveFeatures(shop, {
        analytics: true,
        storeBuilder: true,
        coupons: true
    }, 'suspended');

    assert.equal(effective.analytics, false);
    assert.equal(effective.storeBuilder, false);
    assert.equal(effective.coupons, false);
});

test('store builder publish does not require custom domain feature unless domain changes', () => {
    assert.equal(shouldRequireCustomDomainFeature(undefined, { domain: '' }), false);
    assert.equal(shouldRequireCustomDomainFeature({ domain: '' }, { domain: '' }), false);
    assert.equal(shouldRequireCustomDomainFeature({ domain: 'shop.example.com' }, { domain: 'shop.example.com' }), false);
    assert.equal(shouldRequireCustomDomainFeature({ domain: 'SHOP.EXAMPLE.COM ' }, { domain: 'shop.example.com' }), false);
    assert.equal(shouldRequireCustomDomainFeature({ domain: 'new.example.com' }, { domain: 'shop.example.com' }), true);
    assert.equal(shouldRequireCustomDomainFeature({ domain: 'new.example.com' }, { domain: '' }), true);
});
