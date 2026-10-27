const assert = require('node:assert/strict');
const test = require('node:test');
const Shop = require('../models/Shop');
const { normalizeTheme, validateTheme, updateProductCardSetting } = require('@scaleup/storefront-theme');
const { resolvePrebuiltTheme, PREBUILT_THEMES } = require('@scaleup/storefront-theme/prebuilt');

const fields = ['shadow', 'titleWeight', 'buttonStyle'];
const inherited = (style = 'Minimal') => ({
    style, shadow: 'Soft', titleWeight: '800', buttonStyle: 'Solid', inheritedStyleFields: fields,
});

test('legacy card values remain explicit even when equal to another style default', () => {
    const card = normalizeTheme({ productCard: { style: 'Minimal', shadow: 'Soft', titleWeight: '800', buttonStyle: 'Solid' } }).productCard;
    assert.equal(card.shadow, 'Soft');
    assert.equal(card.titleWeight, '800');
    assert.equal(card.buttonStyle, 'Solid');
    assert.equal(Object.hasOwn(card, 'inheritedStyleFields'), false);
    assert.deepEqual(normalizeTheme({ productCard: card }).productCard, card);
});

test('explicit inheritance resolves style defaults over stale materialized values', () => {
    const theme = normalizeTheme({ productCard: inherited() });
    assert.equal(theme.productCard.shadow, 'None');
    assert.equal(theme.productCard.titleWeight, '700');
    assert.equal(theme.productCard.buttonStyle, 'Outline');
    assert.deepEqual(theme.productCard.inheritedStyleFields, fields);
    assert.deepEqual(normalizeTheme(theme), theme);
});

test('style selection resets only style-owned fields and does not mutate the input', () => {
    const card = normalizeTheme({ productCard: { showWishlist: false, imageFit: 'Cover', titleSize: 'Large' } }).productCard;
    const before = JSON.parse(JSON.stringify(card));
    const selected = updateProductCardSetting(card, 'style', 'Minimal');
    assert.equal(selected.shadow, 'None');
    assert.equal(selected.buttonStyle, 'Outline');
    assert.equal(selected.titleWeight, '700');
    assert.equal(selected.showWishlist, false);
    assert.equal(selected.imageFit, 'Cover');
    assert.equal(selected.titleSize, 'Large');
    assert.deepEqual(card, before);
    const modern = updateProductCardSetting(selected, 'style', 'Modern');
    assert.equal(modern.shadow, 'Soft');
    assert.equal(modern.buttonStyle, 'Solid');
    assert.equal(modern.titleWeight, '800');
});

test('an edit equal to the current default becomes an explicit override', () => {
    const initial = normalizeTheme({ productCard: inherited() }).productCard;
    const edited = updateProductCardSetting(initial, 'titleWeight', '700');
    assert.deepEqual(edited.inheritedStyleFields, ['shadow', 'buttonStyle']);
    const resolved = normalizeTheme({ productCard: { ...edited, style: 'Premium' } }).productCard;
    assert.equal(resolved.shadow, 'Elevated');
    assert.equal(resolved.titleWeight, '700');
    const reset = updateProductCardSetting(edited, 'inheritedStyleFields', fields);
    assert.deepEqual(reset.inheritedStyleFields, fields);
});

test('an empty inheritance list preserves every explicit style value', () => {
    const card = normalizeTheme({ productCard: { ...inherited(), inheritedStyleFields: [] } }).productCard;
    assert.equal(card.shadow, 'Soft');
    assert.equal(card.titleWeight, '800');
    assert.equal(card.buttonStyle, 'Solid');
    assert.deepEqual(card.inheritedStyleFields, []);
});

test('inheritance metadata survives schema validation, serialization, and hydration', () => {
    const theme = normalizeTheme({ productCard: inherited() });
    const shop = new Shop({ shopName: 'Card Shop', subdomain: 'card-shop', theme });
    assert.equal(shop.validateSync(), undefined);
    const hydrated = Shop.hydrate(JSON.parse(JSON.stringify(shop.toObject())));
    assert.deepEqual(normalizeTheme(hydrated.toObject().theme), theme);
    const legacy = Shop.hydrate({ shopName: 'Old Shop', subdomain: 'old-shop', theme: { productCard: { style: 'Minimal', shadow: 'Soft' } } });
    assert.equal(legacy.toObject().theme.productCard.inheritedStyleFields, undefined);
    assert.equal(normalizeTheme(legacy.toObject().theme).productCard.shadow, 'Soft');
});

test('invalid inheritance metadata cannot target unrelated properties', () => {
    for (const value of [null, 'shadow', ['showWishlist'], ['__proto__']]) {
        const validation = validateTheme({ productCard: { inheritedStyleFields: value } });
        assert.equal(validation.valid, false);
        assert.ok(validation.errors.some(error => error.path === 'productCard.inheritedStyleFields'));
    }
    const card = normalizeTheme({ productCard: { ...inherited(), inheritedStyleFields: ['shadow', 'shadow', 'showWishlist'], showWishlist: false } }).productCard;
    assert.deepEqual(card.inheritedStyleFields, ['shadow']);
    assert.equal(card.showWishlist, false);
});

test('applying a preset replaces prior card inheritance with the curated presentation', () => {
    for (const preset of PREBUILT_THEMES) {
        const appliedAt = '2026-10-07T00:00:00.000Z';
        const selected = resolvePrebuiltTheme({ presetId: preset.id, currentTheme: normalizeTheme({ productCard: inherited() }), appliedAt });
        const baseline = resolvePrebuiltTheme({ presetId: preset.id, appliedAt });
        assert.deepEqual(selected.productCard, baseline.productCard, preset.id);
    }
});
