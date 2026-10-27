'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { captureBaseline, digest, loadRoutes } = require('./helpers/adaptive-baseline.cjs');
const expected = require('./fixtures/adaptive-builder/baseline-manifest.json');
const legacy = require('./fixtures/atelier-legacy/contracts.json');
const { capture: captureLegacy } = require('./fixtures/atelier-legacy/capture.cjs');
const contract = require('@scaleup/storefront-theme');
let actual, routes;
test.before(async () => {
    const clock = Date, timezone = process.env.TZ;
    actual = await captureBaseline();
    assert.equal(Date, clock, 'capture restores the application clock');
    assert.equal(process.env.TZ, timezone, 'capture restores the process timezone');
    routes = await loadRoutes();
});

test('original nine full configuration snapshots remain exactly unchanged', () => assert.deepEqual(captureLegacy(), legacy));
test('all ten preset identities, versions and complete definition digests are frozen', () => {
    assert.equal(actual.definitions.length, 10);
    assert.equal(new Set(actual.definitions.map(theme => theme.id)).size, 10);
    assert.deepEqual(actual.definitions, expected.capture.definitions);
});
test('all ten raw, normalized, effective, plan, customized and CSS-variable configurations are frozen', () => {
    assert.deepEqual(actual.configurations, expected.capture.configurations);
    assert.deepEqual(actual.atelierSnapshot, expected.capture.atelierSnapshot);
});
test('synthetic data, original immutable expectations and responsive/style sources retain pinned bytes', () => {
    assert.deepEqual(actual.fileHashes, expected.capture.fileHashes);
});
test('all ten homepage, page and critical-state SSR cases retain exact markup and byte counts', () => {
    assert.equal(Object.keys(actual.markup).length, 370);
    for (const [key, snapshot] of Object.entries(expected.capture.markup)) assert.deepEqual(actual.markup[key], snapshot, key);
    assert.deepEqual(Object.keys(actual.markup), Object.keys(expected.capture.markup));
});
test('the 144 earlier page expectations are independently preserved within the expanded baseline', () => {
    for (const file of ['phase3-markup-sha256', 'phase4-markup-sha256']) {
        const frozen = require('./fixtures/atelier-legacy/' + file + '.json');
        for (const [key, sha256] of Object.entries(frozen)) assert.equal(actual.markup[key + '/normal'].sha256, sha256, key);
    }
});
for (const snapshot of legacy.concat(expected.capture.atelierSnapshot)) test(snapshot.id + ': existing purchase/variant callbacks and quantity constraints remain connected', () => {
    const changes = [], add = () => {}, buy = () => {}, select = () => {};
    const tree = routes.ui.ProductDetailsView({
        product: routes.ui.fixtureProducts[0], displayStock: 2, quantity: 1,
        setQuantity: update => changes.push(update), handleAddToCart: add, handleBuyNow: buy,
        handleVariantSelect: select, availableAttributes: {}, selectedAttributes: {},
        presentationVariant: contract.getStorefrontPresentationVariant(snapshot.rawPublishedSnapshot),
    });
    const nodes = [];
    const walk = node => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (!node || typeof node !== 'object') return;
        nodes.push(node); walk(node.props?.children);
    };
    walk(tree);
    nodes.find(node => node.props?.['aria-label'] === 'Decrease quantity').props.onClick();
    nodes.find(node => node.props?.['aria-label'] === 'Increase quantity').props.onClick();
    assert.equal(changes[0](1), 1); assert.equal(changes[1](2), 2);
    assert.ok(nodes.some(node => node.props?.onAddToCart === add && node.props?.onBuyNow === buy));
    assert.ok(nodes.some(node => node.props?.onSelect === select));
});
test('configuration capture is deterministic and never mutates the frozen input snapshots', () => {
    assert.equal(digest(legacy), expected.legacyConfigurationDigest);
    for (const snapshot of legacy.concat(expected.capture.atelierSnapshot)) {
        const before = digest(snapshot.rawPublishedSnapshot);
        contract.normalizeTheme(snapshot.rawPublishedSnapshot);
        contract.resolveEffectiveTheme(snapshot.rawPublishedSnapshot, { planAccess: { storeBuilderAccess: 'limited' } });
        assert.equal(digest(snapshot.rawPublishedSnapshot), before, snapshot.id);
    }
});
test('current v4 rejects future-version writes; this is not an implementation of v5 storage', () => {
    assert.equal(contract.THEME_SCHEMA_VERSION, 4);
    assert.throws(() => contract.assertSupportedThemeVersion({ version: 5 }), { code: 'UNSUPPORTED_THEME_VERSION', statusCode: 409 });
    assert.equal(contract.validateTheme({ version: 5 }).valid, false);
});
