const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const { resolveEffectiveTheme, mergeThemePatch } = require('@scaleup/storefront-theme');
const { PREBUILT_THEMES } = require('@scaleup/storefront-theme/prebuilt');
const root = path.resolve(__dirname, '../../..');
let ui, React, render;
const evidence = [];

test.before(async () => {
    const filename = path.join(root, 'ecommerce-admin/parity-test.cjs');
    const req = Module.createRequire(filename);
    const { rolldown } = await import(pathToFileURL(req.resolve('rolldown')).href);
    const src = path.join(root, 'ecommerce-storefront/src').replaceAll('\\', '/');
    const builder = path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder').replaceAll('\\', '/');
    const bundle = await rolldown({ input: 'virtual:parity', platform: 'node',
        external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react'],
        resolve: { alias: { '@': src, '@scaleup/storefront-theme': path.join(root, 'packages/storefront-theme/index.mjs') } },
        plugins: [{ name: 'controlled-environment', resolveId(id) {
            if (id.startsWith('virtual:')) return id;
            if (id.endsWith('/StorefrontPreviewFrame.jsx')) return 'virtual:frame';
            if (id === 'next/link') return 'virtual:link';
            if (id === 'next/image') return 'virtual:image';
            if (id.includes('/api/api')) return 'virtual:api';
            if (id.includes('/context/CartContext')) return 'virtual:cart';
            if (id.includes('/context/AuthContext')) return 'virtual:auth';
            if (id.includes('/hooks/useStorefrontProductActions')) return 'virtual:actions';
            if (id.includes('/utils/analyticsTracker')) return 'virtual:analytics';
            if (id.includes('/components/search/SearchModal')) return 'virtual:search';
            return null;
        }, load(id) {
            if (id === 'virtual:parity') return `
                export * from '${builder}/StorefrontPreview.jsx';
                export * from '${builder}/themes/ThemeGallery.jsx';
                export * from '${builder}/StoreBuilderPreviewPanel.jsx';
                export {default as Provider} from '${src}/components/storefront/StorefrontThemeProvider.jsx';
                export {default as Navbar} from '${src}/components/storefront/Navbar.jsx';
                export {default as Footer} from '${src}/components/storefront/StorefrontFooter.jsx';
                export {default as Home} from '${src}/app/[subdomain]/StorefrontHomeClient.jsx';
                export {STOREFRONT_VIEWPORTS} from '${root.replaceAll('\\', '/')}/packages/storefront-renderer/viewports.js';
            `;
            // Only document mounting and external effects are substituted. Home,
            // useShopData initial-data preparation, provider and all markup are real.
            if (id === 'virtual:frame') return `export const StorefrontPreviewFrame = ({children}) => children;`;
            if (id === 'virtual:link') return `import React from 'react'; export default function Link({prefetch, children, ...props}) {return React.createElement('a', props, children)}`;
            if (id === 'virtual:image') return `export {NativeImage as default} from '@scaleup/storefront-renderer/presentation/Runtime';`;
            if (id === 'virtual:api') return `export default {get() {throw new Error('Parity tests must not perform network requests')}};`;
            if (id === 'virtual:cart') return `export const useCart = () => ({cartCount: 3});`;
            if (id === 'virtual:auth') return `export const useAuth = () => ({user: null});`;
            if (id === 'virtual:actions') return `export const useStorefrontProductActions = () => ({addProductToCart() {}, buyNow() {}, toggleWishlist() {}, isWishlisted: () => false, variantPicker: null});`;
            if (id === 'virtual:analytics') return `export const trackStorefrontEvent = () => {};`;
            if (id === 'virtual:search') return `export default () => null;`;
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

const product = (index, overrides = {}) => ({
    _id: `product-${index}`, slug: `product-${index}`, title: `Product ${index}`, category: 'Collection',
    images: [{ url: '/fixture-product.svg', alt: `Product image ${index}` }],
    pricing: { sellingPrice: 1000, discount: 10 }, totalStock: 4, averageRating: 4.5, numReviews: 3,
    ...overrides,
});
const products = [product(0, { finalPrice: 0 }), product(1, { totalStock: 0 }),
    product(2, { finalPrice: 450, compareAtPrice: 1000, scheduledSale: { discountType: 'percentage', discountValue: 50 } }),
    ...Array.from({ length: 9 }, (_, index) => product(index + 3))];
const content = {
    hero: { title: 'Controlled merchant hero', subtitle: 'Same revision and content', imageUrl: '/fixture-hero.svg' },
    footer: { text: 'Controlled merchant footer' },
    homepageSections: [
        { id: 'categories', type: 'CategoryList' },
        { id: 'featured', type: 'FeaturedProducts', settings: { productIds: ['product-11', 'product-0'] } },
        { id: 'collection', type: 'CollectionShowcase', settings: { productIds: ['product-11'] } },
        { id: 'story', type: 'BrandStory', settings: { text: 'Controlled story', imageUrl: '/fixture-story.svg' } },
        { id: 'reviews', type: 'Reviews', settings: { reviewIds: ['review-1'] } },
    ],
};
const reviews = [{ _id: 'review-1', name: 'Fixture buyer', rating: 5, comment: 'Controlled review', product: { title: 'Product 0' } }];
// Extract only the balanced presentation root, discarding editor chrome and React
// resource hints outside it. No text, classes, styles or attributes are normalized.
function presentation(html) {
    const start = html.indexOf('<div class="sf-presentation"');
    assert.ok(start >= 0, 'presentation root exists');
    const tail = html.slice(start);
    let depth = 0;
    for (const match of tail.matchAll(/<\/?div(?:\s[^>]*|)>/g)) {
        depth += match[0].startsWith('</') ? -1 : 1;
        if (!depth) return tail.slice(0, match.index + match[0].length);
    }
    throw new Error('Unbalanced presentation root');
}
const digest = html => createHash('sha256').update(html).digest('hex');
function equalMarkup(actual, expected, label) {
    if (actual === expected) return;
    let index = 0;
    while (index < actual.length && actual[index] === expected[index]) index++;
    assert.fail(`${label}: first mismatch at ${index}\npreview: ${actual.slice(Math.max(0, index - 100), index + 220)}\nlive: ${expected.slice(Math.max(0, index - 100), index + 220)}`);
}

for (const preset of PREBUILT_THEMES) for (const access of ['full', 'limited']) {
    test(`${preset.id}/${access}: Gallery full preview, Builder and live home produce identical presentation markup`, () => {
        const planAccess = { storeBuilderAccess: access };
        const theme = ui.buildPreviewTheme({ currentTheme: content, presetId: preset.id, planAccess });
        const context = { planAccess, shopName: 'Controlled shop', branding: { logoUrl: '/fixture-logo.svg' } };
        const resolved = resolveEffectiveTheme(theme, context);
        const selectedProducts = {}, selectedReviews = {};
        for (const section of resolved.homepageSections) {
            const ids = section.settings?.productIds || section.settings?.source?.productIds || [];
            if (ids.length) selectedProducts[section.id] = ids.map(id => products.find(product => product._id === id)).filter(Boolean);
            const reviewIds = section.settings?.reviewIds || [];
            if (reviewIds.length) selectedReviews[section.id] = reviewIds.map(id => reviews.find(review => review._id === id)).filter(Boolean);
        }
        const shop = { _id: 'tenant-fixture', themeRevision: 17, subdomain: 'preview', theme: resolved, ...context, storewideDiscount: 25,
            trustedBadge: { active: true, label: 'ScaleUp Trusted' }, shopVerification: { isVerified: true, label: 'Verified seller' } };
        const categories = [{ name: 'Collection', slug: 'collection', productCount: 12, coverImage: '/fixture-category.svg' }];
        const props = { theme, ...context, trustedBadge: shop.trustedBadge, shopVerification: shop.shopVerification,
            storewideDiscount: 25, device: 'desktop', availableProducts: products, availableCategories: categories, availableReviews: reviews,
            previewCatalog: { products: products.slice(0, 9), productsById: Object.fromEntries(products.map(product => [product._id, product])), pagination: { page: 1, pages: 2, total: 12 } } };
        const gallery = presentation(render(React.createElement(ui.ThemeGalleryPreview, { ...props, products, categories, reviews })));
        const builder = presentation(render(React.createElement(ui.StoreBuilderPreviewPanel, { ...props, mobileWorkspace: 'preview', previewPages: [],
            productCategories: ['Collection'], productCategoryDetails: categories })));
        const live = presentation(render(React.createElement(ui.Provider, { settings: shop, subdomain: 'preview' },
            React.createElement(ui.Navbar, { subdomain: 'preview' }),
            React.createElement(ui.Home, { subdomain: 'preview', initialData: { shop, products: products.slice(0, 9), categories: ['Collection'], categoryDetails: categories,
                sectionProducts: selectedProducts, sectionReviews: selectedReviews, pagination: props.previewCatalog.pagination } }),
            React.createElement(ui.Footer, { subdomain: 'preview' }))));
        equalMarkup(gallery, live, 'Gallery'); equalMarkup(builder, live, 'Builder');
        assert.ok(live.includes('Product 11'), 'off-page selected product is present');
        evidence.push({ preset: preset.id, access, revision: 17, schemaVersion: theme.version, gallery: digest(gallery), builder: digest(builder), live: digest(live) });
    });
}

test('empty stores do not acquire sample categories or an extra category composition slot in preview', () => {
    const theme = ui.buildPreviewTheme({ currentTheme: {}, presetId: 'modern-electronics', planAccess: { storeBuilderAccess: 'full' } });
    const html = render(React.createElement(ui.StorefrontPreviewContent, { theme, availableProducts: [], availableCategories: [] }));
    assert.doesNotMatch(html, /data-composition-slot="companion"/);
});

test('Gallery rejects unavailable plans instead of fabricating a preview', () => {
    for (const preset of PREBUILT_THEMES) assert.throws(() => ui.buildPreviewTheme({ currentTheme: content, presetId: preset.id, planAccess: { storeBuilderAccess: 'none' } }), /not available/);
});

test('new picker cards replace stale prices and excluded products without expanding the catalog page', () => {
    const theme = { homepageSections: [{ id: 'picked', type: 'FeaturedProducts', settings: { productIds: ['product-11'] } }] };
    const props = { theme, availableProducts: [product(11, { previewCard: product(11, { title: 'Fresh scheduled price', finalPrice: 0 }) })],
        previewCatalog: { products: [], productsById: { 'product-11': product(11, { title: 'Stale price' }) } } };
    const fresh = render(React.createElement(ui.StorefrontPreviewContent, props));
    assert.match(fresh, /Fresh scheduled price/); assert.doesNotMatch(fresh, /Stale price/);
    const removed = render(React.createElement(ui.StorefrontPreviewContent, { ...props, availableProducts: [product(11, { previewCard: null })] }));
    assert.doesNotMatch(removed, /Fresh scheduled price|Stale price|Product 11/);
});

test('mobile navigation uses live viewport anchoring and safe-area dimensions in the iframe', () => {
    const html = render(React.createElement(ui.StorefrontPreviewContent, { theme: { mobile: { showBottomNavigation: true } } }));
    assert.match(html, /fixed inset-x-0 bottom-0/);
    assert.doesNotMatch(html, /sticky bottom-0/);
    assert.match(html, /padding-bottom:max\(0\.5rem,\s*env\(safe-area-inset-bottom\)\)/);
});

test('project viewport dimensions are explicit and stable; responsive HTML uses real CSS breakpoints', () => {
    assert.deepEqual(ui.STOREFRONT_VIEWPORTS, { desktop: { width: 1180, height: 800 }, tablet: { width: 768, height: 800 }, mobile: { width: 390, height: 800 }, smallMobile: { width: 320, height: 800 } });
    const theme = mergeThemePatch({}, { mobile: { heroComposition: 'Image first' } });
    const outputs = Object.keys(ui.STOREFRONT_VIEWPORTS).map(device => presentation(render(React.createElement(ui.StorefrontPreview, { theme, device }))));
    outputs.forEach(output => equalMarkup(output, outputs[0], 'responsive document'));
    // SSR does not evaluate media queries; this is deliberately not four visual passes.
});

test.after(() => {
    if (process.env.THEME_PARITY_REPORT) fs.writeFileSync(process.env.THEME_PARITY_REPORT, JSON.stringify({
        kind: 'server-rendered markup, not browser pixels', viewports: ui?.STOREFRONT_VIEWPORTS, comparisons: evidence,
    }, null, 2) + '\n');
});
