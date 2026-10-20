const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const contract = require('@scaleup/storefront-theme');
const { PREBUILT_THEMES, resolvePrebuiltTheme } = require('@scaleup/storefront-theme/prebuilt');
const { resolveEffectiveTheme } = contract;
const Shop = require('../models/Shop');
const { preserveThemeExtensions } = require('../services/storeBuilder/themeCompatibilityService');
const { assertStoreBuilderUpdateAllowed } = require('../services/billing/storeBuilderPlanService');
const { ensureThemeSectionArchitecture } = require('../services/themeSectionService');
const root = path.resolve(__dirname, '../../..');
const full = { storeBuilderAccess: 'full' };
const product = { _id: '507f1f77bcf86cd799439013', title: 'Control fixture', sellingPrice: 100, finalPrice: 80, stock: 10, category: 'Tests', averageRating: 4.5, numReviews: 7, images: ['/fixture.svg'] };
let ui, React, render;
test.before(async () => {
    const filename = path.join(root, 'ecommerce-admin/control-wiring-test.cjs');
    const req = Module.createRequire(filename);
    const { rolldown } = await import(pathToFileURL(req.resolve('rolldown')).href);
    const base = path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder').replaceAll('\\', '/');
    const shared = path.join(root, 'packages/storefront-renderer').replaceAll('\\', '/');
    const bundle = await rolldown({ input: 'virtual:controls', platform: 'node', external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react'],
        resolve: { alias: { '@scaleup/storefront-theme': path.join(root, 'packages/storefront-theme/index.mjs'), '@': path.join(root, 'ecommerce-storefront/src') } },
        plugins: [{ name: 'controls', resolveId: id => id === 'virtual:controls' ? id : ['next/link', 'next/image', 'next/navigation'].includes(id) ? `virtual:${id}` : id.includes('useStorefrontProductActions') ? 'virtual:product-actions' : null,
            load: id => id === 'virtual:next/link' ? `import React from 'react'; export default function Link({children, prefetch, ...props}) { return React.createElement('a', props, children); }`
                : id === 'virtual:next/image' ? `import React from 'react'; export default function Image({fill, priority, unoptimized, ...props}) { return React.createElement('img', props); }`
                : id === 'virtual:next/navigation' ? `export const useParams = () => ({ subdomain: 'audit' }); export const useRouter = () => ({ push() {}, replace() {} }); export const usePathname = () => '/categories/audit'; export const useSearchParams = () => new URLSearchParams();`
                : id === 'virtual:product-actions' ? `export const useStorefrontProductActions = () => ({ addProductToCart() {}, buyNow() {}, toggleWishlist() {}, isWishlisted: () => false, variantPicker: null });`
                : id === 'virtual:controls' ? `
                export * from '${base}/storeBuilderThemeUtils.js';
                export * from '${base}/storeBuilderColorConfig.js';
                export * from '${base}/storeBuilderConstants.jsx';
                export * from '${base}/editors/BasicEditors.jsx';
                export * from '${base}/editors/ProductCardsEditor.jsx';
                export * from '${base}/StorefrontPreview.jsx';
                export * from '${shared}/reference/referenceCore.jsx';
                export * from '${shared}/designTokens.js';
                export * from '${shared}/normalizeProduct.js';
                export {default as CategoryPageClient} from '${root.replaceAll('\\', '/')}/ecommerce-storefront/src/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx';
                export {default as CollectionPageClient} from '${root.replaceAll('\\', '/')}/ecommerce-storefront/src/app/[subdomain]/collections/[slug]/CollectionPageClient.jsx';
                export {default as StorefrontThemeProvider} from '${root.replaceAll('\\', '/')}/ecommerce-storefront/src/components/storefront/StorefrontThemeProvider.jsx';
                export * from '${shared}/reference/StorefrontHeader.jsx';
                export * from '${shared}/reference/StorefrontHero.jsx';
                export * from '${shared}/reference/StorefrontProductCard.jsx';
                export * from '${shared}/reference/StorefrontSectionVariants.jsx';
                export * from '${shared}/presentation/CheckoutSections.jsx';
                export {default as VariantSelector} from '${shared}/presentation/VariantSelector.jsx';
            ` : null }],
    });
    try {
        const { output } = await bundle.generate({ format: 'cjs' });
        const compiled = new Module(filename, module);
        compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename);
        ui = compiled.exports; React = req('react'); render = req('react-dom/server').renderToStaticMarkup;
    } finally { await bundle.close(); }
});

