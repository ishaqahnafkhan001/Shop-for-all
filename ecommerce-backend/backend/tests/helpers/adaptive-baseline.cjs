'use strict';

// Read-only capture. Deliberately has no snapshot-update switch or filesystem writes.
// The existing route harness replaces network, auth, analytics and provider effects.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const contract = require('@scaleup/storefront-theme');
const { PREBUILT_THEMES, resolvePrebuiltTheme } = require('@scaleup/storefront-theme/prebuilt');
const { capture: captureLegacy } = require('../fixtures/atelier-legacy/capture.cjs');
const { loadRoutes, root } = require('./atelier-routes.cjs');
const { loadBuilder } = require('./atelier-builder.cjs');

const sha256 = value => createHash('sha256').update(value).digest('hex');
// Sorted object keys make configuration digests independent of property insertion order.
// Arrays, text, CSS, attributes and raw SSR markup are never reordered/normalized.
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const digest = value => sha256(canonical(value));
const fileHash = relative => sha256(fs.readFileSync(path.join(root, relative)));
const appliedAt = '2026-10-20T00:00:00.000Z';
const content = {
    hero: { title: 'Controlled merchant hero', subtitle: 'Same revision and content', imageUrl: '/tests/fixtures/theme-media.svg' },
    footer: { text: 'Controlled merchant footer' },
    homepageSections: [
        { id: 'categories', type: 'CategoryList' },
        { id: 'featured', type: 'FeaturedProducts', settings: { productIds: ['product-1'] } },
        { id: 'story', type: 'BrandStory', settings: { text: 'Controlled story', imageUrl: '/tests/fixtures/theme-media.svg' } },
    ],
};
const accesses = ['full', 'limited', 'none'];
const cases = [
    ['product', 'normal'], ['product', 'zero'], ['product', 'soldout'], ['product', 'no-images'], ['product', 'long'],
    ['category', 'normal'], ['category', 'empty'], ['collection', 'normal'], ['collection', 'empty'],
    ['cart', 'normal'], ['cart', 'empty'], ['checkout', 'normal'], ['checkout', 'empty'],
    ['account', 'normal'], ['register', 'normal'], ['reset', 'normal'],
    ['dashboard', 'normal'], ['dashboard', 'empty'], ['profile', 'normal'], ['security', 'normal'], ['vendor', 'normal'],
    ['track', 'normal'], ['otp', 'normal'], ['otp', 'busy'], ['otp', 'otp-error'],
    ['policy', 'normal'], ['policy-refund', 'normal'], ['policy-shipping', 'normal'], ['policy-privacy', 'normal'], ['policy-terms', 'normal'],
    ['policy-index', 'normal'],
];
const legacyFiles = ['contracts.json', 'phase3-markup-sha256.json', 'phase4-markup-sha256.json']
    .map(name => 'ecommerce-backend/backend/tests/fixtures/atelier-legacy/' + name);
const fixtureFiles = ['atelier-route-data.js', 'atelier-route-runtime.jsx', 'atelier-route-cases.jsx', 'atelier-phase4-cases.jsx', 'theme-media.svg']
    .map(name => 'ecommerce-admin/tests/fixtures/' + name);
const styleFiles = [
    'packages/storefront-renderer/styles.css',
    'packages/storefront-renderer/atelier/atelier.css',
    'packages/storefront-renderer/atelier/atelier-pages.css',
    'ecommerce-storefront/src/app/globals.css',
    'packages/storefront-renderer/viewports.js',
];

