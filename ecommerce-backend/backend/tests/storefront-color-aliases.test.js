const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const { normalizeTheme, getThemeCssVars } = require('@scaleup/storefront-theme');
const { PREBUILT_THEMES, resolvePrebuiltTheme } = require('@scaleup/storefront-theme/prebuilt');
const Shop = require('../models/Shop');

let state;
let palettes;
test.before(async () => {
    state = await import(pathToFileURL(path.resolve(__dirname,
        '../../../ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderColorState.js')).href);
    const root = path.resolve(__dirname, '../../..');
    const filename = path.join(root, 'ecommerce-admin/color-palette-test.cjs');
    const adminRequire = Module.createRequire(filename);
    const { rolldown } = await import(pathToFileURL(adminRequire.resolve('rolldown')).href);
    const bundle = await rolldown({
        input: path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderColorConfig.js'),
        platform: 'node', external: ['react', 'react/jsx-runtime', 'lucide-react'],
        resolve: { alias: { '@scaleup/storefront-theme': path.join(root, 'packages/storefront-theme/index.mjs') } },
    });
    try {
        const { output } = await bundle.generate({ format: 'cjs' });
        const compiled = new Module(filename, module);
        compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename);
        palettes = compiled.exports;
    } finally {
        await bundle.close();
    }
});
const apply = (theme, updates) => normalizeTheme({ ...theme, colors: state.applyCompatibleColorUpdates(theme.colors, updates) });

test('foreground edits reach the authoritative text color and survive persistence', () => {
    const base = normalizeTheme({});
    const edited = apply(base, { foreground: '#a12345' });
    assert.equal(edited.colors.brand.secondary, '#a12345');
    assert.equal(getThemeCssVars(edited).colorGroups.brand.secondary, '#a12345');
    assert.deepEqual(edited.colors.productCard, base.colors.productCard);
    assert.deepEqual(edited.colors.header, base.colors.header);
    const shop = new Shop({ shopName: 'Colors', subdomain: 'colors', theme: edited });
    assert.equal(shop.validateSync(), undefined);
    assert.deepEqual(normalizeTheme(Shop.hydrate(JSON.parse(JSON.stringify(shop.toObject()))).toObject().theme), edited);
});

test('explicit nested colors win within an update regardless of key order', () => {
    const base = normalizeTheme({});
    const entries = [['primaryButtonBg', '#123456'], ['checkout', { buttonBackground: '#654321' }],
        ['foreground', '#112233'], ['brand', { secondary: '#332211' }]];
    const first = apply(base, Object.fromEntries(entries));
    const reversed = apply(base, Object.fromEntries([...entries].reverse()));
    assert.deepEqual(first, reversed);
    assert.equal(first.colors.checkout.buttonBackground, '#654321');
    assert.equal(first.colors.productCard.addToCartBackground, '#123456');
    assert.equal(first.colors.brand.secondary, '#332211');
    assert.equal(first.colors.foreground, '#332211');
});

test('nested text and price edits synchronize only unambiguous aliases', () => {
    const base = normalizeTheme({});
    const colors = state.setColorPathValue(base.colors, 'brand.secondary', '#123456');
    assert.equal(colors.foreground, '#123456');
    const price = state.setColorPathValue(colors, 'productCard.price', '#654321');
    assert.equal(price.priceColor, '#654321');
    const checkout = state.setColorPathValue(price, 'checkout.buttonBackground', '#987654');
    assert.equal(checkout.primaryButtonBg, base.colors.primaryButtonBg);
    assert.equal(checkout.productCard.addToCartBackground, base.colors.productCard.addToCartBackground);
    const header = state.setColorPathValue(checkout, 'header.text', '#112233');
    assert.equal(header.header.icon, base.colors.header.icon);
});

test('soft color alias precedence is deterministic and preserves the separate soft shade', () => {
    const base = normalizeTheme({});
    const first = apply(base, { accentSoft: '#334455', accentBg: '#ddeeff' });
    const second = apply(base, { accentBg: '#ddeeff', accentSoft: '#334455' });
    assert.deepEqual(first, second);
    assert.equal(first.colors.brand.soft, '#ddeeff');
    const edited = state.setColorPathValue(first.colors, 'brand.soft', '#abcdef');
    assert.equal(edited.accentBg, '#abcdef');
    assert.equal(edited.accentSoft, '#334455');
});

test('incomplete input is retained without propagating invalid aliases', () => {
    const base = normalizeTheme({}).colors;
    const flat = state.applyCompatibleColorUpdates(base, { foreground: '#12' });
    assert.equal(flat.foreground, '#12');
    assert.equal(flat.brand.secondary, base.brand.secondary);
    const nested = state.setColorPathValue(base, 'brand.secondary', '#12');
    assert.equal(nested.brand.secondary, '#12');
    assert.equal(nested.foreground, base.foreground);
    const conflict = state.applyCompatibleColorUpdates(base, { foreground: '#123456', brand: { secondary: '#12' } });
    assert.equal(conflict.brand.secondary, '#12');
    assert.equal(normalizeTheme({ colors: conflict }).colors.brand.secondary, '#123456');
});

test('no-op updates preserve all nine saved presets and explicit edits are localized', () => {
    for (const preset of PREBUILT_THEMES) {
        const theme = resolvePrebuiltTheme({ presetId: preset.id, appliedAt: '2026-10-07T00:00:00.000Z' });
        const before = JSON.stringify(theme);
        assert.deepEqual(apply(theme, {}), theme, preset.id);
        const edited = apply(theme, { foreground: '#456789' });
        assert.deepEqual(edited, { ...theme, colors: { ...theme.colors, foreground: '#456789', brand: { ...theme.colors.brand, secondary: '#456789' } } });
        assert.equal(JSON.stringify(theme), before);
    }
});

test('explicit palette choices override generated shades while nested choices remain authoritative', () => {
    const base = normalizeTheme({}).colors;
    const explicit = { accent: '#123456', priceColor: '#654321', primaryButtonBg: '#abcdef', checkout: { buttonBackground: '#987654' } };
    const colors = palettes.applyColorPalette(base, explicit);
    assert.equal(colors.productCard.price, '#654321');
    assert.equal(colors.productCard.addToCartBackground, '#abcdef');
    assert.equal(colors.checkout.buttonBackground, '#987654');
    for (const preset of palettes.colorPalettePresets) {
        const normalized = normalizeTheme({ colors: palettes.applyColorPalette(base, preset.colors) });
        if (preset.colors.foreground) assert.equal(normalized.colors.brand.secondary, preset.colors.foreground, preset.name);
        if (preset.colors.priceColor) assert.equal(normalized.colors.productCard.price, preset.colors.priceColor, preset.name);
        assert.equal(normalized.colors.productCard.addToCartBackground, preset.colors.primaryButtonBg, preset.name);
    }
});

test('generated brand colors retain the intentionally distinct checkout shade', () => {
    const generated = palettes.buildBrandColorSet('#123456');
    const result = state.applyCompatibleColorUpdates(normalizeTheme({}).colors, generated);
    assert.equal(result.checkout.buttonBackground, generated.checkout.buttonBackground);
    assert.notEqual(result.checkout.buttonBackground, result.productCard.addToCartBackground);
});
