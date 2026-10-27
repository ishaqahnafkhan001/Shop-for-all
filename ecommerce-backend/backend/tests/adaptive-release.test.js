'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readAdaptiveRollout, getAdaptiveAvailability } = require('../services/storeBuilder/adaptiveRolloutPolicy');
const shopId = 'a11111111111111111111111';
const config = { ADAPTIVE_BUILDER_ROLLOUT: 'pilot', ADAPTIVE_BUILDER_APPROVAL: 'synthetic-release-approval', ADAPTIVE_BUILDER_SHOP_IDS: shopId,
    ADAPTIVE_BUILDER_WRITES: 'on', ADAPTIVE_BUILDER_RENDERING: 'on' };
test('rollout defaults OFF and legacy on/partial/invalid configuration cannot grant access', () => {
    for (const env of [{}, { ...config, ADAPTIVE_BUILDER_ROLLOUT: 'on' }, { ...config, ADAPTIVE_BUILDER_APPROVAL: '' },
        { ...config, ADAPTIVE_BUILDER_SHOP_IDS: '' }, { ...config, ADAPTIVE_BUILDER_SHOP_IDS: `${shopId},garbage` },
        { ...config, ADAPTIVE_BUILDER_WRITES: 'true' }, { ...config, ADAPTIVE_BUILDER_ROLLOUT: 'off' }]) {
        const policy = readAdaptiveRollout(env); assert.equal(policy.writes, false); assert.equal(policy.rendering, false); assert.equal(policy.allows(shopId), false);
    }
});
test('pilot and wider rollout remain explicit; write and render kills are independent', () => {
    const pilot = readAdaptiveRollout(config); assert.equal(pilot.allows(shopId), true); assert.equal(pilot.allows('b11111111111111111111111'), false);
    assert.equal(readAdaptiveRollout({ ...config, ADAPTIVE_BUILDER_ROLLOUT: 'all' }).allows('b11111111111111111111111'), true);
    assert.equal(readAdaptiveRollout({ ...config, ADAPTIVE_BUILDER_WRITES: 'off' }).rendering, true);
    assert.equal(readAdaptiveRollout({ ...config, ADAPTIVE_BUILDER_RENDERING: 'off' }).writes, false, 'release hold blocks editing regardless of environment');
    assert.notEqual(pilot.fingerprint, readAdaptiveRollout({ ...config, ADAPTIVE_BUILDER_RENDERING: 'off' }).fingerprint);
});
test('release hold blocks both limited and full Builder plans while preserving published rendering', t => {
    for (const [key, value] of Object.entries(config)) { const before = process.env[key]; t.after(() => before === undefined ? delete process.env[key] : process.env[key] = before); process.env[key] = value; }
    const full = { storeBuilderAccess: 'full', isOperational: true, shopOperational: true, features: { storeBuilder: true } };
    assert.equal(getAdaptiveAvailability({ shopId, planAccess: full }).available, false);
    assert.equal(getAdaptiveAvailability({ shopId, planAccess: full }).rendering, true);
    assert.equal(getAdaptiveAvailability({ shopId, planAccess: { ...full, storeBuilderAccess: 'limited' } }).available, false);
    for (const planAccess of [undefined, { ...full, storeBuilderAccess: 'none' }, { ...full, storeBuilderAccess: 'unknown' },
        { ...full, isOperational: false }, { ...full, shopOperational: false }, { ...full, features: { storeBuilder: false } }]) assert.equal(getAdaptiveAvailability({ shopId, planAccess }).available, false);
    assert.equal(getAdaptiveAvailability().available, false);
});

test('release hold denies direct development-preview grants even on an allowlisted local request', async t => {
    for (const [key, value] of Object.entries({ NODE_ENV: 'development', ADAPTIVE_BUILDER_DEV_SHOP_IDS: shopId })) {
        const before = process.env[key]; process.env[key] = value;
        t.after(() => before === undefined ? delete process.env[key] : process.env[key] = before);
    }
    const { getDevelopmentPreviewAccess } = require('../services/storeBuilder/developmentPreviewAccess');
    await assert.rejects(getDevelopmentPreviewAccess({ tenantId: shopId, socket: { remoteAddress: '127.0.0.1' } }), { code: 'DEVELOPMENT_PREVIEW_UNAVAILABLE', statusCode: 404 });
    assert.equal(readAdaptiveRollout({ ...config, ADAPTIVE_BUILDER_ROLLOUT: 'all' }).writes, false);
});

