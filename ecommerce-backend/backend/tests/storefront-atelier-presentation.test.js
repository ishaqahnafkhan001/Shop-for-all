const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const contract = require('@scaleup/storefront-theme');
const { resolvePrebuiltTheme } = require('@scaleup/storefront-theme/prebuilt');
const root = path.resolve(__dirname, '../../..');
let ui, React, render;
test.before(async () => {
    const filename = path.join(root, 'ecommerce-admin/atelier-presentation-test.cjs');
    const req = Module.createRequire(filename);
    const { rolldown } = await import(pathToFileURL(req.resolve('rolldown')));
    const renderer = path.join(root, 'packages/storefront-renderer').replaceAll('\\', '/');
    const builder = path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder').replaceAll('\\', '/');
    const bundle = await rolldown({ input: 'virtual:atelier', platform: 'node', external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react'],
        resolve: { alias: { '@scaleup/storefront-theme': path.join(root, 'packages/storefront-theme/index.mjs') } },
        plugins: [{ name: 'isolated-atelier', resolveId(id) {
            if (id.startsWith('virtual:')) return id;
            if (id.endsWith('/StorefrontPreviewFrame.jsx')) return 'virtual:frame';
            return null;
        }, load(id) {
            if (id === 'virtual:frame') return 'export const StorefrontPreviewFrame = ({children}) => children;';
            if (id === 'virtual:atelier') return `
                export * from '${builder}/StorefrontPreview.jsx';
                export * from '${builder}/themes/ThemeGallery.jsx';
                export * from '${builder}/themes/themeAvailability.js';
                export * from '${renderer}/reference/StorefrontProductCard.jsx';
                export * from '${renderer}/atelier/AtelierProductCard.jsx';
                export * from '${renderer}/atelier/AtelierHero.jsx';
                export * from '${renderer}/reference/referenceCore.jsx';
            `;
            return null;
        } }],
    });
    try {
        const { output } = await bundle.generate({ format: 'cjs' });
        const compiled = new Module(filename, module);
        compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename);
        ui = compiled.exports; React = req('react'); render = req('react-dom/server').renderToStaticMarkup;
    } finally { await bundle.close(); }
});
const theme = overrides => contract.normalizeTheme(contract.mergeThemePatch(resolvePrebuiltTheme({ presetId: 'atelier-editorial', appliedAt: '2026-10-20T00:00:00Z' }), overrides));
const product = { _id: 'fixture-product', title: 'Merchant product', category: 'Merchant category', images: ['/merchant.svg'], finalPrice: 0, compareAtPrice: 1200, totalStock: 0, averageRating: 4.5, numReviews: 3 };
const home = (candidate, props = {}) => render(React.createElement(ui.StorefrontPreviewContent, { theme: candidate, shopName: 'Merchant identity', availableProducts: [product], ...props }));

test('ordinary gallery contains exactly nine; trusted pilot metadata adds only the tenth candidate', () => {
    assert.equal(ui.getAvailableGalleryThemes().length, 9);
    assert.equal(ui.getAvailableGalleryThemes({ 'atelier-editorial': { available: false } }).length, 9);
    assert.equal(ui.getAvailableGalleryThemes({ 'atelier-editorial': { available: true } }).length, 10);
});

