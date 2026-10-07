const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const contract = require('@scaleup/storefront-theme');
const { PREBUILT_THEMES, resolvePrebuiltTheme } = require('@scaleup/storefront-theme/prebuilt');
const Shop = require('../models/Shop');
const { preserveThemeExtensions } = require('../services/storeBuilder/themeCompatibilityService');
const { assertStoreBuilderUpdateAllowed } = require('../services/billing/storeBuilderPlanService');
const { normalizeTheme, resolveEffectiveTheme, createThemeInput, FALLBACK_THEME } = contract;
const root = path.resolve(__dirname, '../../..');
const plan = access => ({ storeBuilderAccess: access, features: { storeBuilder: access !== 'none', coupons: false } });
const branding = { logoUrl: '/logo.png', faviconUrl: '', heroTitle: 'Tenant A', heroSubtitle: '', heroImageUrl: '', heroCta: { label: '', url: '' }, heroHidden: false };

test('all new-store presentation defaults equal the shared contract; historical empty values survive', () => {
    const shop = new Shop({ shopName: 'Defaults', subdomain: 'defaults' });
    assert.deepEqual(normalizeTheme(shop.toObject().theme), normalizeTheme(FALLBACK_THEME));
    const old = Shop.hydrate({ shopName: 'Old', subdomain: 'old', theme: {} }).toObject().theme;
    assert.equal(old.allProducts.subtitle, '');
    assert.equal(old.homepageSections[0].title, 'Featured products');
    const explicit = new Shop({ theme: { allProducts: { subtitle: '' }, homepageSections: [] } }).toObject().theme;
    assert.equal(explicit.allProducts.subtitle, '');
    assert.deepEqual(explicit.homepageSections, []);
});

test('canonical layers distinguish omission, explicit default values, clears, and responsive values', () => {
    const stored = { hero: { title: '', overlayOpacity: 0 }, productCard: { showWishlist: false }, homepageSections: [],
        mobile: { compactHeader: false }, allProducts: { mobileColumns: 1 }, preset: null };
    const context = { defaults: { hero: { title: 'Default', subtitle: 'Inherited' }, productCard: { showWishlist: true },
        preset: { id: 'modern-general', version: 1 } }, overrides: { hero: { subtitle: undefined } } };
    const input = createThemeInput(stored, context);
    assert.equal(Object.hasOwn(input.overrides.hero, 'subtitle'), false);
    const resolved = resolveEffectiveTheme(stored, context);
    assert.equal(resolved.hero.title, '');
    assert.equal(resolved.hero.subtitle, 'Inherited');
    assert.equal(resolved.hero.overlayOpacity, 0);
    assert.equal(resolved.productCard.showWishlist, false);
    assert.deepEqual(resolved.homepageSections, []);
    assert.equal(resolved.mobile.compactHeader, false);
    assert.equal(resolved.allProducts.mobileColumns, 1);
    assert.equal(resolved.preset, null);
    assert.equal(resolveEffectiveTheme({ hero: { title: null } }, context).hero.title, 'Default');
});

test('legacy versions resolve without rewriting inputs or reapplying a preset over merchant edits', () => {
    for (const version of [undefined, 1, 2, 3, 4]) {
        const raw = { version, preset: { id: 'modern-general', version: 1 }, hero: { title: 'Merchant copy', imageUrl: '/old.jpg' },
            productCard: { style: 'Minimal', shadow: 'Soft' }, allProducts: { subtitle: '' } };
        const before = structuredClone(raw);
        const result = resolveEffectiveTheme(raw);
        assert.equal(result.version, 4);
        assert.equal(result.hero.bannerSlides[0].title, 'Merchant copy');
        assert.equal(result.productCard.shadow, 'Soft');
        assert.equal(result.allProducts.subtitle, '');
        assert.deepEqual(resolveEffectiveTheme(result), result);
        assert.deepEqual(raw, before);
    }
});

test('future schema versions remain identifiable on reads and are rejected for writes', () => {
    const future = { version: 5, hero: { title: 'Future' } };
    assert.equal(resolveEffectiveTheme(future).version, 5);
    assert.equal(contract.validateTheme(future).valid, false);
    assert.throws(() => contract.assertSupportedThemeVersion(future), { code: 'UNSUPPORTED_THEME_VERSION', statusCode: 409 });
    for (const version of [0, -1, 4.5, 'invalid']) assert.throws(() => contract.assertSupportedThemeVersion({ version }));
});

