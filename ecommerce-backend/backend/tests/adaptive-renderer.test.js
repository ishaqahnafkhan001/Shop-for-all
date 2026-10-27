'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadAdaptiveRenderer, root } = require('./helpers/adaptive-renderer.cjs');
const { renderDocument, pageData, fixtureActions, tokens, px, assetId } = require('./fixtures/adaptive-builder/render-fixtures.cjs');
const { fixture } = require('./fixtures/adaptive-builder/contract-fixtures.cjs');
const a = require('../../../packages/storefront-theme/adaptive.cjs');
let h;
test.before(async () => { h = await loadAdaptiveRenderer(); });
const resolve = (document = renderDocument(), kind = 'home', colorTokens = tokens) => h.ui.resolveAdaptivePage({ siteBuilder: document, pageKind: kind, colorTokens });
function render(kind = 'home', scenario, options = {}) {
    const result = resolve(options.document, kind);
    assert.equal(result.valid, true, JSON.stringify(result.errors));
    const record = [];
    const html = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { pageKind: kind, plan: result.value,
        data: pageData(kind, scenario), actions: fixtureActions(record), ...options.props }));
    assert.deepEqual(record, [], 'SSR must not execute an action');
    return html;
}
function walk(node, found = []) {
    if (node && typeof node === 'object') { found.push(node); h.React.Children.forEach(node.props?.children, child => walk(child, found)); }
    return found;
}

