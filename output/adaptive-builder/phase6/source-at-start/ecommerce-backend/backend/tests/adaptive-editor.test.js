'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAdaptiveEditor } = require('./helpers/adaptive-editor.cjs');
const { editorTheme, editorBootstrap, tokens } = require('./fixtures/adaptive-builder/editor-fixtures.cjs');
const { sizedFixture } = require('./fixtures/adaptive-builder/contract-fixtures.cjs');
const { normalizeStoredTheme } = require('../../../packages/storefront-theme/storage.cjs');
let h;
test.before(async () => { h = await loadAdaptiveEditor(); });
const select = (nodeId = 'story_text', more = {}) => ({ templateId: 'tpl_home', nodeId, partId: null, viewport: 'base', ...more });
const run = (theme, command) => h.ui.applyAdaptiveEdit(theme, { templateId: 'tpl_home', ...command });
test('page/global assignments and supported adapters resolve from one existing document', () => {
    const theme = editorTheme();
    for (const region of ['home', 'header', 'footer']) {
        assert.equal(h.ui.regionTemplateId(theme.siteBuilder, region), `tpl_${region}`);
        const result = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind: region, colorTokens: tokens });
        assert.equal(result.valid, true, JSON.stringify(result.errors));
    }
});
test('a client rollout boolean cannot make a v4 store or absent server grant editable', () => {
    for (const theme of [{ version: 4 }, editorTheme()]) for (const availability of [null, {}, { available: false }, { enabled: true }]) assert.equal(h.ui.mayOpenAdaptiveEditor(theme, availability), false);
    assert.equal(h.ui.mayOpenAdaptiveEditor({ version: 4 }, { available: true }), false);
    assert.equal(h.ui.mayOpenAdaptiveEditor(editorTheme(), { available: true }), true);
});
test('disabled editor renders no interactive adoption route or inspector', () => {
    const html = h.render(h.React.createElement(h.ui.AdaptiveStoreEditor, { theme: editorTheme(), availability: { available: false } }));
    assert.match(html, /disabled by the server/); assert.ok(!html.includes('<input') && !html.includes('<iframe'));
});
test('stable selection rejects unassigned pages, foreign nodes, parts and viewports', () => {
    const doc = editorTheme().siteBuilder;
    assert.deepEqual(h.ui.validateSelection(doc, select()), select());
    for (const value of [select('foreign'), select('story_text', { partId: 'unsafe' }), select('story_text', { viewport: 'watch' }), select(null, { templateId: 'unassigned' })]) assert.equal(h.ui.validateSelection(doc, value), null);
    assert.ok(h.ui.validateSelection(doc, select(null, { templateId: 'tpl_checkout' })));
});
test('flattened hierarchy exposes parent/slot identity independently of display order', () => {
    const tree = editorTheme().siteBuilder.templates.tpl_home;
    const row = h.ui.flattenTree(tree).find(row => row.nodeId === 'column_copy');
    assert.deepEqual(row, { nodeId: 'column_copy', parentId: 'columns', slot: 'columns', depth: 2 });
});
for (const kind of ['hero', 'story', 'promotion', 'banner', 'content.section', 'content.text', 'content.image', 'content.link', 'catalog.products', 'catalog.categories']) test(`compatible insertion: ${kind}`, () => {
    const theme = editorTheme(), before = JSON.stringify(theme);
    const fragment = h.ui.createBlockFragment(theme.siteBuilder, kind, 'a11111111111111111111111');
    const result = run(theme, { kind: 'add', fragment, placement: { index: theme.siteBuilder.templates.tpl_home.rootOrder.length } });
    assert.equal(result.valid, true, JSON.stringify(result.errors)); assert.equal(JSON.stringify(theme), before);
    const second = h.ui.createBlockFragment(result.value.siteBuilder, kind, 'a11111111111111111111111');
    assert.notEqual(second.rootId, fragment.rootId);
});
test('invalid nested group insertion cannot mutate existing configuration', () => {
    const theme = editorTheme(), before = JSON.stringify(theme);
    const fragment = h.ui.createBlockFragment(theme.siteBuilder, 'layout.columns');
    const result = run(theme, { kind: 'add', fragment, placement: { parentId: 'columns', slot: 'columns', index: 0 } });
    assert.equal(result.valid, false); assert.equal(JSON.stringify(theme), before);
});
test('move targets exclude descendants, unsupported pages and protected cores', () => {
    const tree = editorTheme().siteBuilder.templates.tpl_home;
    assert.ok(h.ui.compatiblePlacements(tree, 'content.text').some(item => item.placement.parentId === 'section_story'));
    assert.ok(!h.ui.compatiblePlacements(tree, 'content.section', 'section_story').some(item => item.placement.parentId));
    assert.deepEqual(h.ui.compatiblePlacements(editorTheme().siteBuilder.templates.tpl_header, 'header.core'), []);
});
for (const region of ['header', 'footer']) test(`${region} protected core rejects removal/visibility/copy/move`, () => {
    const theme = editorTheme(), templateId = `tpl_${region}`, nodeId = `core_${templateId}`;
    for (const command of [{ kind: 'remove' }, { kind: 'copy', placement: { index: 1 } }, { kind: 'move', placement: { index: 0 } }, { kind: 'setStyle', tier: 'base', property: 'visible', value: false }, { kind: 'saveSection', savedSectionId: 'bad_saved', name: 'Core copy' }]) assert.equal(h.ui.applyAdaptiveEdit(theme, { ...command, templateId, nodeId }).valid, false);
});
test('copy, move and removal retain stable unrelated node identities and content', () => {
    const theme = editorTheme();
    const copy = run(theme, { kind: 'copy', nodeId: 'story_text', placement: { index: 0 } }); assert.equal(copy.valid, true);
    const id = copy.insertedIds.story_text; assert.notEqual(id, 'story_text');
    const move = run(copy.value, { kind: 'move', nodeId: id, placement: { index: 1 } }); assert.equal(move.valid, true);
    const remove = run(move.value, { kind: 'remove', nodeId: id }); assert.equal(remove.valid, true);
    assert.deepEqual(remove.value.siteBuilder.templates.tpl_home.nodes.story_text, theme.siteBuilder.templates.tpl_home.nodes.story_text);
});
test('section-specific desktop edit and reset preserve mobile, sibling styles and content', () => {
    const theme = editorTheme();
    const edit = run(theme, { kind: 'setStyle', nodeId: 'story_text', tier: 'desktop', property: 'fontSize', value: { unit: 'px', value: 40 } });
    assert.equal(edit.valid, true); assert.equal(edit.value.siteBuilder.templates.tpl_home.nodes.story_text.styles.base.fontSize.value, 24);
    assert.deepEqual(edit.value.siteBuilder.templates.tpl_home.nodes.column_copy, theme.siteBuilder.templates.tpl_home.nodes.column_copy);
    assert.equal(h.ui.styleOrigin(edit.value, select('story_text', { viewport: 'desktop' }), 'fontSize'), 'Explicit override');
    const reset = run(edit.value, { kind: 'resetStyle', nodeId: 'story_text', tier: 'desktop', property: 'fontSize' });
    assert.equal(reset.valid, true); assert.equal(h.ui.styleOrigin(reset.value, select('story_text', { viewport: 'desktop' }), 'fontSize'), 'Inherited · Mobile');
});
test('atomic page reset preserves every node and its overrides', () => {
    const theme = editorTheme(), nodes = structuredClone(theme.siteBuilder.templates.tpl_home.nodes);
    const result = run(theme, { kind: 'resetPageStyles' }); assert.equal(result.valid, true);
    assert.equal(result.value.siteBuilder.templates.tpl_home.styles, undefined); assert.deepEqual(result.value.siteBuilder.templates.tpl_home.nodes, nodes);
});
test('saved sections are independent copies, rename safely, and deletion retains inserted nodes', () => {
    const theme = editorTheme();
    const saved = run(theme, { kind: 'saveSection', nodeId: 'section_story', savedSectionId: 'saved_story', name: 'Story copy' });
    assert.equal(saved.valid, true, JSON.stringify(saved.errors));
    assert.notEqual(saved.value.siteBuilder.savedSections.saved_story.rootOrder[0], 'section_story');
    const renamed = run(saved.value, { kind: 'renameSaved', savedSectionId: 'saved_story', name: 'Renamed story' });
    const inserted = run(renamed.value, { kind: 'insertSaved', savedSectionId: 'saved_story', placement: { index: 0 } });
    assert.equal(inserted.valid, true);
    const removed = run(inserted.value, { kind: 'deleteSaved', savedSectionId: 'saved_story' });
    assert.equal(removed.valid, true); assert.deepEqual(removed.value.siteBuilder.templates, inserted.value.siteBuilder.templates);
});
test('presets expose affected styles and enforce compatible references without recursion', () => {
    const theme = editorTheme();
    const saved = run(theme, { kind: 'savePreset', nodeId: 'story_text', presetId: 'preset_text', name: 'Editorial text' }); assert.equal(saved.valid, true);
    const applied = run(saved.value, { kind: 'applyPreset', nodeId: 'column_copy', presetId: 'preset_text' }); assert.equal(applied.valid, true);
    assert.equal(h.ui.styleOrigin(applied.value, select('column_copy'), 'fontSize'), 'Explicit override');
    assert.equal(run(applied.value, { kind: 'deletePreset', presetId: 'preset_text' }).valid, false);
    assert.equal(run(saved.value, { kind: 'applyPreset', nodeId: 'image', presetId: 'preset_text' }).valid, false);
});
test('unsafe names, references, styles and content fail closed with stable target errors', () => {
    const theme = editorTheme();
    for (const command of [
        { kind: 'saveSection', nodeId: 'story_text', savedSectionId: '__proto__', name: 'unsafe' },
        { kind: 'savePreset', nodeId: 'story_text', presetId: 'x', name: '<script>' },
        { kind: 'content', nodeId: 'story_text', content: { text: '<img src=x onerror=x>' } },
        { kind: 'setStyle', nodeId: 'story_text', tier: 'base', property: 'position', value: 'absolute' },
        { kind: 'content', nodeId: 'story_link', content: { label: 'Unsafe', destination: { kind: 'https', url: 'javascript:alert(1)' } } },
    ]) { const result = run(theme, command); assert.equal(result.valid, false); assert.ok(result.errors.length); }
});
test('old, future, malformed and stale recovery copies are handled without mutation or silent dropping', () => {
    const snapshot = JSON.stringify({ theme: editorTheme(), searchAliases: [], customDomain: {}, storewideDiscount: 0 });
    for (const formatVersion of [undefined, 1]) assert.equal(h.ui.parseBuilderRecovery({ snapshot, formatVersion, basedOnRevision: 7 }, 7).compatible, true);
    for (const record of [{ snapshot, formatVersion: 2 }, { snapshot, basedOnRevision: 8 }, { snapshot: '{' }, { snapshot: JSON.stringify({ theme: { version: 6 } }) }]) {
        const before = JSON.stringify(record), result = h.ui.parseBuilderRecovery(record, 0);
        assert.equal(result.compatible, false); assert.ok(result.message); assert.equal(JSON.stringify(record), before);
    }
});
test('validation issues map to stable node identities after reordering', () => {
    const doc = editorTheme().siteBuilder;
    const issue = { path: ['siteBuilder', 'templates', 'tpl_home', 'nodes', 'column_copy', 'styles', 'base', 'fontSize'] };
    assert.equal(h.ui.selectedIssue(doc, issue, 'desktop').nodeId, 'column_copy');
    doc.templates.tpl_home.rootOrder.reverse(); assert.equal(h.ui.selectedIssue(doc, issue, 'desktop').nodeId, 'column_copy');
    const partIssue = { path: ['siteBuilder', 'templates', 'tpl_home', 'nodes', 'products', 'partStyles', 'card', 'desktop', 'color'] };
    assert.equal(h.ui.selectedIssue(doc, partIssue, 'desktop').partId, 'card');
});

