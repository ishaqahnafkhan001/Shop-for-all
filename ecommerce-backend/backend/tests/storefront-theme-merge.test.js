const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const { mergeThemePatch, normalizeTheme } = require('@scaleup/storefront-theme');
const { PREBUILT_THEMES, resolvePrebuiltTheme } = require('@scaleup/storefront-theme/prebuilt');

let builder;
test.before(async () => {
    const root = path.resolve(__dirname, '../../..');
    const filename = path.join(root, 'ecommerce-admin/theme-merge-test.cjs');
    const adminRequire = Module.createRequire(filename);
    const { rolldown } = await import(pathToFileURL(adminRequire.resolve('rolldown')).href);
    const bundle = await rolldown({
        input: path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderThemeUtils.js'),
        platform: 'node',
        external: ['react', 'react/jsx-runtime', 'lucide-react'],
        resolve: { alias: { '@scaleup/storefront-theme': path.join(root, 'packages/storefront-theme/index.mjs') } },
    });
    try {
        const { output } = await bundle.generate({ format: 'cjs' });
        const compiled = new Module(filename, module);
        compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename);
        builder = compiled.exports;
    } finally {
        await bundle.close();
    }
});

test('partial nested Builder edits retain merchant siblings instead of reverting to defaults', () => {
    const base = builder.normalizeBuilderTheme({
        colors: { brand: { primary: '#123456', secondary: '#654321' } },
        paymentSettings: { providers: { stripe: true, paypal: true } },
        seo: { title: 'Merchant title', description: 'Merchant description', aiSuggestion: { generatedFromHash: 'saved-hash' } },
    });
    const result = builder.mergeTheme(base, {
        colors: { brand: { primary: '#abcdef' } },
        paymentSettings: { providers: { stripe: false } },
        seo: { description: 'Updated description', aiSuggestion: { acceptedOptionId: 'chosen' } },
    });
    assert.equal(result.colors.brand.secondary, '#654321');
    assert.equal(result.paymentSettings.providers.paypal, true);
    assert.equal(result.paymentSettings.providers.stripe, false);
    assert.equal(result.seo.title, 'Merchant title');
    assert.equal(result.seo.aiSuggestion.generatedFromHash, 'saved-hash');
    assert.equal(result.seo.aiSuggestion.acceptedOptionId, 'chosen');
});

test('raw patch distinguishes absence from explicit values without normalizing typing', () => {
    const base = { hero: { title: 'Old', subtitle: 'Kept', overlayOpacity: 25 }, mobile: { compactHeader: true } };
    const result = mergeThemePatch(base, { hero: { title: '', subtitle: undefined, overlayOpacity: 0 }, mobile: { compactHeader: false } });
    assert.deepEqual(result, { hero: { title: '', subtitle: 'Kept', overlayOpacity: 0 }, mobile: { compactHeader: false } });
    assert.deepEqual(mergeThemePatch({}, { hero: { title: 'Typing ' } }), { hero: { title: 'Typing ' } });
    assert.equal(builder.mergeTheme(undefined, { productCard: { style: 'Minimal' } }).productCard.shadow, 'None');
});

test('arrays replace atomically including empty values and inheritance metadata', () => {
    const base = { homepageSections: [{ id: 'old', settings: { text: 'old content' } }], hero: { bannerSlides: [{ id: 'old' }] },
        productCard: { inheritedStyleFields: ['shadow', 'titleWeight'] } };
    const patch = { homepageSections: [{ id: 'new' }], hero: { bannerSlides: [] }, productCard: { inheritedStyleFields: [] } };
    assert.deepEqual(mergeThemePatch(base, patch), patch);
});

