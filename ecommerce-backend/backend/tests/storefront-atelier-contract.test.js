const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const contract = require('@scaleup/storefront-theme');
const prebuilt = require('@scaleup/storefront-theme/prebuilt');
const Shop = require('../models/Shop');
const { capture } = require('./fixtures/atelier-legacy/capture.cjs');
const baseline = require('./fixtures/atelier-legacy/contracts.json');
const { normalizeTheme, mergeThemePatch, getStorefrontPresentationVariant: select } = contract;
const at = '2026-10-20T00:00:00.000Z';
const candidate = () => prebuilt.resolvePrebuiltTheme({ presetId: 'atelier-editorial', appliedAt: at });

test('original nine complete definitions, versions, normalized snapshots, effective output and capabilities are immutable', () => {
    assert.deepEqual(JSON.parse(JSON.stringify(capture())), baseline);
});

test('tenth candidate is hidden and contract-valid without changing nine active presets or schema v4', () => {
    assert.equal(contract.THEME_SCHEMA_VERSION, 4);
    assert.equal(prebuilt.PREBUILT_THEMES.length, 10);
    assert.equal(prebuilt.getPrebuiltThemes().length, 9);
    assert.equal(prebuilt.getPrebuiltTheme('atelier-editorial').status, 'hidden');
    assert.equal(prebuilt.getPrebuiltTheme('atelier-editorial').version, 1);
    assert.deepEqual(prebuilt.validatePrebuiltThemeRegistry(), { valid: true, errors: [] });
    assert.equal(contract.validateTheme(candidate()).valid, true);
});

test('optional identity has no legacy default, invalid reads fall back and invalid writes fail validation', () => {
    for (const input of [{}, { presentationVariant: null }, { presentationVariant: 'unknown' }]) {
        assert.equal(select(input), 'default');
        assert.equal(Object.hasOwn(normalizeTheme(input), 'presentationVariant'), false);
    }
    for (const input of ['', 'other', {}, ['atelier-editorial']]) {
        assert.equal(contract.validateTheme({ presentationVariant: input }).valid, false);
    }
    assert.equal(contract.validateTheme({ presentationVariant: null }).valid, true);
});

test('identity persists through Mongoose JSON hydration and explicit clearing survives merge, normalization and reload', () => {
    const saved = new Shop({ shopName: 'Fixture', subdomain: 'fixture', theme: candidate() });
    assert.equal(saved.validateSync(), undefined);
    const reloaded = Shop.hydrate(JSON.parse(JSON.stringify(saved.toObject())));
    assert.equal(select(reloaded.theme), 'atelier-editorial');
    const cleared = normalizeTheme(mergeThemePatch(JSON.parse(JSON.stringify(reloaded.theme)), { presentationVariant: null }));
    assert.equal(Object.hasOwn(cleared, 'presentationVariant'), false);
    assert.equal(select(Shop.hydrate({ theme: cleared }).theme), 'default');
});

test('homepage composition and preset provenance cannot select or remove the persistent skin', () => {
    for (const homepageComposition of contract.STRUCTURAL_VARIANTS.homepage.values) {
        const changed = normalizeTheme(mergeThemePatch(candidate(), { layout: { homepageComposition } }));
        assert.equal(select(changed), 'atelier-editorial');
        assert.equal(select(contract.resolveEffectiveTheme(changed, { planAccess: { storeBuilderAccess: 'full' } })), 'atelier-editorial');
        assert.equal(select({ preset: changed.preset, layout: changed.layout }), 'default');
    }
});

test('full legacy preset application removes identity; limited appearance-only application retains protected identity', () => {
    for (const preset of prebuilt.getPrebuiltThemes()) {
        const full = prebuilt.resolvePrebuiltTheme({ currentTheme: candidate(), presetId: preset.id, appliedAt: at });
        assert.equal(Object.hasOwn(full, 'presentationVariant'), false);
        const limited = prebuilt.resolvePrebuiltTheme({ currentTheme: candidate(), presetId: preset.id, appliedAt: at, planAccess: { storeBuilderAccess: 'limited' } });
        assert.equal(select(limited), 'atelier-editorial');
    }
    const adapted = prebuilt.resolvePrebuiltTheme({ presetId: 'atelier-editorial', appliedAt: at, planAccess: { storeBuilderAccess: 'limited' } });
    assert.equal(select(adapted), 'default');
    assert.throws(() => contract.assertStoreBuilderUpdateAllowed({ currentTheme: {}, incomingTheme: { presentationVariant: 'atelier-editorial' }, planAccess: { storeBuilderAccess: 'limited' } }), { code: 'STORE_BUILDER_CAPABILITY_REQUIRED' });
});