const html = (Component, props) => render(React.createElement(Component, props));
const initialTheme = () => contract.normalizeTheme({ migrations: { bannerSectionsV1: true }, homepageSections: [] });
const card = settings => html(ui.ProductCard, { product, index: 0, productCard: settings, onProductAdd() {}, onProductBuyNow() {} });
const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)];

// These are actual service functions with only external I/O substituted. Real
// Mongoose schema casting/validation and JSON reload remain part of the boundary.
function memoryPublication(initial = initialTheme()) {
    const shopId = '507f1f77bcf86cd799439011';
    let stored = { _id: shopId, shopName: 'Control store', subdomain: 'control-store', theme: initial, themeRevision: 0, searchAliases: [] };
    let draft, revision;
    const json = value => JSON.parse(JSON.stringify(value));
    const query = value => ({ select() { return this; }, sort() { return this; }, skip() { return this; }, lean: async () => json(value) });
    const deps = {
        mongoose: { connection: {} },
        '@scaleup/storefront-theme': contract,
        '../../models/Shop': {
            findById: id => { assert.equal(id, shopId); return query(stored); },
            findOneAndUpdate: (filter, update) => {
                assert.equal(filter._id, shopId);
                const next = new Shop({ ...stored, ...update.$set });
                assert.equal(next.validateSync(), undefined);
                stored = json(next.toObject());
                return query(stored);
            },
        },
        '../../models/StoreBuilderDraft': {
            findOneAndUpdate: async (filter, update) => { assert.equal(filter.shop_id, shopId); draft = json({ _id: 'draft', ...update.$set }); return { ...draft, toObject: () => json(draft) }; },
            deleteOne: async filter => { assert.equal(filter.shop_id, shopId); draft = undefined; },
        },
        '../../models/StoreBuilderRevision': {
            deleteOne: async () => {},
            create: async records => { revision = json(records[0]); return [revision]; },
            find: filter => { assert.equal(filter.shop_id, shopId); return query([]); },
        },
        '../billing/planAccessService': { getShopPlanAccess: async () => full },
        '../billing/storeBuilderPlanService': { assertStoreBuilderUpdateAllowed },
        './themeCompatibilityService': { preserveThemeExtensions },
        './themeAvailabilityService': require('../services/storeBuilder/themeAvailabilityService'),
        './draftConcurrency': require('../services/storeBuilder/draftConcurrency'),
        '../themeSectionService': { ensureThemeSectionArchitecture: async (holder, options) => {
            assert.equal(holder.theme.migrations.bannerSectionsV1, true); // prevents legacy Banner DB query
            return ensureThemeSectionArchitecture(holder, options);
        } },
        '../policies/defaultPolicyTemplates': contract,
        './storeBuilderAssetService': { assertThemeAssetOwnership: async () => {}, attachAssetsToDraft: async () => {}, promotePublishedAssets: async () => {} },
        '../logger': { warn: (...args) => assert.fail(JSON.stringify(args)) },
    };
    const filename = path.join(root, 'ecommerce-backend/backend/services/storeBuilder/storeBuilderService.js');
    const compiled = new Module(filename, module);
    compiled.require = id => deps[id] || {};
    compiled._compile(fs.readFileSync(filename, 'utf8'), filename);
    return {
        async cycle(theme) {
            const saved = await compiled.exports.saveStoreBuilderDraft({ shopId, theme, basedOnRevision: stored.themeRevision, planAccess: full });
            assert.equal(saved.stale, false);
            const published = await compiled.exports.publishStoreBuilder({ shopId, theme: json(saved.theme), expectedRevision: stored.themeRevision });
            assert.equal(draft, undefined);
            assert.equal(revision.revision, published.themeRevision);
            assert.deepEqual(published.warnings, []);
            const reloaded = Shop.hydrate(json(stored)).toObject();
            return resolveEffectiveTheme(reloaded.theme, { planAccess: full, shopName: reloaded.shopName });
        },
    };
}

