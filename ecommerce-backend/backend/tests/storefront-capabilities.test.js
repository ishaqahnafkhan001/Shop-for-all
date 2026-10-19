const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const contract = require('@scaleup/storefront-theme');
const { PREBUILT_THEMES, resolvePrebuiltTheme } = require('@scaleup/storefront-theme/prebuilt');
const { assertStoreBuilderUpdateAllowed: assertAllowed } = require('../services/billing/storeBuilderPlanService');
const Shop = require('../models/Shop');
const { preserveThemeExtensions } = require('../services/storeBuilder/themeCompatibilityService');
const { getThemeCapabilities: capabilities, getThemePropertyCapability: property, normalizeTheme } = contract;
const root = path.resolve(__dirname, '../../..');
const full = { storeBuilderAccess: 'full' };
const limited = { storeBuilderAccess: 'limited' };
const none = { storeBuilderAccess: 'none' };
const themeFor = presetId => resolvePrebuiltTheme({ presetId, appliedAt: '2026-10-08T00:00:00Z' });

test('capabilities preserve every supported variant for all presets and isolate each result', () => {
    for (const preset of PREBUILT_THEMES) {
        const theme = themeFor(preset.id);
        const before = structuredClone(theme);
        const caps = capabilities(theme, full);
        assert.equal(caps.composition.id, theme.layout.homepageComposition);
        assert.equal(caps.composition.merchantSelectable, false);
        assert.deepEqual(caps.header.allowed, [...contract.STRUCTURAL_VARIANTS.header.values]);
        assert.deepEqual(caps.hero.allowed, [...contract.STRUCTURAL_VARIANTS.hero.values]);
        for (const [type, variants] of Object.entries(contract.STRUCTURAL_VARIANTS.sections)) {
            assert.deepEqual(caps.sections[type].variants.allowed, [...variants.values]);
        }
        caps.header.allowed.push('unregistered');
        caps.sections.Banner.editable = false;
        assert.equal(capabilities(theme, full).sections.Banner.editable, true);
        assert.equal(capabilities(theme, full).header.allowed.includes('unregistered'), false);
        assert.deepEqual(theme, before);
    }
});

test('property classification covers canonical groups, identity, inheritance, and responsive controls', () => {
    for (const key of contract.ALLOWED_THEME_KEYS) assert.ok(contract.THEME_CAPABILITY_RULES[key], key);
    const theme = normalizeTheme({ productCard: { inheritedStyleFields: ['shadow'] } });
    const context = { theme, planAccess: full };
    assert.equal(property('colors.brand.primary', context).classification, 'fully-customizable');
    assert.equal(property('header.variant', context).classification, 'partially-customizable');
    assert.equal(property('productCard.shadow', context).classification, 'inherited');
    assert.equal(property('layout.homepageComposition', context).classification, 'theme-controlled');
    assert.equal(property('header.logoPosition', context).merchantEditable, false);
    assert.equal(property('mobile.stickyCheckoutButton', context).merchantEditable, false);
    assert.equal(property('allProducts.mobileColumns', context).classification, 'responsive-only');
    assert.equal(property('homepageSections.0.title', context).classification, 'section-specific');
    assert.equal(property('homepageSections.0.mobileSettings.columns', context).classification, 'responsive-only');
    assert.equal(property('extensions.unknown.future', context).merchantEditable, false);
    assert.equal(property('layout.sectionPaddingTop', { theme, planAccess: limited }).allowedByPlan, false);
});

