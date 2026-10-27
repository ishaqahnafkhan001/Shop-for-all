'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readAdaptiveRollout, getAdaptiveAvailability } = require('../services/storeBuilder/adaptiveRolloutPolicy');
const shopId = 'a11111111111111111111111';
const config = { ADAPTIVE_BUILDER_ROLLOUT: 'pilot', ADAPTIVE_BUILDER_APPROVAL: 'synthetic-release-approval', ADAPTIVE_BUILDER_SHOP_IDS: shopId,
    ADAPTIVE_BUILDER_WRITES: 'on', ADAPTIVE_BUILDER_RENDERING: 'on' };
test('rollout defaults OFF and legacy on/partial/invalid configuration cannot grant access', () => {
    for (const env of [{}, { ...config, ADAPTIVE_BUILDER_ROLLOUT: 'on' }, { ...config, ADAPTIVE_BUILDER_APPROVAL: '' },
        { ...config, ADAPTIVE_BUILDER_SHOP_IDS: '' }, { ...config, ADAPTIVE_BUILDER_SHOP_IDS: `${shopId},garbage` },
        { ...config, ADAPTIVE_BUILDER_WRITES: 'true' }, { ...config, ADAPTIVE_BUILDER_ROLLOUT: 'off' }]) {
        const policy = readAdaptiveRollout(env); assert.equal(policy.writes, false); assert.equal(policy.rendering, false); assert.equal(policy.allows(shopId), false);
    }
});
test('pilot and wider rollout remain explicit; write and render kills are independent', () => {
    const pilot = readAdaptiveRollout(config); assert.equal(pilot.allows(shopId), true); assert.equal(pilot.allows('b11111111111111111111111'), false);
    assert.equal(readAdaptiveRollout({ ...config, ADAPTIVE_BUILDER_ROLLOUT: 'all' }).allows('b11111111111111111111111'), true);
    assert.equal(readAdaptiveRollout({ ...config, ADAPTIVE_BUILDER_WRITES: 'off' }).rendering, true);
    assert.equal(readAdaptiveRollout({ ...config, ADAPTIVE_BUILDER_RENDERING: 'off' }).writes, true);
    assert.notEqual(pilot.fingerprint, readAdaptiveRollout({ ...config, ADAPTIVE_BUILDER_RENDERING: 'off' }).fingerprint);
});
test('availability requires trusted active full access in addition to operator approval', t => {
    for (const [key, value] of Object.entries(config)) { const before = process.env[key]; t.after(() => before === undefined ? delete process.env[key] : process.env[key] = before); process.env[key] = value; }
    const full = { storeBuilderAccess: 'full', isOperational: true, shopOperational: true, features: { storeBuilder: true } };
    assert.equal(getAdaptiveAvailability({ shopId, planAccess: full }).available, true);
    for (const planAccess of [undefined, { ...full, storeBuilderAccess: 'none' }, { ...full, storeBuilderAccess: 'limited' },
        { ...full, isOperational: false }, { ...full, shopOperational: false }, { ...full, features: { storeBuilder: false } }]) assert.equal(getAdaptiveAvailability({ shopId, planAccess }).available, false);
    assert.equal(getAdaptiveAvailability().available, false);
});
