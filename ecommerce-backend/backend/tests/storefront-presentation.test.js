const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const { resolvePrebuiltTheme, PREBUILT_THEMES } = require('@scaleup/storefront-theme/prebuilt');
const root = path.resolve(__dirname, '../../..');
const full = { storeBuilderAccess: 'full' };
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const product = { _id: 'fixture', title: 'Merchant product', category: 'Merchant category', images: [{ url: '/product.webp', alt: 'Merchant alt' }], pricing: { sellingPrice: 1000, discount: 10 }, variants: [{ _id: 'variant', isActive: true, attributes: [], inventory: { stock: 4 }, pricing: { price: 2000 } }] };
const currentTheme = { hero: { title: 'Merchant hero', imageUrl: '/hero.webp', subtitle: 'Merchant subtitle' }, homepageSections: [
    { id: 'category', type: 'CategoryList' }, { id: 'story', type: 'BrandStory', settings: { text: 'Merchant story' } },
    { id: 'collection', type: 'CollectionShowcase', settings: { productIds: ['fixture'] } },
] };
let ui, React, render;
test.before(async () => {
    const filename = path.join(root, 'ecommerce-admin/presentation-test.cjs');
    const adminRequire = Module.createRequire(filename);
    const { rolldown } = await import(pathToFileURL(adminRequire.resolve('rolldown')).href);
    const base = path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder').replaceAll('\\', '/');
    const shared = path.join(root, 'packages/storefront-renderer').replaceAll('\\', '/');
    const bundle = await rolldown({ input: 'virtual:presentation', platform: 'node', external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react'],
        resolve: { alias: { '@scaleup/storefront-theme': path.join(root, 'packages/storefront-theme/index.mjs') } },
        plugins: [{ name: 'fixture', resolveId: id => id === 'virtual:presentation' ? id : id.endsWith('/StorefrontPreviewFrame.jsx') ? 'virtual:frame' : null,
            load: id => id === 'virtual:frame' ? 'export const StorefrontPreviewFrame = ({children}) => children;' : id === 'virtual:presentation' ? `
                export * from '${base}/StorefrontPreview.jsx';
                export {default as Gallery} from '${base}/themes/ThemeGallery.jsx';
                export * from '${shared}/normalizeProduct.js';
                export * from '${shared}/media.js';
                export * from '${shared}/reference/referenceCore.jsx';
                export * from '${shared}/presentation/ProductDetailsView.jsx';
                export * from '${shared}/presentation/CartView.jsx';
                export * from '${shared}/presentation/CheckoutSections.jsx';
            ` : null }],
    });
    try {
        const { output } = await bundle.generate({ format: 'cjs' });
        const compiled = new Module(filename, module);
        compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename);
        ui = compiled.exports;
        React = adminRequire('react'); render = adminRequire('react-dom/server').renderToStaticMarkup;
    } finally { await bundle.close(); }
});

test('Gallery cards render all nine real compositions with merchant hero content and catalog', () => {
    const html = render(React.createElement(ui.Gallery, { open: true, currentTheme, planAccess: full, products: [product], categories: ['Merchant category'], reviews: [], shopName: 'Merchant shop' }));
    assert.equal((html.match(/data-homepage-composition=/g) || []).length, 9);
    assert.equal((html.match(/>Merchant hero<\/h1>/g) || []).length, 9);
    for (const composition of ['standard', 'discovery', 'editorial', 'boutique']) assert.match(html, new RegExp(`data-homepage-composition="${composition}"`));
    assert.match(html, /Merchant product/);
    assert.doesNotMatch(html, /theme-previews\/|data-preview-banner-source/);
});

test('all five Builder pages use live presentation for every preset, including explicit empty data', () => {
    const labels = { home: /data-homepage-composition=/, product: /Merchant product/, cart: /Your Cart/, checkout: /Customer Information/, policy: /Refund Policy/ };
    for (const preset of PREBUILT_THEMES) {
        const theme = resolvePrebuiltTheme({ presetId: preset.id, currentTheme, appliedAt: '2026-10-08T00:00:00Z' });
        for (const page of Object.keys(labels)) {
            const html = render(React.createElement(ui.StorefrontPreviewContent, { theme, planAccess: full, shopName: 'Merchant shop', previewPage: page, availableProducts: [product], availableCategories: ['Merchant category'] }));
            assert.match(html, labels[page], `${preset.id}/${page}`);
            assert.doesNotMatch(html, /4\.8 review preview|Premium product|2,190/);
        }
    }
    const emptyCart = render(React.createElement(ui.StorefrontPreviewContent, { theme: {}, previewPage: 'cart' }));
    assert.match(emptyCart, /Your cart is empty/);
    const emptyCheckout = render(React.createElement(ui.StorefrontPreviewContent, { theme: {}, previewPage: 'checkout' }));
    assert.match(emptyCheckout, /Add some products first/);
});