test('limited and no-builder controls agree with backend edit rules', () => {
    const current = normalizeTheme({ homepageSections: [
        { id: 'featured', type: 'FeaturedProducts', title: 'Featured Products', settings: { source: { type: 'manual', productIds: [] } } }, { id: 'story', type: 'BrandStory', settings: { text: 'Original' } },
    ] });
    const caps = capabilities(current, limited);
    assert.equal(caps.header.merchantSelectable, false);
    assert.equal(caps.sections.FeaturedProducts.editable, true);
    assert.equal(caps.sections.BrandStory.editable, false);
    assert.equal(caps.sectionStructure.editable, false);
    assert.equal(contract.getThemeEditorRestriction('mobile', { theme: current, planAccess: limited }), '');
    assert.equal(contract.getThemeEditorRestriction('sections', { theme: current, planAccess: limited, sectionIndex: 0 }), '');
    assert.ok(contract.getThemeEditorRestriction('sections', { theme: current, planAccess: limited, sectionIndex: 1 }));
    const edited = structuredClone(current);
    edited.colors.brand.primary = '#123456';
    edited.mobile.compactHeader = false;
    edited.homepageSections[0].title = 'Safe edit';
    assertAllowed({ currentTheme: current, incomingTheme: edited, planAccess: limited, completeSnapshot: true });
    for (const incomingTheme of [
        { ...current, header: { variant: 'centered' } },
        { ...current, layout: { ...current.layout, homepageComposition: 'boutique' } },
        { ...current, homepageSections: [...current.homepageSections].reverse().map((section, sortOrder) => ({ ...section, sortOrder })) },
        { ...current, homepageSections: current.homepageSections.map(section => ({ ...section, type: 'FeaturedProducts' })) },
    ]) {
        assert.throws(() => assertAllowed({ currentTheme: current, incomingTheme, planAccess: limited }), { code: 'STORE_BUILDER_CAPABILITY_REQUIRED' });
    }
    const converted = structuredClone(current);
    converted.homepageSections[1].type = 'FeaturedProducts';
    converted.homepageSections[1].settings.source = { type: 'manual', productIds: [] };
    assert.throws(() => assertAllowed({ currentTheme: current, incomingTheme: converted, planAccess: limited }),
        error => error.capability === 'advancedSections');
    assert.equal(capabilities(current, none).plan.access, 'none');
    assert.ok(contract.getThemeEditorRestriction('colors', { theme: current, planAccess: none }));
    assert.throws(() => assertAllowed({ currentTheme: current, incomingTheme: current, planAccess: none }), { code: 'FEATURE_NOT_INCLUDED' });
});

test('safe edits round trip all saved preset identities and permit explicit selection/restore on full plans', () => {
    for (const preset of PREBUILT_THEMES) {
        const current = themeFor(preset.id);
        const edited = normalizeTheme(contract.mergeThemePatch(current, { colors: { accent: '#112233' }, hero: { title: 'Merchant title' }, productCard: { borderRadius: 'Square' } }));
        assertAllowed({ currentTheme: current, incomingTheme: edited, planAccess: full, completeSnapshot: true });
        const saved = new Shop({ shopName: 'Capabilities', subdomain: 'capabilities', theme: edited });
        assert.equal(saved.validateSync(), undefined);
        const hydrated = normalizeTheme(Shop.hydrate(JSON.parse(JSON.stringify(saved.toObject()))).theme.toObject());
        assert.deepEqual(hydrated.preset, current.preset);
        assert.equal(hydrated.layout.homepageComposition, current.layout.homepageComposition);
        assert.equal(hydrated.hero.title, 'Merchant title');
        assertAllowed({ currentTheme: edited, incomingTheme: current, planAccess: full, completeSnapshot: true });
        assertAllowed({ currentTheme: edited, incomingTheme: themeFor('editorial-fashion'), planAccess: full, completeSnapshot: true });
        assertAllowed({ currentTheme: current, incomingTheme: current, planAccess: limited, completeSnapshot: true });
    }
    const legacy = { preset: { id: 'modern-electronics', version: 2 } };
    assert.equal(capabilities(legacy, full).composition.id, 'standard');
    assert.equal(normalizeTheme(legacy).layout.homepageComposition, 'standard');
});

test('snapshot validation prevents omitted restricted fields from silently resetting a saved composition', () => {
    const current = themeFor('modern-electronics');
    const incoming = normalizeTheme({ hero: { title: 'Only this field submitted' } });
    assert.throws(() => assertAllowed({ currentTheme: current, incomingTheme: incoming, planAccess: limited, completeSnapshot: true }), { code: 'STORE_BUILDER_CAPABILITY_REQUIRED' });
});