async function captureBaseline() {
    const routes = await loadRoutes();
    const builder = await loadBuilder();
    // Footer copyright and any default dates must not drift with the wall clock.
    // Only this synthetic capture uses the fixed clock; always restore globals.
    const RealDate = Date;
    const previousTimezone = process.env.TZ;
    globalThis.Date = class extends RealDate {
        constructor(...args) { super(...(args.length ? args : [appliedAt])); }
        static now() { return RealDate.parse(appliedAt); }
    };
    process.env.TZ = 'UTC';
    try {
        const legacy = captureLegacy();
        const definitions = PREBUILT_THEMES.map(definition => ({ id: definition.id, version: definition.version, sha256: digest(definition) }));
        const atelierDefinition = PREBUILT_THEMES.find(definition => definition.id === 'atelier-editorial');
        const raw = resolvePrebuiltTheme({ presetId: atelierDefinition.id, currentTheme: content, appliedAt });
        const atelierSnapshot = {
            id: atelierDefinition.id, version: atelierDefinition.version, definition: atelierDefinition,
            rawPublishedSnapshot: JSON.parse(JSON.stringify(raw)), normalized: contract.normalizeTheme(raw),
            capabilities: Object.fromEntries(accesses.map(access => [access, contract.getThemeCapabilities(raw, { storeBuilderAccess: access })])),
            effective: Object.fromEntries(accesses.map(access => [access, contract.resolveEffectiveTheme(raw, { shopName: 'Fixture store', planAccess: { storeBuilderAccess: access } })])),
        };
        const configurations = {}, markup = {};
        for (const snapshot of [...legacy, atelierSnapshot]) {
            const id = snapshot.id;
            const theme = resolvePrebuiltTheme({ presetId: id, appliedAt: '2026-01-01T00:00:00Z' });
            const customized = contract.normalizeTheme(contract.mergeThemePatch(snapshot.rawPublishedSnapshot, {
                hero: { title: 'Merchant edit preserved', subtitle: 'বাংলা synthetic content' },
                productCard: { showRating: false, showReviews: false },
                mobile: { showBottomNavigation: false },
                colors: { checkout: { buttonBackground: '#123456' } },
            }));
            configurations[id] = {
                snapshotRef: id === 'atelier-editorial' ? '#/atelierSnapshot' : `../atelier-legacy/contracts.json#/${legacy.findIndex(item => item.id === id)}`,
                raw: digest(snapshot.rawPublishedSnapshot), normalized: digest(snapshot.normalized),
                capabilities: Object.fromEntries(accesses.map(access => [access, digest(snapshot.capabilities[access])])),
                effective: Object.fromEntries(accesses.map(access => [access, digest(snapshot.effective[access])])),
                customized: digest(customized), cssVariables: digest(contract.getThemeCssVars(customized)),
                serializedRawBytes: Buffer.byteLength(JSON.stringify(snapshot.rawPublishedSnapshot)),
            };
            const record = (key, html) => { markup[id + '/' + key] = { sha256: sha256(html), bytes: Buffer.byteLength(html) }; };
            const home = (candidate, device, empty = false) => builder.render(builder.React.createElement(builder.ui.StorefrontPreviewContent, {
                theme: candidate, device, shopName: 'Fixture store', planAccess: { storeBuilderAccess: 'full' },
                availableProducts: empty ? [] : routes.ui.fixtureProducts,
                availableReviews: [], availableCategories: empty ? [] : [{ name: 'Objects', slug: 'objects', coverImage: '/tests/fixtures/theme-media.svg', productCount: 4 }],
            }));
            for (const device of ['desktop', 'tablet', 'mobile', 'smallMobile']) record('home/' + device, home(snapshot.rawPublishedSnapshot, device));
            record('home/customized', home(customized, 'desktop'));
            record('home/empty', home(snapshot.rawPublishedSnapshot, 'desktop', true));
            for (const [page, scenario] of cases) {
                let element;
                if (page === 'policy-index') {
                    routes.ui.setFixtureEnvironment({ theme, tenant: 'atelier-test-a' });
                    element = await routes.ui.PolicyIndex({ params: Promise.resolve({ subdomain: 'atelier-test-a' }) });
                } else {
                    element = routes.React.createElement(['product', 'category', 'collection'].includes(page) ? routes.ui.Phase3Case : routes.ui.Phase4Case, { page, scenario, theme });
                }
                record(page + '/' + scenario, routes.render(element));
            }
        }
        const files = [...legacyFiles, ...fixtureFiles, ...styleFiles];
        return { definitions, configurations, atelierSnapshot, markup, fileHashes: Object.fromEntries(files.map(file => [file, fileHash(file)])) };
    } finally {
        globalThis.Date = RealDate;
        if (previousTimezone === undefined) delete process.env.TZ;
        else process.env.TZ = previousTimezone;
    }
}

module.exports = { captureBaseline, canonical, digest, sha256, cases, root, loadRoutes };
