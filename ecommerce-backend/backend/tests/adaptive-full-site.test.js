'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { loadAdaptiveEditor } = require('./helpers/adaptive-editor.cjs');
const a = require('../../../packages/storefront-theme/adaptive.cjs');
let h, bootstrap;
test.before(async () => { h = await loadAdaptiveEditor(); bootstrap = h.ui.createPreviewBootstrap(); });
const plan = (kind, theme = bootstrap.shop.theme) => {
    const result = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind: kind, colorTokens: h.ui.editorTokens(theme) });
    assert.equal(result.valid, true, JSON.stringify(result.errors)); return result.value;
};
const core = (kind, scenario) => h.ui.createPreviewCore(kind, scenario, { theme: bootstrap.shop.theme, shop: bootstrap.shop, products: bootstrap.products });
const render = (kind, scenario, data) => h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan: plan(kind), pageKind: kind,
    data: { core: data || core(kind, scenario) }, actions: h.ui.PREVIEW_ACTIONS }));
const scenarios = {
    home: ['content'], header: ['navigation'], footer: ['policyAccess'],
    product: ['normal', 'variants', 'out-of-stock', 'zero-price', 'missing-image', 'long-title', 'discounted', 'loading', 'missing'],
    category: ['populated', 'empty', 'filtered', 'loading', 'missing'], collection: ['populated', 'empty', 'loading', 'missing'],
    cart: ['populated', 'empty', 'refreshing', 'error'],
    checkout: ['form', 'empty', 'validation-error', 'otp', 'otp-error', 'expired-otp', 'loading', 'submission-failure', 'success'],
    account: ['login', 'registration', 'verification', 'orders', 'profile', 'security', 'loading', 'error'],
    track: ['lookup', 'otp', 'invalid-information', 'verification-error', 'found', 'in-transit', 'delivered', 'cancelled', 'return-eligible', 'return-ineligible'],
    policiesIndex: ['index'], policy: ['shipping', 'refund', 'privacy', 'terms', 'notFound'],
};
for (const [kind, states] of Object.entries(scenarios)) for (const state of states) test(`${kind}/${state}: actual shared view renders inert synthetic state`, () => {
    const html = render(kind, state);
    assert.match(html, /class="sf-adaptive"/); assert.ok(!html.includes('invalid-plan'));
    assert.match(html, new RegExp(`data-ab-template="preview_${kind}"`));
    assert.ok(!html.includes('undefined') && !html.includes('NaN'), 'No malformed display values');
});
test('all twelve page families and finite scenario controls agree with registered contracts', () => {
    assert.deepEqual(h.ui.EDITABLE_REGIONS, a.PAGE_KINDS);
    assert.deepEqual(Object.keys(h.ui.PREVIEW_SCENARIOS).sort(), a.PAGE_KINDS.toSorted());
    for (const kind of a.PAGE_KINDS) assert.equal(plan(kind).pageKind, kind);
});
for (const kind of a.PAGE_KINDS.filter(kind => kind !== 'home')) test(`${kind}: protected core remains singleton, first, nonremovable and nonhideable`, () => {
    const theme = bootstrap.shop.theme, templateId = `preview_${kind}`, nodeId = `core_${templateId}`;
    for (const command of [{ kind: 'remove' }, { kind: 'copy', placement: { index: 1 } }, { kind: 'move', placement: { index: 1 } },
        { kind: 'setStyle', tier: 'base', property: 'visible', value: false }, { kind: 'setStyle', tier: 'base', partId: 'surface', property: 'height', value: { unit: 'px', value: 0 } }]) {
        const before = JSON.stringify(theme), result = h.ui.applyAdaptiveEdit(theme, { ...command, templateId, nodeId });
        assert.equal(result.valid, false); assert.equal(JSON.stringify(theme), before);
    }
});
test('product variants, zero price, inventory, description and independent purchase parts retain actual data semantics', () => {
    assert.match(render('product', 'variants'), /Large/);
    assert.match(render('product', 'out-of-stock'), /Currently Unavailable/);
    assert.ok(!render('product', 'out-of-stock').includes('Buy now'));
    const zero = core('product', 'zero-price'); assert.equal(zero.displayFinalPrice, 0);
    for (const part of ['galleryFrame', 'information', 'description', 'title', 'price', 'options', 'quantity', 'primaryButton', 'secondaryButton']) assert.match(render('product', 'normal'), new RegExp(`data-ab-part="${part}"`));
});
test('catalog filters, sort and pagination use existing trusted callbacks; collection does not invent filters', () => {
    const category = render('category', 'populated'), collection = render('collection', 'populated');
    for (const text of ['Minimum price', 'Maximum price', 'Availability', 'Next', 'Sort']) assert.ok(category.includes(text));
    assert.ok(!collection.includes('Minimum price'));
    for (const part of ['cover', 'listing', 'card', 'sort']) assert.ok(category.includes(`data-ab-part="${part}"`), part);
});
test('cart keeps quantity/removal, verified line prices, subtotal, total and checkout navigation', () => {
    const html = render('cart', 'populated');
    for (const text of ['Subtotal', 'Total', '1160', '1080', 'Proceed to Checkout', '/checkout']) assert.ok(html.includes(text), text);
    assert.match(html, /data-ab-part="items"/); assert.match(html, /data-ab-part="totals"/);
    assert.match(html, /aria-label="Remove/);
});
test('checkout retains required fields, separate marketing/required policy consent and protected OTP states', () => {
    const html = render('checkout', 'form');
    for (const text of ['checkout-policy-consent', 'marketing', 'required=""', '1160']) assert.ok(html.includes(text), text);
    assert.match(render('checkout', 'otp-error'), /example code is invalid/);
    assert.match(render('checkout', 'expired-otp'), /expired/i);
    assert.match(render('checkout', 'submission-failure'), /No order was created/);
});
test('unverified tracking cannot expose a stale supplied order/address or access token', () => {
    const data = core('track', 'found'); data.accessVerified = false; data.order.customerName = 'PRIVATE_SHOULD_NOT_RENDER';
    data.address.fullName = 'PRIVATE_SHOULD_NOT_RENDER';
    const html = render('track', 'found', data); assert.ok(!html.includes('PRIVATE_SHOULD_NOT_RENDER') && !html.includes('tracking-results'));
    assert.match(render('track', 'otp'), /6-digit code/);
    assert.match(render('track', 'return-eligible'), /Request Return/);
});
test('unauthenticated account cannot reveal supplied private profile and orders', () => {
    const data = core('account', 'profile'); data.authenticated = false; data.user.fullName = 'PRIVATE_SHOULD_NOT_RENDER';
    assert.ok(!render('account', 'profile', data).includes('PRIVATE_SHOULD_NOT_RENDER'));
    assert.match(render('account', 'registration'), /Create Account/);
    assert.match(render('account', 'verification'), /OTP|Verification/);
});
test('policy content remains plain escaped text from existing policy data and unknown state selects a finite policy', () => {
    const data = core('policy', 'shipping'); data.content = '<img src=x onerror=alert(1)>';
    assert.match(render('policy', 'shipping', data), /&lt;img/);
    assert.ok(!render('policy', 'shipping', data).includes('<img src="x"'));
    assert.equal(core('policy', 'javascript:alert(1)').label, 'Shipping Policy');
    assert.match(render('policiesIndex', 'index'), /data-ab-part="links"/);
    assert.match(render('policy', 'shipping'), /data-ab-part="links"/);
});
for (const kind of ['product', 'category', 'collection', 'cart', 'checkout', 'account', 'track', 'policy']) test(`${kind}: page edits preserve every other template, with immutable undo/redo snapshots`, () => {
    const before = bootstrap.shop.theme, templateId = `preview_${kind}`, nodeId = `core_${templateId}`;
    const history = [before], command = { kind: 'setStyle', templateId, nodeId, tier: 'tablet', property: 'fontSize', value: { unit: 'px', value: 20 } };
    const result = h.ui.applyAdaptiveEdit(before, command); assert.equal(result.valid, true, JSON.stringify(result.errors)); history.push(result.value);
    for (const id of Object.keys(before.siteBuilder.templates).filter(id => id !== templateId)) assert.deepEqual(result.value.siteBuilder.templates[id], before.siteBuilder.templates[id]);
    assert.equal(history[0].siteBuilder.templates[templateId].nodes[nodeId].styles, undefined);
    assert.equal(history[1].siteBuilder.templates[templateId].nodes[nodeId].styles.tablet.fontSize.value, 20);
});
test('typed media/grid/layout allowlists compile, inherit and reset without functional visibility permissions', () => {
    let theme = bootstrap.shop.theme;
    const commands = [ ['product', 'galleryFrame', 'objectFit', 'contain'], ['product', 'galleryFrame', 'aspectRatio', { width: 4, height: 3 }],
        ['category', 'listing', 'columns', 2], ['category', 'listing', 'gap', { unit: 'px', value: 24 }], ['checkout', 'layout', 'layoutMode', 'stack'] ];
    for (const [kind, partId, property, value] of commands) {
        const result = h.ui.applyAdaptiveEdit(theme, { kind: 'setStyle', templateId: `preview_${kind}`, nodeId: `core_preview_${kind}`, partId, property, value, tier: 'base' });
        assert.equal(result.valid, true, JSON.stringify(result.errors)); theme = result.value;
        const resolved = plan(kind, theme); assert.deepEqual(resolved.nodes[`core_preview_${kind}`].parts[partId].desktop[property], value);
        assert.ok(h.ui.compileAdaptiveStyles(resolved, 'ab_1234').length > 100);
    }
    assert.equal(h.ui.applyAdaptiveEdit(theme, { kind: 'setStyle', templateId: 'preview_category', nodeId: 'core_preview_category', partId: 'listing', tier: 'base', property: 'visible', value: false }).valid, false);
});
test('development transport saves only scoped browser-local drafts, enforces CAS and refuses publication/foreign stores', async () => {
    const map = new Map(), storage = { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
    const grant = { scope: 'synthetic-local-only', shopId: 'a11111111111111111111111', actorId: 'b11111111111111111111111' };
    const api = h.ui.createDevelopmentTransport(grant, storage), url = '/store-builder/admin/draft';
    const payload = { expectedShopId: bootstrap.shop._id, theme: bootstrap.shop.theme, basedOnRevision: 0, expectedDraftUpdatedAt: null };
    const saved = await api.put(url, payload); assert.equal(map.size, 1);
    assert.deepEqual((await api.get('/store-builder/admin')).data.bootstrap.draft.theme, bootstrap.shop.theme);
    await assert.rejects(api.put(url, payload), error => error.response.status === 409);
    await assert.rejects(api.put(url, { ...payload, expectedShopId: grant.shopId }), /cannot publish/);
    assert.throws(() => api.patch('/store-builder/admin'), /cannot publish/);
    assert.throws(() => api.post('/store-builder/admin/media'), /cannot publish/);
    await api.delete(url, { data: { expectedShopId: bootstrap.shop._id, expectedDraftUpdatedAt: saved.data.data.updatedAt } }); assert.equal(map.size, 0);
    assert.throws(() => h.ui.createDevelopmentTransport({}, storage), /grant/);
});
test('unknown local draft formats fail closed and stay available for manual recovery', async () => {
    const raw = JSON.stringify({ formatVersion: 99 }); let value = raw;
    const storage = { getItem: () => value, setItem: (_, next) => { value = next; }, removeItem: () => { value = null; } };
    const api = h.ui.createDevelopmentTransport({ scope: 'synthetic-local-only', shopId: 'a11111111111111111111111', actorId: 'b11111111111111111111111' }, storage);
    await assert.rejects(api.get('/store-builder/admin'), /Unknown local development draft format/); assert.equal(value, raw);
});
test('every preview callback is inert and no live controller enters the shared Admin renderer dependency graph', () => {
    for (const fn of Object.values(h.ui.PREVIEW_ACTIONS.core)) assert.doesNotThrow(() => fn({ preventDefault() {} }));
    assert.ok(h.modules.every(file => !/AuthContext|CartContext|axios|\/api\/|checkout\/hooks|^next\//.test(file.replaceAll('\\', '/'))));
});
for (const kind of a.PAGE_KINDS) test(`${kind}: compatible section operations, independent saved copy and style preset preserve other pages`, () => {
    const templateId = `preview_${kind}`, original = bootstrap.shop.theme, before = JSON.stringify(original);
    const fragment = h.ui.createBlockFragment(original.siteBuilder, 'content.text');
    const run = (theme, command) => { const result = h.ui.applyAdaptiveEdit(theme, { templateId, ...command }); assert.equal(result.valid, true, JSON.stringify(result.errors)); return result.value; };
    let theme = run(original, { kind: 'add', fragment, placement: { index: original.siteBuilder.templates[templateId].rootOrder.length } });
    const nodeId = fragment.rootId;
    theme = run(theme, { kind: 'setStyle', nodeId, tier: 'base', property: 'fontSize', value: { unit: 'px', value: 18 } });
    theme = run(theme, { kind: 'saveSection', nodeId, savedSectionId: 'saved_copy', name: 'Independent copy' });
    theme = run(theme, { kind: 'savePreset', nodeId, presetId: 'approved_preset', name: 'Reading style' });
    theme = run(theme, { kind: 'insertSaved', savedSectionId: 'saved_copy', placement: { index: theme.siteBuilder.templates[templateId].rootOrder.length } });
    const insertedId = theme.siteBuilder.templates[templateId].rootOrder.at(-1); assert.notEqual(insertedId, nodeId);
    theme = run(theme, { kind: 'applyPreset', nodeId: insertedId, presetId: 'approved_preset' });
    theme = run(theme, { kind: 'content', nodeId: insertedId, content: { text: 'Independent edited copy' } });
    assert.equal(theme.siteBuilder.templates[templateId].nodes[nodeId].content.text, 'New text');
    theme = run(theme, { kind: 'remove', nodeId: insertedId });
    for (const id of Object.keys(original.siteBuilder.templates).filter(id => id !== templateId)) assert.deepEqual(theme.siteBuilder.templates[id], original.siteBuilder.templates[id]);
    assert.equal(JSON.stringify(original), before); plan(kind, theme);
});
for (const kind of a.PAGE_KINDS) test(`${kind}: equivalent trusted presentation and inert preview SSR use exactly the same renderer`, () => {
    const props = { plan: plan(kind), pageKind: kind, data: { core: core(kind, scenarios[kind][0]) } };
    let calls = 0;
    const trusted = { core: Object.fromEntries(Object.keys(h.ui.PREVIEW_ACTIONS.core).map(key => [key, () => { calls++; }])), catalog: {} };
    const preview = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { ...props, actions: h.ui.PREVIEW_ACTIONS }));
    const routeLike = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { ...props, actions: trusted }));
    assert.equal(preview, routeLike); assert.equal(calls, 0);
});
test('cart/catalog/tracking adapters preserve callback identities without taking over controllers', () => {
    const callback = () => {};
    const cart = h.ui.ProtectedCore({ pageKind: 'cart', data: core('cart', 'populated'), actions: { updateQuantity: callback, removeFromCart: callback } });
    const view = h.React.Children.toArray(cart.props.children).find(child => child.props?.cartItems);
    assert.equal(view.props.updateQuantity, callback); assert.equal(view.props.removeFromCart, callback);
    const category = h.ui.ProtectedCore({ pageKind: 'category', data: core('category', 'populated'), actions: { updateQuery: callback, applyFilters: callback } });
    assert.equal(category.props.updateQuery, callback); assert.equal(category.props.filterContent.props.applyFilters, callback);
    const track = h.ui.ProtectedCore({ pageKind: 'track', data: core('track', 'found'), actions: { handleTrackOrder: callback, handleCancelOrder: callback } });
    const trackingView = h.React.Children.toArray(track.props.children).find(child => child.props?.trackingId !== undefined);
    assert.equal(trackingView.props.handleTrackOrder, callback); assert.equal(trackingView.props.handleCancelOrder, callback);
});
test('responsive page/node specificity, tier reset and part isolation work on non-home pages', () => {
    const templateId = 'preview_product', nodeId = 'core_preview_product'; let theme = structuredClone(bootstrap.shop.theme);
    theme.siteBuilder.templates[templateId].styles = { desktop: { fontSize: { unit: 'px', value: 30 } } };
    const update = (tier, value) => { const result = h.ui.applyAdaptiveEdit(theme, { kind: 'setStyle', templateId, nodeId, partId: 'title', property: 'fontSize', tier, value: { unit: 'px', value } }); assert.equal(result.valid, true); theme = result.value; };
    update('base', 20); update('tablet', 24); update('desktop', 28);
    let node = plan('product', theme).nodes[nodeId];
    assert.deepEqual(['base', 'tablet', 'desktop'].map(tier => node.parts.title[tier].fontSize.value), [20, 24, 28]);
    const reset = h.ui.applyAdaptiveEdit(theme, { kind: 'resetStyle', templateId, nodeId, partId: 'title', property: 'fontSize', tier: 'desktop' }); assert.equal(reset.valid, true);
    node = plan('product', reset.value).nodes[nodeId]; assert.equal(node.parts.title.desktop.fontSize.value, 24);
    assert.equal(node.parts.quantity.desktop.fontSize.value, 30, 'Page typography remains available to unrelated parts');
});
test('nested functional surfaces cannot conceal required text through more-specific paint overrides', () => {
    for (const [kind, parent, child] of [['product', 'information', 'title'], ['category', 'listing', 'card'], ['collection', 'listing', 'card'], ['track', 'summary', 'input']]) {
        const theme = structuredClone(bootstrap.shop.theme), node = theme.siteBuilder.templates[`preview_${kind}`].nodes[`core_preview_${kind}`];
        node.partStyles = { [parent]: { base: { background: { hex: '#111111' }, color: { hex: '#ffffff' } } }, [child]: { base: { color: { hex: '#111111' } } } };
        const result = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind: kind, colorTokens: h.ui.editorTokens(theme) });
        assert.equal(result.valid, false, `${kind}/${parent}/${child}`);
        assert.ok(result.errors.some(error => ['CORE_CONTRAST', 'CONTRAST'].includes(error.code)));
        assert.equal(a.validatePageTemplates(theme.siteBuilder, h.ui.editorTokens(theme)).valid, false, 'Backend/shared contract must reject the same nested paint');
        node.partStyles[child].base.color = { hex: '#ffffff' };
        // Tracking inputs may also occur in the light lookup surface, so they
        // need an explicit paired background to remain safe in both contexts.
        if (kind === 'track') node.partStyles[child].base.background = { hex: '#111111' };
        const repaired = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind: kind, colorTokens: h.ui.editorTokens(theme) });
        assert.equal(repaired.valid, true, `${kind}: ${JSON.stringify(repaired.errors)}`);
    }
});