test('three page plans are detached, frozen and leave the complete input unchanged', () => {
    const input = renderDocument(), before = JSON.stringify(input);
    for (const kind of ['home', 'product', 'checkout']) {
        const result = resolve(input, kind);
        assert.equal(result.valid, true, JSON.stringify(result.errors));
        assert.ok(Object.isFrozen(result.value.nodes));
        assert.throws(() => { result.value.rootOrder.push('extra'); }, TypeError);
        assert.equal(result.value.pageKind, kind);
    }
    input.templates.tpl_home.nodes.story_text.content.text = 'Changed after resolution';
    assert.notEqual(before, JSON.stringify(input));
    const original = resolve(JSON.parse(before));
    assert.notEqual(original.value.nodes.story_text.content.text, input.templates.tpl_home.nodes.story_text.content.text);
});
for (const kind of a.PAGE_KINDS.filter(kind => !['home', 'product', 'checkout', 'header', 'footer'].includes(kind))) test(`${kind}: registered adapter resolves; missing assignment still fails closed`, () => {
    assert.equal(resolve(fixture(), kind).valid, true);
    const unassigned = fixture(); delete unassigned.defaultTemplates[kind];
    assert.equal(resolve(unassigned, kind).errors[0].code, 'PAGE_ASSIGNMENT');
});
test('full documents and actual Phase 2 projection shape resolve identically', () => {
    const document = renderDocument(), projected = structuredClone(document);
    delete projected.savedSections;
    assert.deepEqual(resolve(projected).value, resolve(document).value);
});
test('effective tokens are mandatory, complete and never silently defaulted', () => {
    for (const colorTokens of [undefined, {}, { ...tokens, foreground: 'url(x)' }]) assert.equal(h.ui.resolveAdaptivePage({ siteBuilder: renderDocument(), pageKind: 'home', colorTokens }).valid, false);
});
test('missing assignment requests the legacy path without inventing a template', () => {
    const document = renderDocument(); delete document.defaultTemplates.home;
    assert.equal(resolve(document).errors[0].code, 'PAGE_ASSIGNMENT');
});
test('all eight optional registered block types render with stable node markers and no fetching', () => {
    const html = render();
    for (const type of Object.keys(a.BLOCK_REGISTRY).filter(type => !a.BLOCK_REGISTRY[type].protected)) assert.ok(html.includes(`data-ab-type="${type}"`), type);
    for (const id of ['section_story', 'columns', 'image', 'column_copy', 'stack', 'decorative']) assert.equal(html.split(`data-ab-node="${id}"`).length - 1, 1);
    assert.ok(html.indexOf('data-ab-node="image"') < html.indexOf('data-ab-node="column_copy"'));
    assert.match(html, /<h2[^>]*>Synthetic shop/);
    assert.match(html, /alt="Synthetic ceramic vessel"/);
    assert.match(html, /href="\/policies\/shipping"/);
    assert.match(html, /Synthetic catalog product/);
    assert.match(html, /Synthetic category/);
});
test('one scoped stylesheet contains all tiers, nested layouts, safe colors, typography, boxes and visibility', () => {
    const html = render();
    assert.equal((html.match(/<style>/g) || []).length, 1);
    for (const css of ['@media(min-width:768px)', '@media(min-width:1024px)', 'grid-template-columns:repeat(1,minmax(0,1fr))',
        'grid-template-columns:repeat(2,minmax(0,1fr))', 'background:#fafafa', 'padding-block-start:0px',
        'font-size:1.5rem', 'border-radius:12px', 'aspect-ratio:4/3', 'display:none', 'display:block', 'prefers-reduced-motion', ':focus-visible']) assert.ok(html.includes(css), css);
    assert.ok(!/window\.innerWidth|position:absolute|z-index/.test(html.slice(html.indexOf('<style>'), html.indexOf('</style>'))));
});
test('node base wins over page desktop, nested text inherits and noninherited boxes stay local', () => {
    const plan = resolve().value;
    assert.deepEqual(plan.nodes.story_text.styles.desktop.fontSize, px(24));
    assert.deepEqual(plan.nodes.stack_copy.styles.desktop.fontSize, px(20));
    assert.equal(plan.nodes.story_text.styles.base.background, undefined);
    assert.equal(plan.nodes.story_text.styles.base.paddingBlockStart, undefined);
    assert.deepEqual(plan.nodes.stack.styles.base.gap, px(0));
    assert.equal(plan.nodes.decorative.styles.base.visible, false);
    assert.equal(plan.nodes.decorative.styles.desktop.visible, true);
});
test('reset removes selected override and exposes inherited value in compiled output', () => {
    const result = a.applyPageTemplateCommand(renderDocument(), { kind: 'resetStyle', templateId: 'tpl_home', nodeId: 'story_text', tier: 'base', property: 'fontSize' }, tokens);
    assert.equal(result.valid, true, JSON.stringify(result.errors));
    const plan = resolve(result.value).value;
    assert.deepEqual(plan.nodes.story_text.styles.base.fontSize, px(16));
    assert.deepEqual(plan.nodes.story_text.styles.desktop.fontSize, px(20));
});
test('presets resolve before node overrides and box styles do not leak into protected parts', () => {
    const document = renderDocument();
    document.stylePresets.story = { name: 'Story', blockTypes: ['content.text'], styles: { base: { fontSize: px(18) }, desktop: { fontSize: px(30) } } };
    document.templates.tpl_home.nodes.story_text.stylePresetId = 'story';
    assert.deepEqual(resolve(document).value.nodes.story_text.styles.desktop.fontSize, px(24));
    assert.equal(resolve(document, 'product').value.nodes.core_tpl_product.parts.title.base.paddingBlockStart, undefined);
});
for (const level of ['page', 'node', 'preset', 'part']) test(`functional ${level} paint resolves to a validated, scoped dark palette`, () => {
    const document = renderDocument(), template = document.templates.tpl_product;
    const paint = { base: { color: { hex: '#ffffff' }, background: { hex: '#000000' } } };
    if (level === 'page') template.styles = paint;
    if (level === 'node') template.nodes.core_tpl_product.styles = paint;
    if (level === 'preset') { document.stylePresets.dark = { name: 'Dark', blockTypes: ['product.core'], styles: paint }; template.nodes.core_tpl_product.stylePresetId = 'dark'; }
    if (level === 'part') template.nodes.core_tpl_product.partStyles.surface = paint;
    assert.equal(a.validatePageTemplates(document, tokens).valid, true);
    const result = resolve(document, 'product');
    assert.equal(result.valid, true, JSON.stringify(result.errors));
    assert.deepEqual(result.value.nodes.core_tpl_product.palette.tiers.base.surface, { color: '#ffffff', background: '#000000' });
    assert.match(h.ui.compileAdaptiveStyles(result.value, 'ab_1234'), /--ab-surface:#000000/);
});
test('a primary button color without its own paired background cannot inherit an unsafe legacy surface', () => {
    const document = renderDocument();
    document.templates.tpl_product.nodes.core_tpl_product.partStyles.primaryButton = { base: { color: { hex: '#111111' } } };
    assert.equal(resolve(document, 'product').errors[0].code, 'CORE_CONTRAST');
});
for (const kind of ['product', 'checkout']) test(`${kind}: core is first and singleton; informational content follows it`, () => {
    const html = render(kind).replace(/<style>[\s\S]*?<\/style>/g, '');
    assert.equal((html.match(new RegExp(`data-ab-core="${kind}"`, 'g')) || []).length, 1);
    assert.ok(html.indexOf(`data-ab-core="${kind}"`) < html.indexOf(`data-ab-node="${kind}_note"`));
});
for (const scenario of ['normal', 'zero', 'soldout', 'long', 'variant']) test(`product/${scenario}: existing gallery, price and purchase semantics`, () => {
    const html = render('product', scenario);
    assert.match(html, /Image unavailable/);
    assert.match(html, /data-ab-part="title"/);
    assert.match(html, /data-ab-part="price"/);
    if (scenario === 'zero') assert.match(html, /৳ 0/);
    if (scenario === 'soldout') { assert.match(html, /Currently Unavailable/); assert.ok(!html.includes('aria-label="Increase quantity"')); }
    else { assert.match(html, /Increase quantity/); assert.match(html, /Add to Cart/); }
    if (scenario === 'long') assert.match(html, /হস্তনির্মিত/);
    if (scenario === 'variant') { assert.match(html, /data-ab-part="options"/); assert.match(html, /title="Unavailable is unavailable with current options"/); }
});
test('product loading and missing states remain code-owned and render no purchase controls', () => {
    for (const core of [{ state: 'loading' }, { state: 'missing' }]) {
        const html = render('product', undefined, { props: { data: { core } } });
        assert.match(html, /role="status"/);
        assert.ok(!html.includes('Add to Cart'));
    }
});
test('product actions and quantity limits pass unchanged to the existing view', () => {
    const record = [], actions = fixtureActions(record).core;
    const core = h.ui.ProtectedCore({ pageKind: 'product', data: pageData('product').core, actions });
    const view = walk(core).find(node => node.type === h.ui.ProductDetailsView);
    assert.equal(view.props.handleAddToCart, actions.addToCart);
    assert.equal(view.props.handleBuyNow, actions.buyNow);
    const elements = walk(h.ui.ProductDetailsView(view.props));
    const increase = elements.find(node => node.props?.['aria-label'] === 'Increase quantity');
    increase.props.onClick();
    assert.equal(record[0].name, 'setQuantity');
});
for (const scenario of ['form', 'no-consent', 'busy', 'error', 'otp', 'empty', 'success']) test(`checkout/${scenario}: trusted protected presentation and states`, () => {
    const html = render('checkout', scenario);
    if (scenario === 'empty') return assert.match(html, /Your cart is empty/);
    if (scenario === 'success') return assert.match(html, /Order Confirmed/);
    for (const name of ['fullName', 'email', 'phone', 'address', 'city']) assert.match(html, new RegExp(`required=""[^>]*name="${name}"`));
    for (const value of ['Inside Dhaka', 'Outside Dhaka', 'Cash on Delivery', 'checkout-policy-consent', 'Optional; unsubscribe anytime', '৳ 200', '৳120']) assert.ok(html.includes(value), value);
    if (scenario === 'busy') assert.match(html, /Processing order/);
    if (scenario === 'no-consent') assert.match(html, /disabled=""[^>]*class="sf-btn sf-checkout-submit/);
    if (scenario === 'error') assert.match(html, /role="alert">Synthetic order error/);
    if (scenario === 'otp') for (const value of ['role="dialog"', 'maxLength="6"', 'Resend in 30s', 'Synthetic invalid code', 'Verify &amp; place order']) assert.ok(html.includes(value), value);
});
test('checkout submit/consent/OTP are callbacks owned by the trusted adapter', () => {
    const actions = fixtureActions().core, data = pageData('checkout', 'otp').core;
    const tree = walk(h.ui.ProtectedCore({ pageKind: 'checkout', data, actions }));
    assert.equal(tree.find(node => node.type === h.ui.CheckoutPageShell).props.onSubmit, actions.submit);
    assert.equal(tree.find(node => node.type === h.ui.CheckoutOtpModal).props.onVerifyCode, actions.verifyOtp);
    assert.equal(tree.find(node => node.type === h.ui.CheckoutOrderSummary).props.setPolicyAccepted, actions.policyConsent);
});

const attacks = {
    unknownType: d => { d.templates.tpl_home.nodes.story_text.type = 'script'; },
    html: d => { d.templates.tpl_home.nodes.story_text.content.text = '<img src=x onerror=alert(1)>'; },
    expression: d => { d.templates.tpl_home.nodes.story_text.content.text = '${privateOrder.token}'; },
    handler: d => { d.templates.tpl_home.nodes.story_text.onClick = 'fetch(x)'; },
    cssString: d => { d.templates.tpl_home.nodes.story_text.styles = 'color:red'; },
    className: d => { d.templates.tpl_home.nodes.story_text.className = 'hidden'; },
    cssURL: d => { d.templates.tpl_home.nodes.story_text.styles = { base: { background: { hex: 'url(x)' } } }; },
    clipping: d => { d.templates.tpl_home.nodes.story_text.styles = { base: { overflow: 'hidden' } }; },
    unsafeURL: d => { d.templates.tpl_home.nodes.story_link.content.destination = { kind: 'https', url: 'javascript:alert(1)' }; },
    encodedURL: d => { d.templates.tpl_home.nodes.story_link.content.destination = { kind: 'storePath', path: '/%252fexample.test' }; },
    missingNode: d => { delete d.templates.tpl_home.nodes.story_text; },
    cycle: d => { d.templates.tpl_home.nodes.stack.slots.body.push('section_story'); },
    sharedChild: d => { d.templates.tpl_home.nodes.stack.slots.body.push('story_text'); },
    unreachable: d => { d.templates.tpl_home.nodes.orphan = { type: 'content.text', content: { text: 'Orphan' } }; },
    removeCore: d => { d.templates.tpl_product.rootOrder.shift(); delete d.templates.tpl_product.nodes.core_tpl_product; },
    moveCore: d => { d.templates.tpl_product.rootOrder.reverse(); },
    duplicateCore: d => { d.templates.tpl_product.nodes.copy = { type: 'product.core', source: { kind: 'currentProduct' } }; d.templates.tpl_product.rootOrder.push('copy'); },
    hiddenCore: d => { d.templates.tpl_checkout.nodes.core_tpl_checkout.styles = { base: { visible: false } }; },
    hiddenError: d => { d.templates.tpl_checkout.nodes.core_tpl_checkout.partStyles.error.base.visible = false; },
    tinyField: d => { d.templates.tpl_checkout.nodes.core_tpl_checkout.partStyles.input = { base: { fontSize: px(1) } }; },
    priceContent: d => { d.templates.tpl_product.nodes.core_tpl_product.content = { price: 1 }; },
    privateSource: d => { d.templates.tpl_home.nodes.products.source = { kind: 'currentCustomer' }; },
    arbitraryEndpoint: d => { d.templates.tpl_home.nodes.products.source = { kind: 'catalog', limit: 2, endpoint: '/orders' }; },
    prototype: d => { Object.defineProperty(d.templates.tpl_home.nodes, '__proto__', { value: {}, enumerable: true }); },
    oversized: d => { d.templates.tpl_home.nodes.story_text.content.text = 'x'.repeat(300000); },
};
for (const [name, attack] of Object.entries(attacks)) test(`renderer boundary rejects ${name} without modifying or rendering input`, () => {
    const document = renderDocument(); attack(document);
    const before = JSON.stringify(document), result = resolve(document);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length);
    assert.equal(JSON.stringify(document), before);
    assert.equal(result.value, undefined);
});
test('getters fail without execution and foreign plans/scopes cannot reach the CSS compiler', () => {
    const document = renderDocument();
    Object.defineProperty(document, 'templates', { get() { throw new Error('Getter executed'); }, enumerable: true });
    assert.equal(resolve(document).valid, false);
    assert.throws(() => h.ui.compileAdaptiveStyles({}, 'ab_12'), TypeError);
    assert.throws(() => h.ui.compileAdaptiveStyles(resolve().value, 'x"]{color:red}'), TypeError);
});
for (const kind of ['product', 'checkout']) test(`${kind}: invalid runtime plan retains the trusted commerce core, excludes merchant decoration`, () => {
    const html = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { pageKind: kind, plan: { pageKind: kind }, data: pageData(kind), actions: fixtureActions() }));
    assert.match(html, /data-ab-fallback="invalid-plan"/);
    assert.ok(!html.includes('Shipping and support information'));
    assert.ok(html.includes(kind === 'product' ? 'Add to Cart' : 'checkout-policy-consent'));
});
test('unresolved media has accessible fallback; no URL is taken from merchant content', () => {
    const data = pageData('home'); delete data.assets[assetId];
    const html = render('home', undefined, { props: { data } });
    assert.match(html, /role="img" aria-label="Synthetic ceramic vessel"/);
});
for (const url of ['javascript:alert(1)', 'data:image/svg+xml,x', 'blob:x', '//evil.example/x.png', 'https://evil.example/x.png', '/\\evil.example/x.png']) test(`unapproved media context fails closed: ${url.split(':')[0]}`, () => {
    const data = pageData('home'); data.assets[assetId].url = url;
    const html = render('home', undefined, { props: { data } });
    assert.match(html, /role="img" aria-label="Synthetic ceramic vessel"/);
    assert.ok(!html.includes(`src="${url}"`));
});
test('all approved typed design groups compile and core part declarations override existing inline styles safely', () => {
    const document = renderDocument();
    document.templates.tpl_home.nodes.story_text.styles.base = { color: { token: 'foreground' }, background: { hex: '#fff' }, fontFamily: 'Georgia',
        fontSize: px(32), fontWeight: 700, lineHeight: 1.5, letterSpacing: px(0), textAlign: 'center', width: { unit: 'percent', value: 80 },
        maxWidth: px(960), marginBlockStart: px(0), marginBlockEnd: px(12), marginInlineStart: px(0), marginInlineEnd: px(0),
        paddingInlineStart: px(8), paddingInlineEnd: px(8), paddingBlockEnd: px(8), borderColor: { hex: '#123' }, borderWidth: px(1), borderRadius: px(8) };
    const css = h.ui.compileAdaptiveStyles(resolve(document).value, 'ab_1234');
    for (const value of ['background:#ffffff', 'font-family:Georgia,serif', 'font-weight:700', 'line-height:1.5', 'letter-spacing:0rem',
        'width:min(100%,80%)', 'max-width:min(100%,960px)', 'margin-block-start:0px', 'border-color:#112233', 'border-style:solid']) assert.ok(css.includes(value), value);
    const checkoutCss = h.ui.compileAdaptiveStyles(resolve(document, 'checkout').value, 'ab_1234');
    assert.ok(checkoutCss.includes('border-radius:8px!important'));
    assert.ok(checkoutCss.includes('[data-ab-part="primaryButton"]'));
    assert.ok(!checkoutCss.includes('overflow:hidden'));
});
test('mobile stacking false survives; media height and stack alignment use only registered declarations', () => {
    const document = renderDocument(), nodes = document.templates.tpl_home.nodes;
    nodes.columns.styles.base.stackOnMobile = false;
    nodes.image.styles.base.height = px(180);
    nodes.stack.styles.base.alignItems = 'center'; nodes.stack.styles.base.justifyContent = 'space-between';
    const css = h.ui.compileAdaptiveStyles(resolve(document).value, 'ab_1234');
    for (const value of ['grid-template-columns:repeat(2,minmax(0,1fr))', 'height:180px', 'align-items:center', 'justify-content:space-between']) assert.ok(css.includes(value));
});
test('preview and storefront-like adapters share exact SSR, styles, parts, order and repeated deterministic output', () => {
    for (const kind of ['home', 'product', 'checkout']) {
        const called = { preview: 0, liveLike: 0 };
        const runtime = context => ({
            Link: ({ children, prefetch, ...props }) => { void prefetch; called[context]++; return h.React.createElement('a', props, children); },
            Image: ({ unoptimized, priority, ...props }) => { void unoptimized; void priority; called[context]++; return h.React.createElement('img', props); },
        });
        const preview = render(kind, undefined, { props: { runtime: runtime('preview') } });
        const liveLike = render(kind, undefined, { props: { runtime: runtime('liveLike') } });
        assert.equal(preview, liveLike);
        assert.equal(preview, render(kind, undefined, { props: { runtime: runtime('preview') } }));
        assert.ok(called.preview > 0 && called.liveLike > 0);
    }
});
test('no synthetic outbound I/O or action executes; dependency graph contains no live controller', () => {
    const originalFetch = global.fetch;
    global.fetch = () => { throw new Error('Outbound I/O from fixture'); };
    try { for (const kind of ['home', 'product', 'checkout']) render(kind, kind === 'checkout' ? 'otp' : 'normal'); }
    finally { global.fetch = originalFetch; }
    assert.ok(h.modules.every(file => !/\/api\/|AuthContext|CartContext|checkout\/hooks|backend\/models/.test(file.replaceAll('\\', '/'))));
});
test('legacy renderer root and real routes do not import the inactive entry; all dependencies unchanged', () => {
    const rootSource = fs.readFileSync(path.join(root, 'packages/storefront-renderer/index.jsx'), 'utf8');
    assert.ok(!rootSource.includes('adaptive'));
    const packageJson = require('../../../packages/storefront-renderer/package.json');
    assert.equal(packageJson.exports['./adaptive'], './adaptive/index.jsx');
    assert.equal(packageJson.dependencies, undefined);
});