test('actual draft, publish and tenant-scoped restore reject restricted changes before writing', async () => {
    const filename = path.join(root, 'ecommerce-backend/backend/services/storeBuilder/storeBuilderService.js');
    const current = normalizeTheme({});
    const incoming = normalizeTheme({ layout: { homepageComposition: 'editorial' } });
    let writes = 0;
    const plans = [];
    let access = limited;
    const ownershipBoundary = Object.assign(new Error('Reached asset ownership validation'), { code: 'TEST_OWNERSHIP_BOUNDARY' });
    const query = data => ({ select: () => ({ lean: async () => data }), lean: async () => data });
    const deps = {
        '@scaleup/storefront-theme': contract,
        '../../models/Shop': { findById: id => { assert.equal(id, 'tenant-a'); return query({ _id: id, shopName: 'Tenant A', theme: current, themeRevision: 2 }); },
            findOneAndUpdate: () => { writes++; throw new Error('Must not write'); } },
        '../../models/StoreBuilderDraft': { findOneAndUpdate: () => { writes++; throw new Error('Must not write'); } },
        '../../models/StoreBuilderRevision': { findOne: filter => { assert.deepEqual(filter, { _id: 'revision-a', shop_id: 'tenant-a' }); return query({ theme: incoming, revision: 1 }); } },
        '../billing/planAccessService': { getShopPlanAccess: async id => { plans.push(id); return access; } },
        '../billing/storeBuilderPlanService': { assertStoreBuilderUpdateAllowed: assertAllowed },
        './themeCompatibilityService': { preserveThemeExtensions },
        './draftConcurrency': require('../services/storeBuilder/draftConcurrency'),
        '../themeSectionService': { ensureThemeSectionArchitecture: async () => {} },
        '../policies/defaultPolicyTemplates': { fillMissingPolicyDefaults: contract.fillMissingPolicyDefaults },
        './storeBuilderAssetService': { assertThemeAssetOwnership: async () => { throw ownershipBoundary; } },
    };
    const compiled = new Module(filename, module);
    compiled.require = id => deps[id] || {};
    compiled._compile(fs.readFileSync(filename, 'utf8'), filename);
    const service = compiled.exports;
    await assert.rejects(service.saveStoreBuilderDraft({ shopId: 'tenant-a', theme: incoming }), { code: 'STORE_BUILDER_CAPABILITY_REQUIRED' });
    await assert.rejects(service.publishStoreBuilder({ shopId: 'tenant-a', theme: incoming, expectedRevision: 2 }), { code: 'STORE_BUILDER_CAPABILITY_REQUIRED' });
    await assert.rejects(service.restoreStoreBuilderRevision({ shopId: 'tenant-a', revisionId: 'revision-a', expectedRevision: 2 }), { code: 'STORE_BUILDER_CAPABILITY_REQUIRED' });
    assert.equal(writes, 0);
    assert.deepEqual(plans, ['tenant-a', 'tenant-a', 'tenant-a']);
    // Allowed writes progress to the existing ownership gate; stop there to avoid DB I/O.
    await assert.rejects(service.publishStoreBuilder({ shopId: 'tenant-a', theme: current, expectedRevision: 2 }), { code: 'TEST_OWNERSHIP_BOUNDARY' });
    access = full;
    await assert.rejects(service.restoreStoreBuilderRevision({ shopId: 'tenant-a', revisionId: 'revision-a', expectedRevision: 2 }), { code: 'TEST_OWNERSHIP_BOUNDARY' });
});