test('null clears only existing nullable paths and cannot reset an entire group', () => {
    const base = { preset: { id: 'modern-general', version: 2, appliedAt: '2026-10-07T00:00:00.000Z' },
        hero: { title: 'Keep' }, seo: { title: 'Keep SEO', socialImageAssetId: 'asset', aiSuggestion: { inputSnapshot: { brand: 'Shop' } } } };
    const patch = { preset: null, hero: null, seo: { title: null, socialImageAssetId: null, aiSuggestion: { inputSnapshot: null } } };
    const result = mergeThemePatch(base, patch);
    assert.equal(result.preset, null);
    assert.deepEqual(result.hero, base.hero);
    assert.equal(result.seo.title, 'Keep SEO');
    assert.equal(result.seo.socialImageAssetId, null);
    assert.equal(result.seo.aiSuggestion.inputSnapshot, null);
    assert.equal(mergeThemePatch(base, { preset: { appliedAt: null } }).preset.appliedAt, null);
    assert.deepEqual(mergeThemePatch({}, { hero: null }), {});
});

test('partial card edits become explicit unless the patch supplies inheritance metadata', () => {
    const base = normalizeTheme({ productCard: { style: 'Minimal', inheritedStyleFields: ['shadow', 'titleWeight', 'buttonStyle'] } });
    const edited = builder.mergeTheme(base, { productCard: { titleWeight: '700' } });
    assert.deepEqual(edited.productCard.inheritedStyleFields, ['shadow', 'buttonStyle']);
    assert.equal(builder.mergeTheme(edited, { productCard: { style: 'Premium' } }).productCard.titleWeight, '700');
    const explicitList = builder.mergeTheme(base, { productCard: { shadow: 'Elevated', inheritedStyleFields: ['shadow'] } });
    assert.equal(explicitList.productCard.shadow, 'None');
});

test('patch results share no mutable objects with either input and ignore prototype keys', () => {
    const base = { hero: { title: 'Base', bannerSlides: [{ title: 'Slide' }] } };
    const patch = JSON.parse('{"hero":{"subtitle":"Updated","__proto__":{"polluted":true}},"constructor":{"prototype":{"polluted":true}}}');
    const before = JSON.stringify(base);
    const patchBefore = JSON.stringify(patch);
    const result = mergeThemePatch(base, patch);
    assert.equal(Object.hasOwn(result, 'constructor'), false);
    assert.equal(Object.hasOwn(result.hero, '__proto__'), false);
    assert.equal({}.polluted, undefined);
    result.hero.bannerSlides[0].title = 'Changed';
    result.hero.subtitle = 'Changed';
    assert.equal(JSON.stringify(base), before);
    assert.equal(JSON.stringify(patch), patchBefore);
    const cyclic = {};
    cyclic.self = cyclic;
    assert.throws(() => mergeThemePatch({}, { hero: cyclic }), /nesting depth/);
    assert.throws(() => mergeThemePatch({ hero: cyclic }, {}), /nesting depth/);
});

test('snapshot loads preserve the previous full-load behavior for sparse and saved themes', () => {
    const fixtures = [{}, { productCard: { style: 'Minimal' } }, { layout: { productColumnsDesktop: 5, productGap: 'Editorial' } },
        { hero: { imageUrl: '/legacy.webp' }, footer: { text: 'Saved' } },
        { productCard: { style: 'Minimal', shadow: 'Soft', inheritedStyleFields: [] } },
        ...PREBUILT_THEMES.map(preset => resolvePrebuiltTheme({ presetId: preset.id, appliedAt: '2026-10-07T00:00:00.000Z' }))];
    for (const snapshot of fixtures) {
        const previous = builder.normalizeBuilderTheme({ ...builder.defaultTheme, ...snapshot });
        assert.deepEqual(builder.loadBuilderTheme(snapshot), previous);
    }
});

test('normalizing after the merge keeps sanitization in force', () => {
    const result = builder.mergeTheme({ footer: { text: 'Keep' } }, { footer: { contactLabel: '<script>bad()</script>Contact', facebookUrl: 'javascript:alert(1)' } });
    assert.equal(result.footer.text, 'Keep');
    assert.equal(result.footer.contactLabel, 'Contact');
    assert.equal(result.footer.facebookUrl, '#');
});