test('explicit marker selects shared shell/home/card views and real merchant data; removing it leaves legacy markup', () => {
    const candidate = theme({ hero: { bannerSlides: [{ id: 'merchant', title: 'Merchant campaign', desktopImage: '/merchant-hero.svg', primaryCtaText: 'Merchant action', primaryCtaLink: '/collections/merchant' }] } });
    const html = home(candidate);
    for (const value of ['atelier-header', 'atelier-hero', 'atelier-product-card', 'atelier-footer', 'Merchant identity', 'Merchant campaign', 'Merchant product', '/merchant-hero.svg', '/collections/merchant']) assert.ok(html.includes(value), value);
    assert.doesNotMatch(html, /FORM &amp; FOUND|COMPLIMENTARY DELIVERY|FREE DELIVERY OVER|BD \/ EN/);
    const legacy = home(contract.normalizeTheme({ ...candidate, presentationVariant: null }));
    assert.doesNotMatch(legacy, /class="atelier-|data-sf-presentation="atelier-editorial"/);
    assert.doesNotMatch(home({ ...candidate, presentationVariant: undefined }), /class="atelier-/);
});

test('zero price, discount, rating, stock and action visibility use the existing product model', () => {
    const html = render(React.createElement(ui.ProductCard, { product, index: 0, presentationVariant: 'atelier-editorial', productCard: theme().productCard, onProductAdd() {}, onProductBuyNow() {} }));
    assert.match(html, /৳ 0/);
    assert.match(html, /100% off/);
    assert.match(html, /4\.5/);
    assert.match(html, /3 reviews/);
    assert.match(html, /Out of stock/);
    assert.match(html, /disabled=""[^>]*aria-label="Unavailable Merchant product to cart"/);
    const hidden = render(React.createElement(ui.ProductCard, { product, presentationVariant: 'atelier-editorial', productCard: { showQuickBuy: false, showWishlist: false, showRating: false, showReviews: false, showStock: false }, onProductAdd() {} }));
    assert.doesNotMatch(hidden, /<button|Out of stock|reviews|4\.5/);
});

test('new card and hero views forward the parent callbacks without owning commerce or slide state', () => {
    const calls = [];
    const model = { cardColors: {}, cardAlignment: {}, price: 100, originalPrice: 100,
        canBuyNow: true, handleAdd: () => calls.push('cart'), handleBuyNow: () => calls.push('buy'), handleWishlist: () => calls.push('wishlist') };
    const card = ui.AtelierProductCard({ product, config: {}, model });
    const walk = element => { if (!element || typeof element !== 'object') return; if (element.type === 'button') element.props.onClick?.(); React.Children.forEach(element.props?.children, walk); };
    walk(card);
    assert.deepEqual(calls, ['wishlist', 'cart', 'buy']);
    const hero = ui.AtelierHero({ model: { activeHeroSlide: { title: 'Real title' }, hero: {}, hasMultipleHeroSlides: true, heroSlides: [{ id: 'one' }], activeHeroIndex: 0, onPrevious: () => calls.push('previous'), onNext: () => calls.push('next'), onSelect: () => calls.push('select') }, onPause: () => calls.push('pause') });
    walk(hero);
    assert.deepEqual(calls.slice(3), ['previous', 'select', 'next', 'pause']);
});

test('cleared hero copy/media/CTAs remain clear; empty optional content and zero categories collapse', () => {
    const html = home(theme({ hero: { bannerSlides: [{ id: 'clear', title: '', subtitle: '', desktopImage: '', mobileImage: '', primaryCtaText: '', primaryCtaLink: '', secondaryCtaText: '', secondaryCtaLink: '' }] }, homepageSections: [
        { id: 'categories', type: 'CategoryList' }, { id: 'story', type: 'BrandStory', settings: { text: '' } },
    ], allProducts: { isEnabled: false } }), { availableProducts: [], availableCategories: [] });
    assert.doesNotMatch(html, /atelier-hero-media|atelier-categories|atelier-story|Shop Now|Explore Collection/);
    assert.match(html, /class="sr-only">Merchant identity<\/h1>/);
    const clearedSlides = home(theme({ hero: { bannerSlides: [], title: 'Old legacy title', subtitle: 'Old legacy description' } }));
    assert.doesNotMatch(clearedSlides, /atelier-hero-copy|Old legacy title|Old legacy description/);
});

test('configured sections, ordering, visibility and optional legacy types remain in the same renderer', () => {
    const html = home(theme({ homepageSections: [
        { id: 'text', type: 'TextBlock', title: 'First merchant note', settings: { text: 'Merchant note body' } },
        { id: 'category', type: 'CategoryList', title: 'Second merchant category' },
        { id: 'faq', type: 'FAQ', title: 'Third merchant FAQ', settings: { text: 'Q: Fixture question\nA: Fixture answer' } },
        { id: 'newsletter', type: 'Newsletter', title: 'Fourth store update', settings: { text: 'Existing informational content' } },
        { id: 'hidden', type: 'TextBlock', title: 'Hidden merchant section', isEnabled: false },
    ] }), { availableCategories: [{ name: 'Merchant category', slug: 'merchant', coverImage: '/merchant-category.svg' }] });
    for (const title of ['First merchant note', 'Second merchant category', 'Third merchant FAQ', 'Fourth store update']) assert.ok(html.includes(title));
    assert.ok(html.indexOf('First merchant note') < html.indexOf('Second merchant category'));
    assert.ok(html.indexOf('Second merchant category') < html.indexOf('Third merchant FAQ'));
    assert.doesNotMatch(html, /Hidden merchant section|type="email"/);
    assert.match(html, /\/categories\/merchant/);
});

test('long Bengali/Latin merchant text is escaped, never converted to markup or demo identity', () => {
    const name = 'বাংলা দোকানের দীর্ঘ নাম & <script>unsafe</script>';
    const html = home(theme({ hero: { bannerSlides: [{ title: name }] } }), { shopName: name });
    assert.match(html, /বাংলা দোকানের দীর্ঘ নাম/);
    assert.doesNotMatch(html, /<script>unsafe/);
    assert.doesNotMatch(html, /FORM &amp; FOUND/);
});

test('existing catalog controls remain accessible and preview anchors prevent navigation', () => {
    const html = home(theme());
    for (const label of ['Search catalog', 'Sort products', 'Minimum price', 'Maximum price', 'In stock only', 'Clear Filter', 'Filter by 5 stars and up']) assert.ok(html.includes(label), label);
    const source = fs.readFileSync(path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx'), 'utf8');
    assert.match(source, /anchorProps\.onClick\?\.\(event\); event\.preventDefault\(\)/);
});

test('scoped stylesheet cannot affect legacy themes and licensed font is local', () => {
    const req = Module.createRequire(path.join(root, 'ecommerce-storefront/package.json'));
    const postcss = req('postcss');
    const css = fs.readFileSync(path.join(root, 'packages/storefront-renderer/atelier/atelier.css'), 'utf8');
    postcss.parse(css).walkRules(rule => {
        for (const selector of rule.selectors) assert.ok(selector.startsWith('.sf-presentation[data-sf-presentation="atelier-editorial"]'), selector);
    });
    assert.doesNotMatch(css, /!important|https?:\/\/|\bbody\b|:root/);
    assert.ok(fs.statSync(path.join(root, 'packages/storefront-renderer/fonts/dm-sans-variable.ttf')).size > 10000);
    assert.match(fs.readFileSync(path.join(root, 'packages/storefront-renderer/fonts/DM-Sans-OFL.txt'), 'utf8'), /SIL OPEN FONT LICENSE/);
    const style = ui.getReferenceThemeStyle(theme());
    assert.match(style['--sf-body-font'], /DM Sans/);
    assert.equal(Object.hasOwn(ui.getReferenceThemeStyle(contract.normalizeTheme({})), '--sf-atelier-max-width'), false);
});