test('actual layout editor changes reach catalog overrides after draft, publication and reload', async () => {
    let theme = initialTheme();
    const setThemeGroup = (group, key, value) => { theme = ui.updateBuilderThemeSetting(theme, group, key, value); };
    const tree = ui.LayoutEditor({ theme, setThemeGroup, setTheme: fn => { theme = fn(theme); } });
    for (const [label, value] of [['Desktop product columns', '5'], ['Mobile product columns', '1'], ['Product gap', 'Compact']]) {
        const control = nodes(tree).find(node => node.props?.label === label);
        assert.ok(control, label); control.props.onChange({ target: { value } });
    }
    const reloaded = await memoryPublication().cycle(theme);
    assert.equal(reloaded.allProducts.desktopColumns, 5);
    assert.equal(reloaded.allProducts.mobileColumns, 1);
    assert.equal(reloaded.allProducts.spacing, 'Compact');
    const markup = html(ui.StorefrontPreviewContent, { theme: reloaded, planAccess: full, availableProducts: [product] });
    assert.match(markup, /2xl:grid-cols-5/); assert.match(markup, /grid-cols-1/); assert.match(markup, /gap-2\.5/);
    assert.match(markup, /aria-label="Buy Control fixture now"/);
});

test('every exposed nested color changes a resolved style after strict schema publication', async () => {
    const baseline = initialTheme();
    const originalStyles = ui.getReferenceThemeStyle(resolveEffectiveTheme(baseline));
    const publication = memoryPublication();
    for (const group of ui.colorSectionGroups) for (const field of group.fields) {
        const theme = { ...baseline, colors: ui.setColorPathValue(baseline.colors, field.path, '#123456') };
        const reloaded = await publication.cycle(theme);
        assert.equal(ui.getColorPathValue(reloaded.colors, field.path), '#123456', field.path);
        assert.notDeepEqual(ui.getReferenceThemeStyle(reloaded), originalStyles, field.path);
    }
});