test('CJS and ESM hosts expose exactly the same identity contract', async () => {
    const esm = await import(pathToFileURL(path.resolve(__dirname, '../../../packages/storefront-theme/index.mjs')));
    assert.equal(esm.getStorefrontPresentationVariant, select);
    assert.equal(esm.normalizeTheme, normalizeTheme);
});

test('Atelier application retains merchant section order, hidden sections and enabled duplicates', () => {
    const currentTheme = normalizeTheme({ homepageSections: [
        { id: 'story-one', type: 'BrandStory', sortOrder: 0, isEnabled: true, settings: { text: 'First story' } },
        { id: 'categories', type: 'CategoryList', sortOrder: 1, isEnabled: false },
        { id: 'story-two', type: 'BrandStory', sortOrder: 2, isEnabled: true, settings: { text: 'Second story' } },
        { id: 'extra', type: 'TextBlock', sortOrder: 3, isEnabled: true, settings: { text: 'Merchant extra' } },
    ] });
    const next = prebuilt.resolvePrebuiltTheme({ currentTheme, presetId: 'atelier-editorial', appliedAt: at });
    assert.deepEqual(next.homepageSections.slice(0, 4).map(section => section.id), currentTheme.homepageSections.map(section => section.id));
    assert.deepEqual(next.homepageSections.slice(0, 4).map(section => section.isEnabled), [true, false, true, true]);
    assert.equal(next.homepageSections[2].settings.text, 'Second story');
});

// Execute the real adoption guard and persistence services. Only DB models,
// transports and infrastructure are replaced; no production connection is made.
const directory = path.resolve(__dirname, '../services/storeBuilder');
const loadService = (name, deps) => {
    const filename = path.join(directory, name);
    const compiled = new Module(filename, module);
    compiled.require = id => Object.hasOwn(deps, id) ? deps[id] : require(Module.createRequire(filename).resolve(id));
    compiled._compile(fs.readFileSync(filename, 'utf8'), filename);
    return compiled.exports;
};
const shopId = '100000000000000000000001';
const otherId = '100000000000000000000002';
let trustedAccess = { storeBuilderAccess: 'full', planKey: 'fixture' };
const guard = loadService('themeAvailabilityService.js', {
    '../billing/planAccessService': { getShopPlanAccess: async id => { assert.equal(String(id), shopId); return trustedAccess; } }
});
const configure = (t, mode, ids = '', keys = '') => {
    for (const [key, value] of Object.entries({ ATELIER_EDITORIAL_ROLLOUT: mode, ATELIER_EDITORIAL_TEST_SHOP_IDS: ids, ATELIER_EDITORIAL_APPROVED_PLAN_KEYS: keys })) {
        const old = process.env[key];
        process.env[key] = value;
        t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
    }
};
const attempt = (rawTheme, shop = { _id: shopId, theme: {} }, extra = {}) => guard.assertThemeAvailability({ shop, rawTheme, targetTheme: normalizeTheme(rawTheme), ...extra });

for (const mode of ['off', 'invalid', '']) test(`${mode || 'unset'} rollout blocks marker-only, guessed metadata and complete snapshots`, async t => {
    configure(t, mode, shopId);
    for (const raw of [{ presentationVariant: 'atelier-editorial' }, { preset: { id: 'atelier-editorial', version: 1 } }, candidate()]) {
        await assert.rejects(attempt(raw), { code: 'THEME_NOT_AVAILABLE', statusCode: 403 });
    }
});

test('exact trusted allowlist permits development adoption, exposes no other tenant IDs, rejects caller plan/tenant flags', async t => {
    configure(t, 'allowlist', shopId);
    trustedAccess = { storeBuilderAccess: 'full', planKey: 'fixture' };
    await attempt(candidate());
    const availability = guard.getThemeAvailability({ shop: { _id: shopId }, planAccess: trustedAccess });
    assert.equal(availability['atelier-editorial'].available, true);
    assert.equal(JSON.stringify(availability).includes(shopId), false);
    assert.equal(guard.getThemeAvailability({ shop: { _id: otherId }, planAccess: trustedAccess })['atelier-editorial'].available, false);
    process.env.ATELIER_EDITORIAL_TEST_SHOP_IDS = otherId;
    await assert.rejects(attempt(candidate(), undefined, { shopId: otherId, planAccess: trustedAccess, preview: true, rollout: 'on' }), { code: 'THEME_NOT_AVAILABLE' });
});

