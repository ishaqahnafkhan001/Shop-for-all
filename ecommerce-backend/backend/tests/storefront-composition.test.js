const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const { HOMEPAGE_COMPOSITIONS, normalizeTheme, resolveEffectiveTheme, validateTheme, planHomepageComposition } = require('@scaleup/storefront-theme');
const { PREBUILT_THEMES, resolvePrebuiltTheme } = require('@scaleup/storefront-theme/prebuilt');
const { assertStoreBuilderUpdateAllowed } = require('../services/billing/storeBuilderPlanService');
const Shop = require('../models/Shop');
const representatives = { 'modern-electronics': 'discovery', 'luxury-jewellery': 'boutique', 'editorial-fashion': 'editorial' };
const product = { _id: '507f1f77bcf86cd799439011', title: 'Fixture product', slug: 'fixture-product', category: 'Jewellery', images: ['/product.webp'], pricing: { sellingPrice: 1200 }, variants: [{ stock: 5 }] };
const merchant = {
    hero: { title: 'Fixture hero', imageUrl: '/hero.webp', subtitle: 'Merchant copy', ctaLabel: 'Browse', ctaUrl: '#products' },
    homepageSections: [
        { id: 'categories', type: 'CategoryList', title: 'Fixture categories' },
        { id: 'story', type: 'BrandStory', title: 'Fixture story', settings: { text: 'Merchant story content', imageUrl: '/story.webp' } },
        { id: 'collection', type: 'CollectionShowcase', title: 'Fixture collection', settings: { productIds: [product._id] } },
        { id: 'extra', type: 'TextBlock', title: 'Fixture extra', settings: { text: 'Preserve this section' } },
    ],
};
const themeFor = id => resolvePrebuiltTheme({ currentTheme: merchant, presetId: id, appliedAt: '2026-10-08T00:00:00Z' });

test('all nine presets select a registered composition; three representatives select distinct structures', () => {
    for (const preset of PREBUILT_THEMES) {
        assert.ok(HOMEPAGE_COMPOSITIONS[preset.presentation.layout.homepageComposition]);
        assert.equal(themeFor(preset.id).layout.homepageComposition, representatives[preset.id] || 'standard');
    }
    assert.equal(new Set(Object.values(representatives)).size, 3);
});

test('old preset IDs and unknown composition values keep the legacy structure until explicit reapplication', () => {
    for (const id of Object.keys(representatives)) {
        const old = { ...merchant, preset: { id, version: 2 } };
        assert.equal(resolveEffectiveTheme(old).layout.homepageComposition, 'standard');
        assert.equal(themeFor(id).preset.version, 3);
    }
    for (const value of ['missing', '__proto__', 'constructor']) {
        assert.equal(normalizeTheme({ layout: { homepageComposition: value } }).layout.homepageComposition, 'standard');
        assert.equal(validateTheme({ layout: { homepageComposition: value } }).valid, false);
    }
});

test('composition survives strict persistence and respects existing plan boundaries', () => {
    for (const id of Object.keys(representatives)) {
        const theme = themeFor(id);
        const shop = new Shop({ shopName: 'Composition', subdomain: 'composition', theme });
        assert.equal(shop.validateSync(), undefined);
        assert.deepEqual(normalizeTheme(Shop.hydrate(JSON.parse(JSON.stringify(shop.toObject()))).toObject().theme), theme);
        const limited = resolvePrebuiltTheme({ currentTheme: merchant, presetId: id, planAccess: { storeBuilderAccess: 'limited' } });
        assert.equal(limited.layout.homepageComposition, 'standard');
        assert.equal(resolveEffectiveTheme(theme, { planAccess: { storeBuilderAccess: 'none' } }).layout.homepageComposition, 'standard');
        assert.throws(() => assertStoreBuilderUpdateAllowed({ currentTheme: normalizeTheme(merchant), incomingTheme: theme, planAccess: { storeBuilderAccess: 'limited' } }), { code: 'STORE_BUILDER_CAPABILITY_REQUIRED' });
    }
});

test('composition partition preserves every section once, original indexes and residual merchant order', () => {
    const sections = [...merchant.homepageSections, { ...merchant.homepageSections[1], id: 'second-story' }];
    const before = structuredClone(sections);
    for (const composition of Object.keys(HOMEPAGE_COMPOSITIONS)) {
        const planned = planHomepageComposition({ composition, sections });
        const entries = [...Object.values(planned.slots), ...planned.remaining];
        assert.deepEqual(entries.map(entry => entry.index).sort((a, b) => a - b), [0, 1, 2, 3, 4]);
        assert.deepEqual(planned.remaining.map(entry => entry.index), [...planned.remaining.map(entry => entry.index)].sort((a, b) => a - b));
        assert.deepEqual(sections, before);
    }
    const hidden = sections.map(section => ({ ...section, mobileSettings: { isVisible: false } }));
    assert.deepEqual(planHomepageComposition({ composition: 'boutique', sections: hidden }).slots, {});
    assert.deepEqual(planHomepageComposition({ composition: 'boutique', sections, isAvailable: () => false }).slots, {});
});