test('safe unknown root and nested fields survive strict schema round trips in an opaque archive', () => {
    const raw = { futureWidget: { label: 'Keep', enabled: false }, hero: { futureSpacing: 0 },
        homepageSections: [{ id: 'banner', type: 'Banner', futureField: 'retain', settings: { futureSetting: 'supported Mixed' } }] };
    const stored = normalizeTheme(preserveThemeExtensions(raw));
    const shop = new Shop({ shopName: 'Archive', subdomain: 'archive', theme: stored });
    assert.equal(shop.validateSync(), undefined);
    const loaded = Shop.hydrate(JSON.parse(JSON.stringify(shop.toObject()))).toObject().theme;
    assert.deepEqual(loaded.extensions.unknown.futureWidget, raw.futureWidget);
    assert.ok(loaded.extensions.schemaFields.some(field => field.path.join('.') === 'hero.futureSpacing' && field.value === 0));
    assert.ok(loaded.extensions.schemaFields.some(field => field.path.join('.') === 'homepageSections.0.futureField'));
    const olderWriter = preserveThemeExtensions({ hero: { title: 'Edit' } }, loaded);
    assert.deepEqual(olderWriter.extensions, loaded.extensions);
    assert.equal(resolveEffectiveTheme(loaded).extensions, undefined);
    assert.equal(loaded.homepageSections[0].settings.futureSetting, 'supported Mixed');
});

test('compatibility data cannot introduce prototype or Mongo operator keys', () => {
    const payload = JSON.parse('{"__proto__":{"polluted":true},"future":{"constructor":{"prototype":{"polluted":true}},"$where":"bad","a.b":1,"safe":0}}');
    const result = normalizeTheme(payload);
    assert.deepEqual(result.extensions.unknown.future, { safe: 0 });
    assert.equal({}.polluted, undefined);
});

test('all presets preserve presentation and responsive settings across plans and repeated resolution', () => {
    for (const preset of PREBUILT_THEMES) {
        const raw = resolvePrebuiltTheme({ presetId: preset.id, appliedAt: '2026-10-07T00:00:00Z' });
        const before = structuredClone(raw);
        for (const access of ['full', 'limited', 'none']) {
            const context = { planAccess: plan(access), branding, shopName: 'Tenant A' };
            const resolved = resolveEffectiveTheme(raw, context);
            assert.deepEqual(resolveEffectiveTheme(resolved), resolved, `${preset.id}/${access}`);
            assert.deepEqual(resolveEffectiveTheme(raw, context), resolved);
            if (access === 'full') {
                assert.deepEqual(resolved.colors, raw.colors);
                assert.deepEqual(resolved.layout, raw.layout);
                assert.deepEqual(resolved.mobile, raw.mobile);
                assert.deepEqual(resolved.homepageSections, raw.homepageSections);
            }
            if (access === 'limited') assert.ok(resolved.homepageSections.every(section => section.type === 'FeaturedProducts'));
            if (access === 'none') {
                assert.equal(resolved.hero.title, 'Tenant A');
                assert.equal(resolved.hero.bannerSlides[0].primaryCtaLink, '');
                assert.equal(resolved.header.variant, FALLBACK_THEME.header.variant);
            }
        }
        assert.deepEqual(raw, before);
    }
});

test('limited-plan canonical no-op saves pass, actual restricted changes still fail', () => {
    const currentTheme = { migrations: { bannerSectionsV1: false } };
    const incomingTheme = normalizeTheme({ migrations: { bannerSectionsV1: true } });
    // Matching section sources/order is a separate explicit contract.
    currentTheme.homepageSections = incomingTheme.homepageSections;
    assert.doesNotThrow(() => assertStoreBuilderUpdateAllowed({ currentTheme, incomingTheme, planAccess: plan('limited') }));
    assert.throws(() => assertStoreBuilderUpdateAllowed({ currentTheme, incomingTheme: { ...incomingTheme, header: { variant: 'centered' } }, planAccess: plan('limited') }), { code: 'STORE_BUILDER_CAPABILITY_REQUIRED' });
});