test('card rating and review controls render independently and honor badge/border colors', async () => {
    const settings = { showRating: true, showReviews: false, colors: { saleBadgeText: '#123456', saleBadgeBackground: '#abcdef', border: '#765432' } };
    const theme = await memoryPublication().cycle({ ...initialTheme(), productCard: settings, colors: { productCard: settings.colors } });
    let markup = card({ ...theme.productCard, colors: theme.colors.productCard });
    assert.match(markup, /4\.5/); assert.doesNotMatch(markup, /7 reviews/);
    assert.match(markup, /background-color:#abcdef;color:#123456/);
    assert.match(markup, /--sf-card-border-color:#765432/);
    assert.doesNotMatch(markup.match(/<article[^>]*>/)[0], /;border-color:/);
    markup = card({ showRating: false, showReviews: true });
    assert.doesNotMatch(markup, /4\.5/); assert.match(markup, /7 reviews/);
    assert.doesNotMatch(card({ showRating: false, showReviews: false }), /7 reviews|4\.5/);
});

test('variant options consume all four configured chip tokens', () => {
    const markup = html(ui.VariantSelector, { availableAttributes: { Size: ['S', 'L'] }, selectedAttributes: { Size: 'S' }, variants: ['S', 'L'].map(value => ({ attributes: [{ name: 'Size', value }] })), onSelect() {} });
    for (const token of ['--sf-variant-chip-bg', '--sf-variant-chip-text', '--sf-variant-chip-selected-bg', '--sf-variant-chip-selected-text']) assert.ok(markup.includes(token), token);
});

test('actual product-card editor controls survive publication and change rendered cards', async () => {
    const cases = [
        ['Product card style', 'Minimal'], ['Product image fit', 'Cover'], ['Image aspect ratio', 'Portrait'],
        ['Product card corner roundness', 'Square'], ['Image corners', 'Square'], ['Shadow', 'Elevated'],
        ['Title size', 'Large'], ['Title weight', '600'], ['Price size', 'Large'], ['Button style', 'Outline'],
        ['Add-to-cart button shape', 'Pill'], ['Show category'], ['Show rating'], ['Show reviews'],
        ['Show stock'], ['Show discount badge'], ['Show quick buy'], ['Hover image zoom'], ['Show SKU'], ['Show wishlist button'],
    ];
    const base = initialTheme();
    const baseline = card(base.productCard);
    for (const [label, value] of cases) {
        let theme = structuredClone(base);
        const tree = ui.ProductCardsEditor({ theme,
            setThemeGroup: (group, key, value) => { theme = ui.updateBuilderThemeSetting(theme, group, key, value); },
            toggleThemeGroup: (group, key) => { theme = ui.updateBuilderThemeSetting(theme, group, key, !theme[group][key]); },
        });
        const control = nodes(tree).find(node => node.props?.label === label);
        assert.ok(control, label);
        control.props.onChange({ target: { value } });
        const loaded = await memoryPublication().cycle(theme);
        assert.notEqual(card(loaded.productCard), baseline, label);
    }
});

test('actual typography editor changes survive publication into heading and body tokens', async () => {
    let theme = initialTheme();
    const tree = ui.TypographyEditor({ theme, setThemeGroup: (group, key, value) => { theme = ui.updateBuilderThemeSetting(theme, group, key, value); } });
    for (const [label, value] of [['Heading font', 'Georgia'], ['Body font', 'Roboto'], ['Heading weight', '600']]) {
        nodes(tree).find(node => node.props?.label === label).props.onChange({ target: { value } });
    }
    const style = ui.getReferenceThemeStyle(await memoryPublication().cycle(theme));
    assert.equal(style['--sf-heading-font'], 'Georgia'); assert.equal(style['--sf-body-font'], 'Roboto'); assert.equal(style['--sf-heading-weight'], '600');
});

test('saved wide menu setting changes desktop dropdown composition without losing links', async () => {
    for (const megaMenu of [false, true]) {
        const theme = await memoryPublication().cycle({ ...initialTheme(), navigation: [{ label: 'Catalog', url: '/', megaMenu, children: [{ label: 'Shoes', url: '/?category=Shoes' }] }] });
        const markup = html(ui.ReferenceStorefrontHeader, { theme, shopName: 'Store' });
        assert.match(markup, new RegExp(`data-navigation-layout="${megaMenu ? 'mega' : 'dropdown'}"`));
        assert.match(markup, /Shoes/);
        if (megaMenu) assert.match(markup, /inset-x-4 grid grid-cols-2/);
    }
});

test('disabling the last hero slide stays disabled after publication without reviving legacy copy', async () => {
    const theme = await memoryPublication().cycle({ ...initialTheme(), hero: { title: 'Legacy offer', imageUrl: '/hero.jpg', bannerSlides: [{ id: 'only', enabled: false, title: 'Disabled offer', desktopImage: '/hero.jpg' }] } });
    assert.deepEqual(ui.getHeroSlides(theme.hero), []);
    const markup = html(ui.StorefrontHero, { theme, shopName: 'Store' });
    assert.match(markup, /sr-only/); assert.doesNotMatch(markup, /Disabled offer|<img|data-structural-variant/);
});

test('manual review source overrides selected reviews while selected mode keeps its fallback', () => {
    const props = { section: { settings: { text: 'Manual copy', mode: 'text' } }, reviews: [{ _id: 'review', comment: 'Selected copy' }], sectionLayout: { className: '', style: {} }, colors: {} };
    assert.doesNotMatch(html(ui.ReviewsVariantSection, props), /Selected copy/);
    assert.match(html(ui.ReviewsVariantSection, props), /Manual copy/);
    props.section.settings.mode = 'selectedReviews';
    assert.match(html(ui.ReviewsVariantSection, props), /Selected copy/);
    assert.match(html(ui.ReviewsVariantSection, { ...props, reviews: [] }), /Manual copy/);
});

test('every explicitly selected featured product is rendered after publication', async () => {
    const products = Array.from({ length: 6 }, (_, index) => ({ ...product, _id: `507f1f77bcf86cd79943902${index}`, title: `Selected product ${index}` }));
    const theme = await memoryPublication().cycle({ ...initialTheme(), allProducts: { isEnabled: false }, homepageSections: [{ id: 'selected', type: 'FeaturedProducts', settings: { source: { type: 'manual', productIds: products.map(item => item._id) } } }] });
    const markup = html(ui.StorefrontPreviewContent, { theme, planAccess: full, availableProducts: products });
    for (const item of products) assert.ok(markup.includes(`>${item.title}</h3>`), item.title);
    assert.equal((markup.match(/<article/g) || []).length, 6);
});

test('checkout mobile action consumes checkout colors and shape, and all page headings share typography', () => {
    const markup = html(ui.CheckoutMobileStickyBar, { totalAmount: 80, policyAccepted: true });
    for (const token of ['--sf-checkout-radius', '--sf-checkout-button-background', '--sf-checkout-button-text']) assert.ok(markup.includes(token));
    const css = fs.readFileSync(path.join(root, 'packages/storefront-renderer/styles.css'), 'utf8');
    assert.match(css, /\.sf-presentation :is\(h1, h2\)\s*\{[^}]*--sf-heading-font[^}]*--sf-heading-weight/);
    assert.match(css, /\.sf-checkout-page\s*\{[^}]*--sf-checkout-background/);
    assert.match(css, /\.sf-checkout-submit\s*\{[^}]*--sf-checkout-button-background/);
});

test('preview section toolbar retains original draft indices when plans filter earlier sections', () => {
    const theme = contract.normalizeTheme({ homepageSections: [{ id: 'story', type: 'BrandStory', settings: { text: 'Story' } }, { id: 'featured', type: 'FeaturedProducts', title: 'Featured Products', settings: { source: { type: 'manual', productIds: [product._id] } } }] });
    const markup = html(ui.StorefrontPreviewContent, { theme, planAccess: { storeBuilderAccess: 'limited' }, activeElement: 'section:featured', onSelectElement() {}, onToggleSectionVisibility() {}, availableProducts: [product] });
    assert.match(markup, /Hide Featured Products/);
    assert.doesNotMatch(markup, /Hide BrandStory|Hide Story/);
    assert.equal(ui.getSectionIndexFromSelection('section:featured', theme), 1);
    const changes = [];
    const editor = ui.createPreviewEditor({ theme, activeElement: 'section:featured', onSelectElement() {}, onToggleSectionVisibility: (...args) => changes.push(args) });
    const toolbar = editor.renderToolbar('section:featured');
    assert.equal(toolbar.props.sectionIndex, 1);
    const button = nodes(toolbar.type(toolbar.props)).find(node => node.props?.['aria-label'] === 'Hide Featured Products');
    button.props.onClick({ preventDefault() {}, stopPropagation() {} });
    assert.deepEqual(changes, [[1, false]]);
});

test('responsive editor commands survive schema publication and preserve explicit section overrides', async () => {
    let theme = contract.normalizeTheme({ ...initialTheme(), hero: { variant: 'split', title: 'Responsive hero', imageUrl: '/fixture.svg' } });
    const setThemeGroup = (group, key, value) => { theme = ui.updateBuilderThemeSetting(theme, group, key, value); };
    const mobile = ui.MobileEditor({ theme, setThemeGroup, toggleThemeGroup() {}, planAccess: full });
    for (const [label, value] of [['Mobile hero composition', 'Image first'], ['Mobile section spacing', 'Compact']]) {
        const control = nodes(mobile).find(node => node.props?.label === label);
        assert.ok(control); assert.ok(!control.props.disabled); control.props.onChange({ target: { value } });
    }
    const layout = ui.LayoutEditor({ theme, setThemeGroup });
    nodes(layout).find(node => node.props?.label === 'Tablet product columns').props.onChange({ target: { value: '4' } });
    theme = await memoryPublication().cycle(theme);
    assert.equal(theme.mobile.heroComposition, 'Image first');
    assert.equal(theme.mobile.sectionSpacing, 'Compact');
    assert.equal(theme.layout.productColumnsTablet, 4);
    assert.equal(theme.allProducts.tabletColumns, 4);
    assert.equal(ui.resolveFeaturedProductColumns({}, theme.layout).tablet, 4);
    assert.equal(ui.resolveFeaturedProductColumns({ desktopSettings: { tabletColumns: 1 } }, theme.layout).tablet, 1);
    assert.match(html(ui.StorefrontHero, { theme }), /data-mobile-composition="Image first"/);
    assert.equal(ui.getSectionLayout(theme.layout, theme.mobile).style['--sf-mobile-section-margin'], '24px');
    const explicit = ui.getSectionLayout({ ...theme.layout, sectionMarginTop: 17 }, theme.mobile);
    assert.equal(explicit.style.marginTop, '17px');
    assert.doesNotMatch(explicit.className, /sf-mobile-section-spacing/);
});

test('responsive defaults preserve legacy composition and derived featured tablet columns', async () => {
    const theme = await memoryPublication().cycle(initialTheme());
    assert.equal(theme.mobile.heroComposition, 'Theme');
    assert.equal(theme.mobile.sectionSpacing, 'Theme');
    assert.equal(theme.layout.productColumnsTablet, undefined);
    assert.equal(ui.resolveFeaturedProductColumns({}, { productColumnsDesktop: 5 }).tablet, 3);
    assert.doesNotMatch(ui.getSectionLayout(theme.layout, theme.mobile).className, /sf-mobile-section-spacing/);
    const overlay = ui.MobileEditor({ theme, setThemeGroup() {}, toggleThemeGroup() {}, planAccess: full });
    assert.equal(nodes(overlay).find(node => node.props?.label === 'Mobile hero composition').props.disabled, true);
    assert.doesNotMatch(html(ui.StorefrontHero, { theme }), /data-mobile-composition/);
});

test('invalid semantic responsive values are rejected and safely normalized on reads', () => {
    const input = { mobile: { heroComposition: 'invalid', sectionSpacing: 'invalid' } };
    const result = contract.validateTheme(input);
    assert.equal(result.valid, false);
    assert.equal(result.errors.filter(item => item.path.startsWith('mobile.')).length, 2);
    const theme = contract.normalizeTheme(input);
    assert.equal(theme.mobile.heroComposition, 'Theme'); assert.equal(theme.mobile.sectionSpacing, 'Theme');
});

test('one-column mobile grids remain one column until the tablet breakpoint', () => {
    const theme = contract.normalizeTheme({ layout: { productColumnsMobile: 1 }, allProducts: { mobileColumns: 1 }, homepageSections: [{ id: 'featured', type: 'FeaturedProducts' }] });
    const markup = html(ui.StorefrontPreviewContent, { theme, planAccess: full, availableProducts: [product, { ...product, _id: 'second' }] });
    assert.doesNotMatch(markup, /grid-cols-1 sm:grid-cols-2 md:grid-cols/);
    assert.match(markup, /grid-cols-1 md:grid-cols-2/);
});

// This established matrix exercises the nine merchant-available themes. Hidden
// candidates require explicit authorization in their separate adoption suite.
for (const preset of PREBUILT_THEMES.filter(theme => theme.status === 'active')) {
    test(`Phase 10 ${preset.name}: publication, customization, content and five page presentations`, async () => {
        const source = { ...initialTheme(), hero: { title: 'Audit merchant hero', subtitle: 'Audit merchant subtitle', imageUrl: '/fixture.svg' },
            footer: { text: 'Audit merchant footer' }, policies: { refund: 'Audit refund policy' },
            homepageSections: [{ id: 'audit-featured', type: 'FeaturedProducts', title: 'Audit picks', isEnabled: true, settings: { source: { type: 'manual', productIds: [product._id] } } },
                { id: 'audit-story', type: 'BrandStory', isEnabled: true, settings: { text: 'Audit merchant story', imageUrl: '/fixture.svg' } }],
        };
        const selected = resolvePrebuiltTheme({ presetId: preset.id, currentTheme: source, planAccess: full, appliedAt: '2026-10-09T00:00:00Z' });
        const publication = memoryPublication();
        const baseline = await publication.cycle(selected);
        assert.equal(baseline.preset.id, preset.id);
        assert.equal(baseline.preset.version, preset.version);
        assert.equal(baseline.layout.homepageComposition, selected.layout.homepageComposition);
        assert.equal(baseline.hero.title, 'Audit merchant hero');
        assert.equal(baseline.footer.text, 'Audit merchant footer');
        assert.equal(baseline.policies.refund, 'Audit refund policy');
        const before = ui.getReferenceThemeStyle(baseline);
        let edited = baseline;
        for (const [group, key, value] of [
            ['typography', 'headingFont', baseline.typography.headingFont === 'Georgia' ? 'Arial' : 'Georgia'],
            ['typography', 'headingWeight', '600'], ['layout', 'productColumnsMobile', 1],
            ['layout', 'productColumnsTablet', 4], ['layout', 'productGap', 'Compact'],
            ['mobile', 'sectionSpacing', 'Compact'], ['mobile', 'heroComposition', 'Image first'],
            ['productCard', 'buttonShape', 'Square'], ['productCard', 'showRating', true],
            ['productCard', 'showReviews', true], ['productCard', 'showStock', true],
            ['productCard', 'showDiscountBadge', true], ['checkoutBranding', 'buttonStyle', 'Pill'],
        ]) edited = ui.updateBuilderThemeSetting(edited, group, key, value);
        edited = { ...edited, colors: ui.setColorPathValue(edited.colors, 'productCard.addToCartBackground', '#123456') };
        const reloaded = await publication.cycle(edited);
        assert.equal(reloaded.preset.id, preset.id);
        assert.equal(reloaded.layout.homepageComposition, baseline.layout.homepageComposition);
        assert.equal(reloaded.header.variant, baseline.header.variant);
        assert.equal(reloaded.hero.variant, baseline.hero.variant);
        assert.deepEqual(reloaded.homepageSections, baseline.homepageSections);
        assert.equal(reloaded.allProducts.mobileColumns, 1);
        assert.equal(reloaded.allProducts.tabletColumns, 4);
        assert.equal(reloaded.allProducts.spacing, 'Compact');
        assert.equal(reloaded.mobile.heroComposition, 'Image first');
        assert.equal(reloaded.mobile.sectionSpacing, 'Compact');
        const after = ui.getReferenceThemeStyle(reloaded);
        assert.notEqual(after['--sf-heading-font'], before['--sf-heading-font']);
        assert.equal(after['--sf-heading-weight'], '600');
        assert.equal(after['--sf-product-card-add-to-cart-bg'], '#123456');
        const stockProduct = ui.normalizeProduct({ ...product, title: 'Audit stocked product', stock: 5 });
        const freeProduct = ui.normalizeProduct({ ...product, _id: '507f1f77bcf86cd799439015', title: 'Audit free product', finalPrice: 0, stock: 0 });
        const props = { theme: reloaded, planAccess: full, shopName: 'Audit store', availableProducts: [stockProduct, freeProduct], availableCategories: ['Tests'],
            availableReviews: [{ _id: '507f1f77bcf86cd799439016', product_id: product._id, name: 'Audit customer', rating: 4, comment: 'Audit verified review', createdAt: '2026-10-09T00:00:00Z' }] };
        for (const [page, expected] of Object.entries({ home: /Audit merchant hero/, product: /Audit stocked product/, cart: /Your Cart/, checkout: /Customer Information/, policy: /Audit refund policy/ })) {
            const markup = html(ui.StorefrontPreviewContent, { ...props, previewPage: page });
            assert.match(markup, expected, page);
            assert.match(markup, /Audit merchant footer/, page);
            assert.doesNotMatch(markup, /NaN|undefinedpx/, page);
            if (page === 'product') assert.match(markup, /Audit verified review/);
        }
        const cardProps = { index: 0, productCard: { ...reloaded.productCard, colors: reloaded.colors.productCard }, onProductAdd() {}, onProductBuyNow() {} };
        const stocked = html(ui.ProductCard, { ...cardProps, product: stockProduct });
        assert.match(stocked, /20% off/); assert.match(stocked, /7 reviews/); assert.match(stocked, /5 in stock/);
        const free = html(ui.ProductCard, { ...cardProps, product: freeProduct });
        assert.match(free, />৳ 0<\/p>/); assert.match(free, /Out of stock/);
        assert.match(free, /disabled=""/);
        assert.equal(ui.getPrice(freeProduct), 0);
        assert.match(html(ui.StorefrontPreviewContent, { ...props, previewPage: 'cart', availableProducts: [] }), /Your cart is empty/);
        const variantProduct = { ...product, stock: undefined, totalStock: undefined, variants: [{ isActive: true, inventory: { stock: 3 } }] };
        const routeProps = { shop: { theme: reloaded, shopName: 'Audit store', subdomain: 'audit' }, products: [variantProduct, freeProduct], category: 'Audit category', collection: { title: 'Audit collection' } };
        for (const Component of [ui.CategoryPageClient, ui.CollectionPageClient]) {
            const route = render(React.createElement(ui.StorefrontThemeProvider, { subdomain: 'audit', settings: routeProps.shop },
                React.createElement(Component, { ...routeProps, shop: { ...routeProps.shop, theme: initialTheme() } })));
            assert.match(route, /3 in stock/);
            assert.match(route, />৳ 0<\/p>/);
            assert.match(route, /grid-cols-1 md:grid-cols-4/);
            assert.doesNotMatch(route, /grid-cols-1 sm:grid-cols-2 md:grid-cols/);
            assert.match(route, /gap-2\.5/);
        }
    });
}

test('variant-only inventory and initial attributes exclude disabled and archived variants', () => {
    const variants = [
        { isActive: false, inventory: { stock: 20 }, attributes: [{ name: 'Size', value: 'Disabled' }] },
        { isActive: true, status: 'archived', inventory: { stock: 30 }, attributes: [{ name: 'Size', value: 'Archived' }] },
        { inventory: { stock: 3 }, attributes: [{ name: 'Size', value: 'Available' }] },
    ];
    const normalized = ui.normalizeProduct({ variants });
    assert.equal(normalized.stock, 3);
    assert.deepEqual(ui.getInitialAttributes(normalized), { Size: 'Available' });
    assert.deepEqual(ui.getProductPresentation(normalized).availableAttributes, { Size: ['Available'] });
    const unavailable = ui.normalizeProduct({ variants: variants.slice(0, 2) });
    assert.equal(unavailable.stock, 0);
    assert.deepEqual(ui.getInitialAttributes(unavailable), {});
    assert.equal(ui.normalizeProduct({ stock: 0, variants }).stock, 0);
});