test('template and global editor loading preserve every v5 field and reject newer formats', () => {
    const theme = editorTheme();
    assert.ok(h.ui.parseBuilderRecovery({ snapshot: h.ui.stableStringify({ theme }), basedOnRevision: 0 }, 0).compatible);
    assert.equal(h.ui.parseBuilderRecovery({ snapshot: h.ui.stableStringify({ theme: { ...theme, version: 6 } }), basedOnRevision: 0 }, 0).compatible, false);
});
test('real contextual shell exposes three modes, real viewports, tree and supported controls', () => {
    const bootstrap = editorBootstrap();
    const html = h.render(h.React.createElement(h.ui.AdaptiveStoreEditor, { theme: bootstrap.shop.theme, availability: bootstrap.adaptiveAvailability,
        shop: bootstrap.shop, products: bootstrap.products, assets: bootstrap.adaptiveAssets, onThemeChange() {} }));
    for (const text of ['Quick Edit', 'Design Mode', 'Advanced Mode', 'Global header', 'Global footer', 'section tree', 'sandbox="allow-same-origin"', 'Preview only', 'Design inspector']) assert.ok(html.toLowerCase().includes(text.toLowerCase()), text);
    assert.match(html, /value="checkout">Checkout/);
    assert.match(html, /Synthetic preview state/);
});
test('global render adapters reuse real navigation/identity/policy components and safe scoped parts', () => {
    const theme = editorTheme();
    for (const region of ['header', 'footer']) {
        const core = theme.siteBuilder.templates[`tpl_${region}`].nodes[`core_tpl_${region}`];
        core.styles = { base: { color: { hex: '#ffffff' }, background: { hex: '#111111' } } };
        const result = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind: region, colorTokens: tokens }); assert.equal(result.valid, true);
        const html = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan: result.value, pageKind: region, data: { core: { theme, shopName: 'Synthetic Studio', preview: true } } }));
        for (const value of ['Synthetic Studio', 'data-ab-part="identity"', 'data-ab-part="navigation"', '--ab-surface:#111111']) assert.ok(html.includes(value), value);
        if (region === 'footer') for (const value of ['/policies/shipping', '/policies/refund', '/policies/privacy', '/policies/terms']) assert.ok(html.includes(value), value);
    }
});
test('editor dependency graph and SSR never call a live commerce controller or network transport', () => {
    assert.ok(h.modules.every(file => !/\/api\/|AuthContext|CartContext|axios|checkout\/hooks/.test(file.replaceAll('\\', '/'))));
});