test('on fails closed until server-approved plan keys exist; limited plans cannot acquire the structural marker', async t => {
    configure(t, 'on');
    await assert.rejects(attempt(candidate()), { code: 'THEME_NOT_AVAILABLE' });
    process.env.ATELIER_EDITORIAL_APPROVED_PLAN_KEYS = 'fixture';
    await attempt(candidate());
    trustedAccess = { storeBuilderAccess: 'limited', planKey: 'fixture' };
    await assert.rejects(attempt(candidate()), { code: 'THEME_NOT_AVAILABLE' });
    const adapted = prebuilt.resolvePrebuiltTheme({ presetId: 'atelier-editorial', planAccess: trustedAccess, appliedAt: at });
    await attempt(adapted);
    await assert.rejects(attempt({ ...adapted, layout: { ...adapted.layout, homepageComposition: 'editorial' } }, undefined,
        { planAccess: { storeBuilderAccess: 'full' } }), { code: 'STORE_BUILDER_CAPABILITY_REQUIRED' });
    trustedAccess = { storeBuilderAccess: 'full', planKey: 'fixture' };
});

test('off permits unchanged published identity and switching away, rejects reapplication and SEO identity changes', async t => {
    configure(t, 'off');
    const shop = { _id: shopId, theme: candidate() };
    shop.theme.preset.appliedAt = new Date(at);
    await attempt(candidate(), shop);
    await attempt(prebuilt.resolvePrebuiltTheme({ currentTheme: candidate(), presetId: 'modern-general', appliedAt: at }), shop);
    await assert.rejects(attempt({ ...candidate(), preset: { ...candidate().preset, version: 2 } }, shop), { code: 'THEME_NOT_AVAILABLE' });
    await assert.rejects(attempt({ ...candidate(), preset: { ...candidate().preset, appliedAt: '2026-10-21T00:00:00Z' } }, shop), { code: 'THEME_NOT_AVAILABLE' });
    await assert.rejects(attempt(candidate(), { _id: shopId, theme: {} }, { changeScope: 'homepage-seo' }), { code: 'THEME_NOT_AVAILABLE' });
    await assert.rejects(attempt({}, shop, { changeScope: 'homepage-seo' }), { code: 'THEME_NOT_AVAILABLE' });
    await attempt({ ...candidate(), seo: { title: 'Updated SEO' } }, shop, { changeScope: 'homepage-seo' });
});

test('actual draft, publication, tenant-scoped restore and SEO writes reject before any mutation', async t => {
    configure(t, 'off');
    let writes = 0;
    const current = { _id: shopId, theme: { migrations: { bannerSectionsV1: true } }, themeRevision: 2 };
    const draft = { _id: 'draft', theme: candidate(), updatedAt: at };
    const query = data => ({ select() { return this; }, lean: async () => data, then(resolve, reject) { return Promise.resolve(data).then(resolve, reject); } });
    const write = () => { writes++; throw new Error('Unexpected database mutation'); };
    const deps = {
        mongoose: { Types: { ObjectId: { isValid: () => false } } },
        '@scaleup/storefront-theme': contract,
        '../../models/Shop': { schema: Shop.schema, findById: id => { assert.equal(String(id), shopId); return query(current); }, findOneAndUpdate: write },
        '../../models/StoreBuilderDraft': { findOne: filter => { assert.equal(String(filter.shop_id), shopId); return query(draft); }, findOneAndUpdate: write, updateOne: write, deleteOne: write },
        '../../models/StoreBuilderRevision': { findOne: filter => { assert.equal(String(filter.shop_id), shopId); return query({ theme: candidate(), revision: 1 }); } },
        './themeAvailabilityService': guard,
        '../billing/planAccessService': { getShopPlanAccess: async () => trustedAccess },
        '../billing/storeBuilderPlanService': contract,
        './storeBuilderAssetService': { assertThemeAssetOwnership: write, attachAssetsToDraft: write },
        '../themeSectionService': { ensureThemeSectionArchitecture: async () => {} },
        '../policies/defaultPolicyTemplates': contract,
    };
    const service = loadService('storeBuilderService.js', deps);
    const seoService = loadService('storeBuilderSeoService.js', { ...deps, './storeBuilderService': service });
    for (const run of [
        () => service.saveStoreBuilderDraft({ shopId, theme: candidate() }),
        () => service.publishStoreBuilder({ shopId, theme: candidate(), expectedRevision: 2 }),
        () => service.publishStoreBuilder({ shopId, theme: candidate(), expectedRevision: 2, changeScope: 'homepage-seo' }),
        () => service.restoreStoreBuilderRevision({ shopId, revisionId: 'old-revision', expectedRevision: 2 }),
        () => seoService.saveStoreBuilderSeoDraft({ shopId, seo: { title: 'SEO' } }),
        () => seoService.deleteStoreBuilderSeoDraft({ shopId }),
    ]) await assert.rejects(run(), { code: 'THEME_NOT_AVAILABLE' });
    assert.equal(writes, 0);
    await assert.rejects(service.normalizeThemeForShop({ presentationVariant: 'invalid' }, current), { code: 'INVALID_THEME' });
});
