'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAdaptiveRenderer } = require('./helpers/adaptive-renderer.cjs');
const a = require('../../../packages/storefront-theme/adaptive.cjs');
const { remediationDocument } = require('./fixtures/adaptive-builder/remediation-fixtures.cjs');
const { renderDocument, tokens, px, pageData, fixtureActions } = require('./fixtures/adaptive-builder/render-fixtures.cjs');
let h;
test.before(async () => { h = await loadAdaptiveRenderer(); });
const resolve = (document, pageKind) => h.ui.resolveAdaptivePage({ siteBuilder: document, pageKind, colorTokens: tokens });
for (const kind of ['product', 'checkout']) {
    test(`${kind}: manifest, blueprint, commands and renderer agree on core-first placement`, () => {
        const document = renderDocument(), templateId = `tpl_${kind}`, coreId = `core_${templateId}`;
        assert.equal(a.PAGE_TEMPLATES[kind].corePosition, 0);
        assert.deepEqual(a.PAGE_TEMPLATES[kind].surroundingContent, { beforeCore: false, afterCore: true });
        assert.equal(a.createPageTemplate(templateId, kind).rootOrder[0], coreId);
        const before = JSON.stringify(document);
        for (const command of [
            { kind: 'move', nodeId: coreId, placement: { index: 1 } },
            { kind: 'remove', nodeId: coreId },
            { kind: 'copy', nodeId: coreId, placement: { index: 1 } },
            { kind: 'move', nodeId: `${kind}_note`, placement: { index: 0 } },
        ]) assert.equal(a.applyPageTemplateCommand(document, { ...command, templateId }, tokens).valid, false);
        assert.equal(JSON.stringify(document), before);
        assert.equal(resolve(document, kind).valid, true);
        document.templates[templateId].rootOrder.reverse();
        assert.equal(resolve(document, kind).valid, false);
    });
    for (const mode of ['default', 'light', 'dark', 'custom', 'edge']) test(`${kind}/${mode}: semantic palette renders without changing commerce data`, () => {
        const document = remediationDocument(mode), before = JSON.stringify(document);
        const result = resolve(document, kind);
        assert.equal(result.valid, true, JSON.stringify(result.errors));
        const html = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan: result.value, pageKind: kind,
            data: pageData(kind, kind === 'checkout' ? 'otp' : 'long'), actions: fixtureActions() }));
        assert.match(html, /data-ab-surface/);
        assert.ok(html.includes(kind === 'product' ? 'Add to Cart' : 'checkout-policy-consent'));
        assert.equal(JSON.stringify(document), before);
        assert.ok(!html.includes('CORE_PALETTE_ADAPTER'));
    });
    test(`${kind}: low-contrast critical text and invisible controls fail closed`, () => {
        const document = remediationDocument('dark'), core = document.templates[`tpl_${kind}`].nodes[`core_tpl_${kind}`];
        core.partStyles.error.base.color = { hex: '#101826' };
        assert.equal(resolve(document, kind).valid, false);
        core.partStyles.error.base.color = { hex: '#ffffff' };
        core.partStyles.primaryButton.base = { color: { hex: '#ffffff' }, background: { hex: '#101826' }, borderColor: { hex: '#101826' } };
        const result = resolve(document, kind);
        assert.ok(result.errors.some(error => error.code === 'CONTROL_CONTRAST'));
    });
}
test('summary, label and input contrast is checked against each actual parent context', () => {
    const document = remediationDocument('edge'), core = document.templates.tpl_checkout.nodes.core_tpl_checkout;
    core.partStyles.label.base.color = { hex: '#000000' };
    const result = resolve(document, 'checkout');
    assert.ok(result.errors.some(error => error.code === 'CORE_CONTRAST' && error.message.includes('summary')));
});
test('zero-width control border cannot bypass the distinguishable control requirement', () => {
    const document = remediationDocument('dark'), core = document.templates.tpl_checkout.nodes.core_tpl_checkout;
    core.partStyles.primaryButton.base = { color: { hex: '#ffffff' }, background: { hex: '#101826' }, borderWidth: px(0) };
    assert.ok(resolve(document, 'checkout').errors.some(error => error.code === 'CONTROL_CONTRAST'));
});
test('control-only border edits are checked without activating an unrelated core palette', () => {
    const document = renderDocument(), core = document.templates.tpl_checkout.nodes.core_tpl_checkout;
    delete core.partStyles.primaryButton;
    core.styles = { base: { borderColor: { hex: '#123456' }, borderWidth: px(1) } };
    core.partStyles.surface = { base: { borderColor: { hex: '#123456' }, paddingInlineStart: px(8) } };
    const result = resolve(document, 'checkout');
    assert.equal(result.value.nodes.core_tpl_checkout.palette, undefined);
    const css = h.ui.compileAdaptiveStyles(result.value, 'ab_1234');
    assert.match(css, /border-color:#123456/);
    assert.ok(!css.includes('--ab-border'));
    assert.ok(!css.includes('[data-ab-part="surface"]>'));
    core.partStyles.input = { base: { borderWidth: px(0) } };
    assert.ok(resolve(document, 'checkout').errors.some(error => error.code === 'CONTROL_CONTRAST'));
});
test('no-paint core retains its original view appearance and has no palette rules', () => {
    const document = renderDocument();
    delete document.templates.tpl_checkout.nodes.core_tpl_checkout.partStyles.primaryButton;
    const result = resolve(document, 'checkout');
    assert.equal(result.value.nodes.core_tpl_checkout.palette, undefined);
    assert.ok(!h.ui.compileAdaptiveStyles(result.value, 'ab_1234').includes('--ab-ink'));
});
test('part typography uses local variables, not inherited box declarations or broad tag selectors', () => {
    const result = resolve(remediationDocument('custom'), 'checkout');
    const css = h.ui.compileAdaptiveStyles(result.value, 'ab_1234');
    assert.match(css, /\[data-ab-part="summary"\]\{--ab-type-font-size:1.25rem/);
    assert.match(css, /\[data-ab-part="label"\]\{--ab-type-font-size:1rem/);
    assert.match(css, /\[data-ab-part="input"\]/);
    assert.match(css, /line-height:var\(--ab-type-line-height,1.5\)!important/);
    assert.ok(!css.includes('label,label'));
    assert.equal(result.value.nodes.core_tpl_checkout.parts.label.base.paddingBlockStart, undefined);
});
test('safe optional media/minimum section height and constrained page width compile across tiers', () => {
    const document = remediationDocument('custom', true);
    const home = resolve(document, 'home');
    assert.equal(home.valid, true, JSON.stringify(home.errors));
    const css = h.ui.compileAdaptiveStyles(home.value, 'ab_1234');
    for (const declaration of ['min-height:120px', 'object-fit:cover', 'max-width:min(100%,520px)', 'gap:24px!important']) assert.ok(css.includes(declaration), declaration);
    assert.equal(home.value.nodes.image.styles.base.maxWidth, undefined, 'page box must never inherit');
    for (const [property, value] of [['minHeight', px(601)], ['objectFit', 'fill']]) {
        const bad = remediationDocument();
        bad.templates.tpl_home.nodes[property === 'minHeight' ? 'section_story' : 'image'].styles.base[property] = value;
        assert.equal(resolve(bad, 'home').valid, false);
    }
});
for (const width of [px(160), { unit: 'percent', value: 50 }]) test(`functional page rejects unsafe outer width ${JSON.stringify(width)}`, () => {
    const document = renderDocument(); document.templates.tpl_checkout.styles = { base: { maxWidth: width } };
    assert.equal(resolve(document, 'checkout').valid, false);
});
test('protected cores cannot receive optional sizing, visibility or layout extensions', () => {
    for (const [property, value] of [['minHeight', px(0)], ['objectFit', 'cover'], ['maxWidth', px(520)], ['visible', false]]) {
        const document = renderDocument(); document.templates.tpl_checkout.nodes.core_tpl_checkout.styles = { base: { [property]: value } };
        assert.equal(resolve(document, 'checkout').valid, false);
    }
});
test('explicit adapter capabilities cover all shared registered styles without advertising absent pages', () => {
    const capabilities = h.ui.ADAPTIVE_RENDER_CAPABILITIES;
    assert.equal(Object.isFrozen(capabilities), true);
    for (const kind of a.PAGE_KINDS) {
        assert.equal(capabilities[kind].supported, a.PAGE_KINDS.includes(kind));
        if (!capabilities[kind].supported) { assert.equal(capabilities[kind].reason, 'PAGE_ADAPTER'); continue; }
        assert.deepEqual(capabilities[kind].pageStyles, a.PAGE_TEMPLATES[kind].styles);
        for (const [type, block] of Object.entries(capabilities[kind].blocks)) {
            assert.deepEqual(block.styles, a.BLOCK_REGISTRY[type].styles);
            assert.deepEqual(block.parts, a.BLOCK_REGISTRY[type].parts);
        }
    }
});
test('explicit missing product state cannot reveal stale purchase controls', () => {
    const data = pageData('product'); data.core.state = 'missing';
    const result = resolve(renderDocument(), 'product');
    const html = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan: result.value, pageKind: 'product', data, actions: fixtureActions() }));
    assert.match(html, /Product unavailable/);
    assert.ok(!html.includes('Add to Cart'));
});
test('small-height OTP remains scrollable, touch buttons and focus indicators have scoped safety rules', () => {
    const css = h.ui.compileAdaptiveStyles(resolve(remediationDocument('dark'), 'checkout').value, 'ab_1234');
    for (const rule of ['max-height:100dvh;overflow-y:auto', 'min-width:44px', 'outline:2px solid #fff!important', 'box-shadow:0 0 0 4px #000!important']) assert.ok(css.includes(rule), rule);
});
test('every advertised block/part style has a typed value and reaches the compiler', () => {
    const samples = {
        color: { hex: '#111111' }, background: { hex: '#ffffff' }, borderColor: { hex: '#111111' },
        fontFamily: 'Arial', fontSize: px(18), fontWeight: 700, lineHeight: 1.5, letterSpacing: px(1), textAlign: 'center',
        width: px(640), maxWidth: px(640), height: px(180), minHeight: px(120), aspectRatio: { width: 4, height: 3 }, objectFit: 'cover',
        ...Object.fromEntries(['paddingBlockStart', 'paddingBlockEnd', 'paddingInlineStart', 'paddingInlineEnd', 'marginBlockStart', 'marginBlockEnd', 'marginInlineStart', 'marginInlineEnd'].map(key => [key, px(8)])),
        borderWidth: px(1), borderRadius: px(8), gap: px(24), columns: 2, alignItems: 'center', justifyContent: 'center', stackOnMobile: false, visible: true, layoutMode: 'stack',
    };
    const covered = new Set();
    const base = renderDocument();
    for (const [templateId, template] of Object.entries(base.templates)) for (const [nodeId, node] of Object.entries(template.nodes)) {
        const block = a.BLOCK_REGISTRY[node.type];
        for (const [part, properties] of [['node', block.styles], ...Object.entries(block.parts)]) for (const property of properties) {
            covered.add(property);
            assert.ok(Object.hasOwn(samples, property), property);
            const document = renderDocument(), target = document.templates[templateId].nodes[nodeId];
            const styles = part === 'node' ? (target.styles ||= {}) : ((target.partStyles ||= {})[part] ||= {});
            (styles.base ||= {})[property] = samples[property];
            const result = resolve(document, template.pageKind);
            assert.equal(result.valid, true, `${node.type}/${part}/${property}: ${JSON.stringify(result.errors)}`);
            assert.ok(h.ui.compileAdaptiveStyles(result.value, 'ab_1234').length > 100);
            const resolved = part === 'node' ? result.value.nodes[nodeId].styles.base : result.value.nodes[nodeId].parts[part].base;
            assert.deepEqual(resolved[property], samples[property]);
        }
    }
    assert.deepEqual([...covered].sort(), Object.keys(a.STYLE_PROPERTIES).sort());
});