test('Builder and read-only rendering share identical content, styles and global views', () => {
    const theme = editorTheme();
    for (const pageKind of ['home', 'header', 'footer']) {
        const plan = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind, colorTokens: tokens }).value;
        const data = { core: { theme, shopName: 'Synthetic Studio', preview: true } };
        const render = editor => h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan, pageKind, data, editor }));
        assert.equal(render(true).replace(/ tabindex="0"/g, ''), render(false));
    }
});

test('Quick Edit exposes only compatible existing presets', () => {
    const theme = run(editorTheme(), { kind: 'savePreset', nodeId: 'story_text', presetId: 'quick_text', name: 'Editorial text' }).value;
    const plan = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind: 'home', colorTokens: tokens }).value;
    const html = h.render(h.React.createElement(h.ui.AdaptiveInspector, { theme, selection: select(), plan, mode: 'quick', run() {} }));
    assert.ok(html.includes('Style preset')); assert.ok(html.includes('Editorial text'));
    const image = h.render(h.React.createElement(h.ui.AdaptiveInspector, { theme, selection: select('image'), plan, mode: 'quick', run() {} }));
    assert.ok(!image.includes('Editorial text'));
});

for (const preset of require('@scaleup/storefront-theme/prebuilt').PREBUILT_THEMES) for (const pageKind of ['header', 'footer']) test(`inactive ${pageKind} adapter retains ${preset.id} identity and navigation`, () => {
    const legacy = require('@scaleup/storefront-theme/prebuilt').resolvePrebuiltTheme({ presetId: preset.id, appliedAt: '2026-10-01T00:00:00.000Z' });
    const theme = normalizeStoredTheme({ ...legacy, version: 5, siteBuilder: editorTheme().siteBuilder });
    const result = h.ui.resolveAdaptivePage({ siteBuilder: theme.siteBuilder, pageKind, colorTokens: h.ui.editorTokens(theme) });
    assert.equal(result.valid, true, JSON.stringify(result.errors));
    const html = h.render(h.React.createElement(h.ui.PageTemplateRenderer, { plan: result.value, pageKind, data: { core: { theme, shopName: 'Synthetic Studio', preview: true } } }));
    assert.ok(html.includes('Synthetic Studio')); assert.ok(html.includes('data-ab-part="identity"'));
    if (pageKind === 'footer') assert.ok(html.includes('/policies/privacy')); else assert.ok(html.includes('/cart'));
    if (preset.id === 'atelier-editorial') assert.ok(html.includes(`atelier-${pageKind}`));
});
test('near-limit configuration remains bounded and supports one stable selection without duplicating state', () => {
    const theme = normalizeStoredTheme({ version: 5, siteBuilder: sizedFixture(200) });
    const tree = theme.siteBuilder.templates.tpl_home;
    const rows = h.ui.flattenTree(tree); assert.equal(rows.length, 50);
    const selected = h.ui.validateSelection(theme.siteBuilder, select(rows.at(-1).nodeId)); assert.ok(selected);
    const result = run(theme, { kind: 'copy', nodeId: rows.at(-1).nodeId, placement: { index: tree.rootOrder.length } });
    assert.equal(result.valid, false); assert.equal(Object.keys(theme.siteBuilder.templates.tpl_home.nodes).length, 50);
});
