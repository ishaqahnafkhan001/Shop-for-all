'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const legacy = require('@scaleup/storefront-theme');
const storage = require('@scaleup/storefront-theme/storage');
const { fixture, sizedFixture } = require('./fixtures/adaptive-builder/contract-fixtures.cjs');
const { preserveThemeExtensions } = require('../services/storeBuilder/themeCompatibilityService');
const candidate = graph => ({ ...legacy.normalizeTheme({}), version: 5, siteBuilder: graph || fixture() });

test('v5 reader is explicit; legacy version guards and default normalization remain v4', async () => {
    const cjs = storage;
    const esm = await import('@scaleup/storefront-theme/storage');
    for (const key of Object.keys(cjs)) assert.equal(esm[key], cjs[key]);
    assert.equal(legacy.THEME_SCHEMA_VERSION, 4);
    assert.throws(() => legacy.assertSupportedThemeVersion(candidate()));
    assert.equal(legacy.validateTheme(candidate()).valid, false);
    assert.equal(storage.validateStoredTheme(candidate()).valid, true);
    assert.deepEqual(storage.normalizeStoredTheme({}), legacy.normalizeTheme({}));
});
for (const count of [14, 80, 200]) test(`v5 ${count}-node graph survives normalization/compatibility without archival or truncation`, () => {
    const theme = candidate(sizedFixture(count)), before = JSON.stringify(theme);
    const normalized = storage.normalizeStoredTheme(theme);
    assert.deepEqual(normalized.siteBuilder, theme.siteBuilder);
    const persisted = preserveThemeExtensions(normalized, theme);
    assert.deepEqual(persisted.siteBuilder, theme.siteBuilder);
    assert.equal(persisted.extensions?.unknown?.siteBuilder, undefined);
    assert.equal(JSON.stringify(theme), before);
});
for (const version of [0, -1, 4.5, 6, 'bad']) test(`reader refuses unsupported version ${version}`, () => {
    assert.throws(() => storage.normalizeStoredTheme({ ...candidate(), version }), { code: 'UNSUPPORTED_THEME_VERSION' });
});
test('missing/malformed/unsafe/oversized graphs fail before normalization', () => {
    for (const graph of [null, {}, { ...fixture(), unexpected: true }, JSON.parse('{"__proto__":{}}')]) {
        assert.throws(() => storage.normalizeStoredTheme({ version: 5, siteBuilder: graph }), { code: 'INVALID_ADAPTIVE_THEME' });
    }
    assert.throws(() => storage.normalizeStoredTheme({ version: 5 }), { code: 'UNSUPPORTED_THEME_VERSION' });
    assert.throws(() => storage.normalizeStoredTheme({ version: 4, siteBuilder: fixture() }));
    assert.throws(() => storage.normalizeStoredTheme({ ...candidate(), extra: 'x'.repeat(262144) }));
});
test('v5 validates actual effective tokens, including after legacy color changes', () => {
    const theme = candidate();
    theme.siteBuilder.templates.tpl_checkout.nodes.core_tpl_checkout.styles = { base: { color: { token: 'foreground' }, background: { token: 'background' } } };
    assert.equal(storage.validateStoredTheme(theme).valid, true);
    theme.colors.foreground = '#ffffff'; theme.colors.background = '#ffffff';
    assert.equal(storage.validateStoredTheme(theme).valid, false);
});
test('typed reference discovery covers global/nested/saved records and ignores arbitrary strings', () => {
    const theme = candidate();
    const home = theme.siteBuilder.templates.tpl_home;
    home.nodes.story_image = { type: 'content.image', content: { assetId: '507f1f77bcf86cd799439011', alt: '' } };
    home.nodes.section_story.slots.body.push('story_image');
    home.nodes.products = { type: 'catalog.products', source: { kind: 'manualProducts', productIds: ['507f1f77bcf86cd799439012'] } };
    home.rootOrder.push('products');
    theme.siteBuilder.savedSections.saved = { name: 'Copy', pageKind: 'home', rootOrder: ['saved_image'], nodes: {
        saved_image: { type: 'content.image', content: { assetId: '507f1f77bcf86cd799439013', alt: 'Saved' } },
    } };
    theme.siteBuilder.templates.tpl_header.nodes.header_text = { type: 'content.text', content: { text: '507f1f77bcf86cd799439014' } };
    theme.siteBuilder.templates.tpl_header.rootOrder.push('header_text');
    assert.deepEqual(storage.collectAdaptiveReferences(theme), {
        assetIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439013'], productIds: ['507f1f77bcf86cd799439012'],
    });
});
test('future public projection excludes libraries, unused templates/presets and compatibility archives', () => {
    const theme = candidate();
    delete theme.siteBuilder.defaultTemplates.home;
    theme.siteBuilder.savedSections.saved = { name: 'Private library', pageKind: 'home', rootOrder: ['saved_text'], nodes: {
        saved_text: { type: 'content.text', content: { text: 'Private library text' } },
    } };
    theme.extensions = { unknown: { privateFixture: 'private' } };
    const projection = storage.projectAdaptiveTheme(theme);
    assert.equal(projection.templates.tpl_home, undefined);
    assert.equal(projection.savedSections, undefined);
    assert.equal(JSON.stringify(projection).includes('Private library'), false);
    assert.equal(projection.extensions, undefined);
    const effective = legacy.resolveEffectiveTheme(theme, { planAccess: { storeBuilderAccess: 'full' } });
    assert.equal(effective.siteBuilder, undefined);
    assert.equal(effective.extensions, undefined);
    assert.equal(effective.version, 4);
    assert.equal(storage.projectAdaptiveTheme({}), null);
});
test('adoption is unavailable even if Atelier and adaptive environment flags are on', () => {
    const policy = require('../services/storeBuilder/adaptivePersistencePolicy');
    const previous = process.env.ADAPTIVE_BUILDER_ROLLOUT;
    process.env.ADAPTIVE_BUILDER_ROLLOUT = 'on';
    try { assert.equal(policy.getAdaptiveAvailability().available, false); }
    finally { if (previous === undefined) delete process.env.ADAPTIVE_BUILDER_ROLLOUT; else process.env.ADAPTIVE_BUILDER_ROLLOUT = previous; }
});