let components;
let React;
let render;
test.before(async () => {
    const filename = path.join(root, 'ecommerce-admin/capabilities-test.cjs');
    const adminRequire = Module.createRequire(filename);
    const { rolldown } = await import(pathToFileURL(adminRequire.resolve('rolldown')).href);
    const editorRoot = path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder').replaceAll('\\', '/');
    const bundle = await rolldown({ input: 'virtual:capabilities-editors', platform: 'node', external: ['react', 'react/jsx-runtime', 'lucide-react'],
        resolve: { alias: { '@scaleup/storefront-theme': path.join(root, 'packages/storefront-theme/index.mjs') } },
        plugins: [{ name: 'editors', resolveId: id => id === 'virtual:capabilities-editors' ? id : null,
            load: id => id === 'virtual:capabilities-editors' ? [
                "export * from '" + editorRoot + "/editors/HeroEditor.jsx';",
                "export * from '" + editorRoot + "/editors/NavigationEditor.jsx';",
                "export * from '" + editorRoot + "/editors/BasicEditors.jsx';",
                "export * from '" + editorRoot + "/editors/DynamicSectionsEditor.jsx';",
                "export * from '" + editorRoot + "/StoreBuilderSidebar.jsx';",
                "export * from '" + editorRoot + "/storeBuilderConstants.jsx';",
            ].join('\n') : null }],
    });
    try {
        const { output } = await bundle.generate({ format: 'cjs' });
        const compiled = new Module(filename, module);
        compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename);
        components = compiled.exports;
        React = adminRequire('react');
        render = adminRequire('react-dom/server').renderToStaticMarkup;
    } finally { await bundle.close(); }
});

test('actual editor variant options equal the shared registry without a duplicate fallback', () => {
    assert.deepEqual(components.headerVariantOptions.map(option => option.value), [...contract.STRUCTURAL_VARIANTS.header.values]);
    assert.deepEqual(components.heroVariantOptions.map(option => option.value), [...contract.STRUCTURAL_VARIANTS.hero.values]);
    for (const [type, definition] of Object.entries(contract.STRUCTURAL_VARIANTS.sections)) {
        assert.deepEqual(components.sectionVariantOptions[type].map(option => option.value), [...definition.values]);
    }
});

test('actual editor markup applies capability gates and explains composition', () => {
    const theme = themeFor('modern-electronics');
    for (const planAccess of [full, limited]) {
        const caps = capabilities(theme, planAccess);
        for (const name of ['HeroEditor', 'NavigationEditor']) {
            const html = render(React.createElement(components[name], { theme, capabilities: caps }));
            const select = html.match(/<select[^>]*>/)[0];
            assert.equal(select.includes(' disabled='), planAccess === limited);
        }
        const mobile = render(React.createElement(components.MobileEditor, { theme, planAccess }));
        assert.doesNotMatch(mobile, /Sticky checkout button/);
        assert.match(mobile, /Compact header/);
        assert.match(mobile, /Bottom navigation/);
    }
    const layout = render(React.createElement(components.LayoutEditor, { theme, capabilities: capabilities(theme, full) }));
    assert.match(layout, /Product discovery composition/);
    assert.match(layout, /first eligible section/);
    assert.doesNotMatch(layout, /<option[^>]*>discovery/);
});

test('actual limited-plan section editor and sidebar disable structural mutations but allow featured content', () => {
    const theme = normalizeTheme({ homepageSections: [{ id: 'featured', type: 'FeaturedProducts', title: 'Featured Products', settings: { source: { type: 'manual', productIds: [] } } }] });
    const html = render(React.createElement(components.DynamicSectionsEditor, {
        theme, capabilities: capabilities(theme, limited), activeElement: 'section:featured', availableProducts: [], availableReviews: [], productCategories: [], productOptions: [], productPicker: {},
    }));
    assert.match(html, /<button[^>]*disabled=""[^>]*>[\s\S]*?Add section/);
    assert.match(html, /<select[^>]*disabled=""/);
    assert.match(html, /value="Featured Products"/);
    const sidebar = render(React.createElement(components.StoreBuilderSidebar, { theme, planAccess: limited, activeElement: 'section:featured', validation: [] }));
    for (const label of ['Move section up', 'Move section down', 'Duplicate section', 'Delete section']) {
        assert.match(sidebar, new RegExp(`<button[^>]*aria-label="${label}"[^>]*disabled=""`));
    }
    assert.match(sidebar, /aria-label="Hide section"/);
});