test('policy fallbacks are identical across Admin, storefront, and server; merchant text wins', async () => {
    const admin = await import(pathToFileURL(path.join(root, 'ecommerce-admin/src/utils/storeBuilderPolicies.js')).href);
    const storefront = await import(pathToFileURL(path.join(root, 'ecommerce-storefront/src/lib/defaultPolicies.js')).href);
    for (const name of ['Tenant A', 'Tenant B']) {
        const context = { storeName: name };
        assert.deepEqual(admin.buildDefaultPolicies(context), contract.buildDefaultPolicies(context));
        assert.deepEqual(storefront.buildDefaultPolicies(context), contract.buildDefaultPolicies(context));
        const resolved = resolveEffectiveTheme({ policies: { refund: 'Merchant refund text' } }, { shopName: name });
        assert.equal(resolved.policies.refund, 'Merchant refund text');
        assert.equal(resolved.policies.terms, admin.getDefaultPolicyText('terms', context));
    }
});

// Load the actual server adapter with only its environment services substituted.
const loadAdapter = (deps) => {
    const filename = path.join(root, 'ecommerce-backend/backend/services/storeBuilder/effectiveThemeService.js');
    const compiled = new Module(filename, module);
    compiled.require = id => deps[id] || require(id);
    compiled._compile(fs.readFileSync(filename, 'utf8'), filename);
    return compiled.exports;
};
test('public adapter and storefront facade resolve identically with tenant-scoped environment inputs', async () => {
    const calls = [];
    const { applyEffectiveStoreTheme } = loadAdapter({
        '../themeSectionService': { ensureThemeSectionArchitecture: async (shop, options) => { calls.push([shop._id, options.persist]); } },
        '../shops/storeBrandingService': { resolveStoreBranding: async shop => ({ ...branding, heroTitle: shop.shopName }) },
    });
    const storefront = await import(pathToFileURL(path.join(root, 'ecommerce-storefront/src/lib/theme.js')).href);
    for (const access of ['full', 'limited', 'none']) {
        for (const id of ['tenant-a', 'tenant-b']) {
            const shop = { _id: id, shopName: id, themeRevision: 7, storewideDiscount: 10, theme: { hero: { title: '' } } };
            const expected = resolveEffectiveTheme(shop.theme, { shopName: id, branding: { ...branding, heroTitle: id }, planAccess: plan(access) });
            await applyEffectiveStoreTheme(shop, plan(access));
            assert.deepEqual(shop.theme, expected);
            assert.deepEqual(storefront.normalizeTheme(shop.theme), expected);
            assert.equal(shop.storewideDiscount, 0);
            assert.equal(shop.themeRevision, 7);
        }
    }
    assert.deepEqual(calls, Array.from({ length: 3 }, () => [['tenant-a', false], ['tenant-b', false]]).flat());
});