test('preview product selection includes collections and products beyond the old ten-item truncation', () => {
    const products = Array.from({ length: 12 }, (_, index) => ({ ...product, _id: `product-${index}`, title: `Product ${index}` }));
    const theme = { homepageSections: [{ id: 'late-product', type: 'CollectionShowcase', settings: { productIds: ['product-11'] } }] };
    const html = render(React.createElement(ui.StorefrontPreviewContent, { theme, planAccess: full, availableProducts: products }));
    assert.match(html, /Product 11/);
    assert.match(html, /Collection showcase/);
});

test('shared product transformation preserves zero prices, variant stock and the existing sale formula', () => {
    const normalized = ui.normalizeProduct(product);
    const view = ui.getProductPresentation(normalized, {});
    assert.equal(view.displayFinalPrice, 1800);
    assert.equal(view.displayStock, 4);
    const free = ui.normalizeProduct({ ...product, pricing: { sellingPrice: 0 }, variants: [] });
    assert.equal(free.finalPrice, 0);
    assert.equal(ui.getProductPresentation(free).displayFinalPrice, 0);
    assert.equal(ui.getImageUrlFromValue({ secure_url: '/image.webp' }), '/image.webp');
    assert.equal(ui.getProductImageAlt({ product, image: product.images[0] }), 'Merchant alt');
});

test('shared views forward live commerce callbacks without replacing them', () => {
    const calls = [];
    const add = () => calls.push('add'); const buy = () => calls.push('buy');
    const view = ui.ProductDetailsView({ product: ui.normalizeProduct(product), ...ui.getProductPresentation(ui.normalizeProduct(product)), quantity: 1, setQuantity: () => {}, handleAddToCart: add, handleBuyNow: buy });
    const walk = node => {
        if (!node || typeof node !== 'object') return;
        if (node.props?.['aria-label'] === `Add ${product.title} to cart`) node.props.onClick();
        if (node.props?.['aria-label'] === `Buy ${product.title} now`) node.props.onClick();
        React.Children.forEach(node.props?.children, walk);
    };
    walk(view);
    assert.deepEqual(calls, ['add', 'buy']);
    const submit = () => calls.push('submit');
    const shell = ui.CheckoutPageShell({ checkoutBranding: {}, onSubmit: submit });
    const findForm = node => {
        if (!node || typeof node !== 'object') return;
        if (node.type === 'form') assert.equal(node.props.onSubmit, submit);
        React.Children.forEach(node.props?.children, findForm);
    };
    findForm(shell);
});

test('presentation extraction leaves network, authentication, analytics and order creation in live adapters', () => {
    for (const name of fs.readdirSync(path.join(root, 'packages/storefront-renderer/presentation'))) {
        assert.doesNotMatch(read(`packages/storefront-renderer/presentation/${name}`), /from ['"](?:next\/|@\/)|API\.(get|post)|fetch\(/, name);
    }
    assert.match(read('ecommerce-storefront/src/app/[subdomain]/checkout/page.jsx'), /executePlaceOrder/);
    assert.match(read('ecommerce-storefront/src/components/product/ReviewSection.jsx'), /API\.post/);
    assert.match(read('ecommerce-storefront/src/components/product/ProductDetails.jsx'), /trackStorefrontEvent/);
    assert.match(read('ecommerce-storefront/src/hooks/useProductData.js'), /getProductPresentation\(product, selectedAttributes\)/);
});

test('shared styling contains provider aliases and local licensed fonts for both consumers', () => {
    const theme = resolvePrebuiltTheme({ presetId: 'modern-electronics' });
    const style = ui.getReferenceThemeStyle(theme);
    assert.equal(style['--sf-mobile-nav-offset'], 'calc(4rem + env(safe-area-inset-bottom))');
    assert.equal(style['--sf-surface'], theme.colors.productCard.background);
    assert.equal(style['--sf-body-font'], 'Roboto');
    for (const file of ['ecommerce-admin/src/index.css', 'ecommerce-storefront/src/app/globals.css']) {
        assert.match(read(file), /@import "@scaleup\/storefront-renderer\/styles.css"/);
    }
    const css = read('packages/storefront-renderer/styles.css');
    assert.match(css, /\.sf-mobile-action-bar/); assert.match(css, /\.sf-field/);
    assert.doesNotMatch(css, /fonts\.googleapis/);
    for (const family of ['Inter', 'Roboto']) {
        assert.ok(fs.statSync(path.join(root, `packages/storefront-renderer/fonts/${family.toLowerCase()}-variable.ttf`)).size > 100000);
        assert.match(read(`packages/storefront-renderer/fonts/${family}-OFL.txt`), /SIL OPEN FONT LICENSE/);
    }
});