let Home;
let React;
let render;
test.before(async () => {
    const root = path.resolve(__dirname, '../../..');
    const filename = path.join(root, 'ecommerce-admin/composition-test.cjs');
    const adminRequire = Module.createRequire(filename);
    const { rolldown } = await import(pathToFileURL(adminRequire.resolve('rolldown')).href);
    const bundle = await rolldown({
        input: path.join(root, 'packages/storefront-renderer/reference/StorefrontHome.jsx'),
        platform: 'node', external: ['react', 'react/jsx-runtime', 'lucide-react'],
        resolve: { alias: { '@scaleup/storefront-theme': path.join(root, 'packages/storefront-theme/index.mjs') } },
    });
    try {
        const { output } = await bundle.generate({ format: 'cjs' });
        const compiled = new Module(filename, module);
        compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename);
        Home = compiled.exports.ReferenceStorefrontHome;
        React = adminRequire('react');
        render = adminRequire('react-dom/server').renderToStaticMarkup;
    } finally { await bundle.close(); }
});

test('actual representative home renders contain distinct hierarchy with one hero and each merchant section once', () => {
    const regions = { discovery: 'discovery-desk', boutique: 'curated-gallery', editorial: 'editorial-spread' };
    for (const [id, composition] of Object.entries(representatives)) {
        for (const previewDevice of [undefined, 'desktop', 'tablet', 'mobile', 'smallMobile']) {
            const html = render(React.createElement(Home, {
                theme: themeFor(id), products: [product], categories: ['Jewellery'], shopName: 'Fixture shop', previewDevice,
                editor: { onSelect: () => {} },
            }));
            assert.match(html, new RegExp(`data-homepage-composition="${composition}"`));
            assert.match(html, new RegExp(`data-composition-region="${regions[composition]}"`));
            assert.equal((html.match(/<h1\b/g) || []).length, 1);
            for (const section of merchant.homepageSections) {
                assert.equal((html.match(new RegExp(`data-builder-section="section:${section.id}"`, 'g')) || []).length, 1, `${id}/${previewDevice}/${section.id}`);
            }
            assert.match(html, /Merchant story content/);
            assert.match(html, /Fixture product/);
            assert.match(html, /Preserve this section/);
            if (['tablet', 'mobile', 'smallMobile'].includes(previewDevice)) {
                assert.doesNotMatch(html, /lg:grid-cols-\[minmax\(0,(?:1\.7|1\.6)fr\)_minmax\(0,1fr\)\]/);
            }
        }
    }
});

test('empty and hidden featured content does not reserve composition columns or create fake content', () => {
    for (const [id, composition] of Object.entries(representatives)) {
        const theme = themeFor(id);
        theme.homepageSections = theme.homepageSections.filter(section => ['CategoryList', 'CollectionShowcase'].includes(section.type));
        const html = render(React.createElement(Home, { theme, products: [], categories: [], shopName: 'Empty store' }));
        assert.match(html, new RegExp(`data-homepage-composition="${composition}"`));
        assert.doesNotMatch(html, /data-composition-slot="companion"|data-composition-region="curated-gallery"/);
        assert.doesNotMatch(html, /Fixture product|Merchant story content/);
    }
});

test('composition forwards existing commerce callbacks, data and editor selection without replacements', () => {
    const action = () => {};
    const Link = () => null;
    for (const id of Object.keys(representatives)) {
        const outer = Home({ theme: themeFor(id), products: [product], categories: ['Jewellery'],
            onProductAdd: action, onProductBuyNow: action, onWishlistToggle: action, onPageChange: action,
            LinkComponent: Link, editor: { onSelect: action } });
        const composition = outer.props.children;
        assert.equal(composition.props.catalog.props.catalogProducts[0], product);
        for (const key of ['onProductAdd', 'onProductBuyNow', 'onWishlistToggle', 'onPageChange']) assert.equal(composition.props.catalog.props[key], action);
        const section = composition.props.renderSection(composition.props.sections[0], 0);
        assert.equal(section.props.onProductAdd, action);
        assert.equal(section.props.onProductBuyNow, action);
        assert.equal(section.props.LinkComponent, Link);
        assert.equal(section.props.editor.onSelect, action);
    }
});