test('actual public settings, shop-info and bootstrap handlers return identical effective themes for two tenants', async () => {
    const { applyEffectiveStoreTheme } = loadAdapter({
        '../themeSectionService': { ensureThemeSectionArchitecture: async () => {} },
        '../shops/storeBrandingService': { resolveStoreBranding: async shop => ({ ...branding, heroTitle: shop.shopName }) },
    });
    const cacheData = new Map();
    const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
    const chain = data => { const query = { select: () => query, sort: () => query, limit: () => query, lean: async () => structuredClone(data) }; return query; };
    const deps = {
        mongoose: require('mongoose'),
        '../models/Shop': { findById: id => {
            assert.ok(ids.includes(String(id)));
            return chain({ _id: id, shopName: id, themeRevision: 8, theme: { hero: { title: '' }, policies: { refund: 'Keep my refund policy' } } });
        } },
        '../models/Product': { aggregate: async () => [], countDocuments: async () => 0, distinct: async () => [] },
        '../models/Category': { find: () => chain([]) },
        '../models/Collection': { find: () => chain([]) },
        '../services/cacheService': { get: async key => structuredClone(cacheData.get(key)), set: async (key, data) => cacheData.set(key, structuredClone(data)) },
        '../services/storeBuilder/effectiveThemeService': { applyEffectiveStoreTheme },
        '../services/billing/planAccessService': { getShopPlanAccess: async () => plan('none') },
        '../services/shops/featureAccessService': { hasFeature: async () => false },
        '../services/verification/vendorVerificationStatusService': { buildPublicShopVerification: () => ({}) },
        '../services/sales/scheduledSaleService': { applyScheduledSalesToProducts: async ({ products }) => products },
        '../services/publicProductSerializer': { sanitizePublicProducts: data => data },
        '../services/categories/categoryService': { mergeCategoryDetails: () => [] },
        '../services/products/productQueryService': { normalizeSearchText: value => value || '' },
        '../utils/pagination': { buildPagination: () => ({}) },
    };
    const load = relative => {
        const filename = path.join(root, 'ecommerce-backend/backend/controllers', relative);
        const compiled = new Module(filename, module);
        compiled.require = id => deps[id] || {};
        compiled._compile(fs.readFileSync(filename, 'utf8'), filename);
        return compiled.exports;
    };
    const settings = load('storeBuilderController.js');
    const storefront = load('storeController.js');
    const invoke = async (handler, id) => {
        let result;
        const res = { status(code) { assert.equal(code, 200); return this; }, json(value) { result = value; return this; } };
        await handler({ tenantId: id, query: {} }, res);
        return result;
    };
    for (const id of ids) {
        const a = (await invoke(settings.getPublicStorefrontSettings, id)).data;
        const b = await invoke(storefront.getStoreInfo, id);
        const c = (await invoke(storefront.getStorefrontBootstrap, id)).data.shop;
        assert.deepEqual(a.theme, b.theme);
        assert.deepEqual(a.theme, c.theme);
        assert.equal(a.theme.hero.title, id);
        assert.equal(a.theme.policies.refund, 'Keep my refund policy');
        assert.equal(a.themeRevision, c.themeRevision);
        assert.deepEqual((await invoke(settings.getPublicStorefrontSettings, id)).data.theme, a.theme);
    }
    assert.equal(cacheData.size, 4);
});

test('actual Builder preview passes canonical themes to every renderer across presets and plan contexts', async () => {
    const filename = path.join(root, 'ecommerce-admin/preview-resolution-test.cjs');
    const adminRequire = Module.createRequire(filename);
    const { rolldown } = await import(pathToFileURL(adminRequire.resolve('rolldown')).href);
    const bundle = await rolldown({
        input: path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/StorefrontPreview.jsx'),
        platform: 'node', external: ['react', 'react/jsx-runtime', 'lucide-react'],
        resolve: { alias: { '@scaleup/storefront-theme': path.join(root, 'packages/storefront-theme/index.mjs') } },
        plugins: [{ name: 'capture-renderer-input',
            resolveId(id) { if (id === '@scaleup/storefront-renderer') return '\0renderer-probe'; },
            load(id) { if (id === '\0renderer-probe') return `
                import React from 'react';
                const probe = ({theme}) => React.createElement('script', {type:'application/json','data-theme-probe':'true'}, JSON.stringify(theme));
                export const ReferenceStorefrontHeader = probe, ReferenceStorefrontFooter = probe, ReferenceStorefrontHome = probe;
                export const REFERENCE_SAMPLE_CATEGORIES = [], REFERENCE_SAMPLE_PRODUCTS = [];
                export const getReferenceThemeStyle = () => ({});
            `; },
        }],
    });
    try {
        const { output } = await bundle.generate({ format: 'cjs' });
        const compiled = new Module(filename, module);
        compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename);
        const React = adminRequire('react');
        const { renderToStaticMarkup } = adminRequire('react-dom/server');
        for (const preset of PREBUILT_THEMES) for (const access of ['full', 'limited', 'none']) {
            const theme = resolvePrebuiltTheme({ presetId: preset.id, appliedAt: '2026-10-07T00:00:00Z' });
            const context = { branding, shopName: 'Tenant A', planAccess: plan(access) };
            const expected = resolveEffectiveTheme(theme, context);
            for (const device of ['desktop', 'tablet', 'mobile', 'smallMobile']) {
                const html = renderToStaticMarkup(React.createElement(compiled.exports.StorefrontPreview, { theme, device, ...context }));
                const probes = [...html.matchAll(/<script[^>]*data-theme-probe="true"[^>]*>(.*?)<\/script>/g)];
                assert.equal(probes.length, 3);
                for (const probe of probes) assert.deepEqual(JSON.parse(probe[1]), expected, `${preset.id}/${access}/${device}`);
            }
        }
    } finally { await bundle.close(); }
});