for (const kind of ['cancel', 'return']) for (const busy of [false, true]) test(`adaptive tracking ${kind} dialog exposes its name and protects pending actions (busy=${busy})`, async () => {
    const h = await require('./helpers/adaptive-editor.cjs').loadAdaptiveEditor();
    const bootstrap = h.ui.createPreviewBootstrap(), theme = bootstrap.shop.theme;
    const result = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind: 'track', colorTokens: h.ui.editorTokens(theme) });
    assert.equal(result.valid, true);
    const core = h.ui.createPreviewCore('track', 'return-eligible', { theme, shop: bootstrap.shop, products: bootstrap.products });
    Object.assign(core, { presentationVariant: 'reference', atelier: false, cancelOpen: kind === 'cancel', returnOpen: kind === 'return', actionLoading: busy });
    const html = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan: result.value, pageKind: 'track', data: { core }, actions: h.ui.PREVIEW_ACTIONS }));
    assert.match(html, /role="dialog"/);
    assert.match(html, /aria-modal="true"/);
    assert.ok(html.includes(`aria-label="${kind === 'cancel' ? 'Cancel this order?' : 'Request return/refund'}"`));
    const close = html.match(/<button[^>]*aria-label="Close modal"[^>]*>/)?.[0];
    assert.ok(close, 'Dialog has a named close action');
    assert.equal(close.includes('disabled=""'), busy, 'Closing cannot hide an in-flight action');
    const dismiss = html.match(new RegExp(`<button[^>]*>\\s*${kind === 'cancel' ? 'Keep order' : 'Not now'}\\s*</button>`))?.[0];
    assert.ok(dismiss);
    assert.equal(dismiss.includes('disabled=""'), busy);
    assert.ok(html.includes(busy ? (kind === 'cancel' ? 'Cancelling...' : 'Submitting...') : (kind === 'cancel' ? 'Confirm cancel' : 'Submit request')));
});

test('adaptive return proof keeps its remove action exposed outside image semantics', async () => {
    const h = await require('./helpers/adaptive-editor.cjs').loadAdaptiveEditor();
    const bootstrap = h.ui.createPreviewBootstrap(), theme = bootstrap.shop.theme;
    const result = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind: 'track', colorTokens: h.ui.editorTokens(theme) });
    assert.equal(result.valid, true);
    const core = h.ui.createPreviewCore('track', 'return-eligible', { theme, shop: bootstrap.shop, products: bootstrap.products });
    Object.assign(core, { presentationVariant: 'reference', atelier: false, returnOpen: true, returnProofImages: [new File([], 'synthetic-proof.png', { type: 'image/png' })] });
    const html = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan: result.value, pageKind: 'track', data: { core }, actions: h.ui.PREVIEW_ACTIONS }));
    assert.match(html, /aria-label="synthetic-proof.png" role="group"/);
    assert.match(html, /aria-label="Remove proof image"/);
});

test('adaptive mobile navigation trigger declares its closed dialog state', async () => {
    const h = await require('./helpers/adaptive-editor.cjs').loadAdaptiveEditor();
    const bootstrap = h.ui.createPreviewBootstrap(), theme = bootstrap.shop.theme;
    const result = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind: 'header', colorTokens: h.ui.editorTokens(theme) });
    assert.equal(result.valid, true);
    const core = h.ui.createPreviewCore('header', 'navigation', { theme, shop: bootstrap.shop });
    core.preview = false;
    const html = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan: result.value, pageKind: 'header', data: { core }, actions: h.ui.PREVIEW_ACTIONS }));
    const trigger = html.match(/<button[^>]*aria-label="Open menu"[^>]*>/)?.[0];
    assert.ok(trigger);
    assert.match(trigger, /aria-haspopup="dialog"/);
    assert.match(trigger, /aria-expanded="false"/);
    assert.doesNotMatch(html, /aria-label="Store navigation"/);
});

test('adaptive return upload controls remain in the keyboard focus order', async () => {
    const h = await require('./helpers/adaptive-editor.cjs').loadAdaptiveEditor();
    const bootstrap = h.ui.createPreviewBootstrap(), theme = bootstrap.shop.theme;
    const result = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind: 'track', colorTokens: h.ui.editorTokens(theme) });
    assert.equal(result.valid, true);
    const core = h.ui.createPreviewCore('track', 'return-eligible', { theme });
    core.returnOpen = true;
    const html = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan: result.value, pageKind: 'track', data: { core }, actions: h.ui.PREVIEW_ACTIONS }));
    const uploads = html.match(/<input[^>]*type="file"[^>]*>/g) || [];
    assert.equal(uploads.length, 2);
    for (const upload of uploads) assert.match(upload, /class="sr-only"/);
    assert.match(html, /focus-within:ring-2/);
});

test('adaptive catalog purchase labels can wrap in narrow cards', async () => {
    const h = await require('./helpers/adaptive-editor.cjs').loadAdaptiveEditor();
    const bootstrap = h.ui.createPreviewBootstrap(), theme = bootstrap.shop.theme;
    const result = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind: 'home', colorTokens: h.ui.editorTokens(theme) });
    assert.equal(result.valid, true);
    const core = h.ui.createPreviewCore('home', 'content', { theme, shop: bootstrap.shop });
    const html = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan: result.value, pageKind: 'home', data: {
        core, sources: { home_products: { products: bootstrap.products } },
    }, actions: h.ui.PREVIEW_ACTIONS }));
    assert.match(html, /relative z-20 flex w-full flex-wrap gap-2/);
    assert.match(html, /min-w-0 whitespace-normal break-words">Buy Now<\/span>/);
    assert.match(html, /min-h-11 basis-24 grow/);
});
