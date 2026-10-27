'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const a = require('@scaleup/storefront-theme/adaptive');
const legacy = require('@scaleup/storefront-theme');
const { fixture, sizedFixture, text } = require('./fixtures/adaptive-builder/contract-fixtures.cjs');
const { deepFreeze } = require('../../../packages/storefront-theme/adaptiveData.cjs');
const copy = value => JSON.parse(JSON.stringify(value));
const root = path.resolve(__dirname, '../../..');
const valid = value => { const result = a.validatePageTemplates(value); assert.equal(result.valid, true, JSON.stringify(result.errors)); return result; };
const invalid = (value, code) => {
    const result = a.validatePageTemplates(value);
    assert.equal(result.valid, false, `Expected ${code}`);
    assert.ok(result.errors.some(error => error.code === code), JSON.stringify(result.errors));
    assert.ok(result.errors.every(error => Array.isArray(error.path) && typeof error.message === 'string'));
    return result;
};
const mutate = (fn, code) => { const d = fixture(); fn(d); return invalid(d, code); };
const run = (document, command) => {
    const before = copy(document), result = a.applyPageTemplateCommand(deepFreeze(document), deepFreeze(command));
    assert.deepEqual(document, before, 'original document never changes');
    return result;
};
const succeed = (document, command) => { const result = run(document, command); assert.equal(result.valid, true, JSON.stringify(result.errors)); valid(result.value); return result; };
const fail = (document, command, code) => { const result = run(document, command); assert.equal(result.valid, false); assert.ok(!Object.hasOwn(result, 'value')); if (code) assert.ok(result.errors.some(error => error.code === code), JSON.stringify(result.errors)); return result; };

test('registry names match the approved twelve page families and manifests are deeply immutable', () => {
    assert.deepEqual(a.PAGE_KINDS, ['home', 'product', 'category', 'collection', 'cart', 'checkout', 'account', 'track', 'policiesIndex', 'policy', 'header', 'footer']);
    assert.equal(a.ADAPTIVE_CONTRACT_VERSION, 1); assert.equal(legacy.THEME_SCHEMA_VERSION, 4);
    for (const block of Object.values(a.BLOCK_REGISTRY)) for (const field of ['pageKinds', 'parentSlots', 'slots', 'minChildren', 'maxChildren', 'contentFields', 'sourceKinds', 'styles', 'parts', 'operations', 'optional', 'protected']) assert.ok(Object.hasOwn(block, field), field);
    assert.throws(() => { a.BLOCK_REGISTRY['checkout.core'].operations.push('remove'); }, TypeError);
    assert.throws(() => { a.PAGE_TEMPLATES.checkout.requiredCore = null; }, TypeError);
    assert.equal(a.BLOCK_REGISTRY['catalog.products'].legacySectionType, 'FeaturedProducts');
});
for (const kind of a.PAGE_KINDS) test(`${kind}: valid versioned blueprint and matching default/global assignment`, () => valid(fixture([kind])));
for (const kind of a.PAGE_KINDS.filter(kind => kind !== 'home')) {
    test(`${kind}: missing, duplicated, nested and retyped protected cores are rejected`, () => {
        const templateId = `tpl_${kind}`, coreId = a.coreNodeId(templateId);
        const missing = fixture([kind]); missing.templates[templateId].rootOrder = []; delete missing.templates[templateId].nodes[coreId]; invalid(missing, 'REQUIRED_CORE');
        const duplicated = fixture([kind]); duplicated.templates[templateId].nodes.duplicate = copy(duplicated.templates[templateId].nodes[coreId]); duplicated.templates[templateId].rootOrder.push('duplicate'); invalid(duplicated, 'REQUIRED_CORE');
        const nested = fixture([kind]); nested.templates[templateId].nodes.section = { type: 'content.section', slots: { body: [coreId] } }; nested.templates[templateId].rootOrder = ['section']; invalid(nested, 'PARENT_SLOT');
        const retyped = fixture([kind]); retyped.templates[templateId].nodes[coreId] = text('Replacement'); invalid(retyped, 'RESERVED_ID');
    });
    for (const command of ['remove', 'copy', 'move', 'content', 'source']) test(`${kind}: command cannot ${command} a protected core`, () => {
        fail(fixture([kind]), { kind: command, templateId: `tpl_${kind}`, nodeId: a.coreNodeId(`tpl_${kind}`),
            ...(['copy', 'move'].includes(command) ? { placement: { index: 1 } } : {}), ...(command === 'content' ? { content: {} } : {}), ...(command === 'source' ? { source: {} } : {}) }, 'PROTECTED_OPERATION');
    });
}
test('home can be empty and non-adaptive assignments remain optional', () => valid(a.createPageTemplateDocument()));
for (const [label, edit, code] of [
    ['unknown root property', d => { d.required = false; }, 'UNKNOWN_PROPERTY'],
    ['unknown blueprint', d => { d.templates.tpl_home.blueprintId = 'custom'; }, 'BLUEPRINT'],
    ['unknown page family', d => { d.templates.tpl_home.pageKind = 'orders'; }, 'PAGE_KIND'],
    ['wrong assignment', d => { d.defaultTemplates.checkout = 'tpl_home'; }, 'ASSIGNMENT'],
    ['missing assigned template', d => { d.defaultTemplates.product = 'missing'; }, 'ASSIGNMENT'],
    ['header in page assignment', d => { d.defaultTemplates.header = 'tpl_header'; }, 'ASSIGNMENT'],
    ['unknown global', d => { d.globals.script = 'tpl_header'; }, 'ASSIGNMENT'],
    ['missing node', d => { d.templates.tpl_home.rootOrder.push('missing'); }, 'MISSING_NODE'],
    ['cross-template child', d => { d.templates.tpl_home.nodes.section_story.slots.body.push('core_tpl_product'); }, 'CROSS_TEMPLATE_REFERENCE'],
    ['duplicate root ownership', d => { d.templates.tpl_home.rootOrder.push('story_text'); }, 'MULTIPLE_OWNERS'],
    ['duplicate slot ownership', d => { d.templates.tpl_home.nodes.section_story.slots.body.push('story_text'); }, 'MULTIPLE_OWNERS'],
    ['unreachable node', d => { d.templates.tpl_home.nodes.orphan = text('Orphan'); }, 'UNREACHABLE_NODE'],
    ['cycle', d => { d.templates.tpl_home.nodes.section_story.slots.body.push('section_story'); }, 'GRAPH_CYCLE'],
    ['unreachable cycle', d => { d.templates.tpl_home.nodes.orphan = { type: 'content.section', slots: { body: ['orphan'] } }; }, 'GRAPH_CYCLE'],
    ['node collision across templates', d => { d.templates.tpl_product.nodes.story_text = text('Duplicate'); d.templates.tpl_product.rootOrder.push('story_text'); }, 'NODE_COLLISION'],
    ['unknown slot', d => { d.templates.tpl_home.nodes.section_story.slots.custom = []; }, 'UNKNOWN_PROPERTY'],
    ['empty required child slot', d => { d.templates.tpl_home.nodes.section_story.slots.body = []; }, 'SLOT_COUNT'],
    ['false slots', d => { d.templates.tpl_home.nodes.story_text.slots = false; }, 'OBJECT_REQUIRED'],
    ['unknown block type', d => { d.templates.tpl_home.nodes.story_text.type = 'custom.html'; }, 'BLOCK_TYPE'],
    ['prototype block value', d => { d.templates.tpl_home.nodes.story_text.type = '__proto__'; }, 'BLOCK_TYPE'],
    ['object block value', d => { d.templates.tpl_home.nodes.story_text.type = { toString: 'bad' }; }, 'BLOCK_TYPE'],
    ['object root reference', d => { d.templates.tpl_home.rootOrder.push({ toString: 'bad' }); }, 'MISSING_NODE'],
    ['forged conditional authority', d => { d.templates.tpl_checkout.nodes.core_tpl_checkout.required = false; }, 'UNKNOWN_PROPERTY'],
    ['checkout wrong source', d => { d.templates.tpl_checkout.nodes.core_tpl_checkout.source = { kind: 'currentOrder' }; }, 'SOURCE_BINDING'],
    ['functional source mutation', d => { d.templates.tpl_product.nodes.core_tpl_product.source.productId = 'aaaaaaaaaaaaaaaaaaaaaaaa'; }, 'UNKNOWN_PROPERTY'],
    ['private endpoint source', d => { d.templates.tpl_home.nodes.story_text.source = { kind: 'url', url: '/api/admin/orders' }; }, 'SOURCE_BINDING'],
    ['merchant functional HTML', d => { d.templates.tpl_checkout.nodes.core_tpl_checkout.content = { html: '<form>' }; }, 'UNKNOWN_PROPERTY'],
]) test(label, () => mutate(edit, code));
test('root slots enforce checkout ordering and tightly bounded surrounding content', () => {
    const d = fixture(['checkout']), tree = d.templates.tpl_checkout;
    tree.nodes.note = text('Delivery help'); tree.rootOrder.push('note'); valid(d);
    const reordered = copy(d); reordered.templates.tpl_checkout.rootOrder.reverse(); invalid(reordered, 'REQUIRED_CORE');
    tree.nodes.image = { type: 'content.image', content: { assetId: 'a'.repeat(24), alt: 'Test' } }; tree.rootOrder.push('image'); invalid(d, 'PAGE_COMPATIBILITY');
});
test('depth three is valid; deeper layout and forbidden nested groups fail', () => {
    const d = fixture(['home']), t = d.templates.tpl_home;
    t.nodes.section_story.slots.body = ['group']; t.nodes.group = { type: 'layout.stack', slots: { body: ['story_text', 'story_link'] } }; valid(d);
    t.nodes.group.slots.body = ['nested']; t.nodes.nested = { type: 'layout.stack', slots: { body: ['story_text', 'story_link'] } };
    invalid(d, 'LAYOUT_DEPTH'); invalid(d, 'CHILD_TYPE');
});
for (const key of ['__proto__', 'prototype', 'constructor', '$where', 'a.b']) test(`unsafe key rejected: ${key}`, () => {
    const d = fixture(); Object.defineProperty(d.templates.tpl_home.nodes.story_text.content, key, { value: {}, enumerable: true });
    invalid(d, 'UNSAFE_KEY'); assert.equal({}.polluted, undefined);
});
for (const value of [undefined, NaN, Infinity, () => {}, new Date(), new Map(), Object.create({ injected: true })]) test(`non-JSON input rejected: ${String(value)}`, () => {
    const d = fixture(); d.extra = value; invalid(d, 'JSON_TYPE');
});
test('cyclic JSON, sparse arrays and accessors are rejected without executing a getter', () => {
    const d = fixture(); d.extra = d; invalid(d, 'JSON_CYCLE');
    const sparse = fixture(); sparse.templates.tpl_home.rootOrder = new Array(2); invalid(sparse, 'JSON_ARRAY');
    let reads = 0; const getter = fixture(); Object.defineProperty(getter, 'extra', { enumerable: true, get() { reads++; throw Error('Must not execute'); } });
    invalid(getter, 'JSON_PROPERTY'); assert.equal(reads, 0);
});
for (const bad of ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '&lt;script&gt;', '${process.env.SECRET}', '{{customer.password}}', 'text\u0000']) test(`unsafe content ${bad}`, () => mutate(d => { d.templates.tpl_home.nodes.story_text.content.text = bad; }, 'CONTENT_TEXT'));
for (const destination of [
    { kind: 'storePath', path: '//evil.test' }, { kind: 'storePath', path: '/%2f%2fevil.test' },
    { kind: 'storePath', path: '/%252f%252fevil.test' }, { kind: 'storePath', path: '/%5cevil.test' },
    { kind: 'storePath', path: '/%0d%0aLocation:evil' }, { kind: 'storePath', path: '/bad%escape' },
    { kind: 'https', url: 'javascript:alert(1)' }, { kind: 'https', url: 'data:text/html,bad' },
    { kind: 'https', url: 'http://example.test' }, { kind: 'https', url: 'https://user:pass@example.test' },
    { kind: 'email', address: 'a@example.test?body=bad' }, { kind: 'phone', number: '+880;alert(1)' },
]) test(`unsafe destination ${JSON.stringify(destination)}`, () => mutate(d => { d.templates.tpl_home.nodes.story_link.content.destination = destination; }, 'UNSAFE_DESTINATION'));
for (const destination of [{ kind: 'storePath', path: '/policies/shipping?source=help#delivery' }, { kind: 'https', url: 'https://example.test/help' }, { kind: 'email', address: 'support@example.test' }, { kind: 'phone', number: '+8801700000000' }]) test(`approved destination ${destination.kind}`, () => {
    const d = fixture(['home']); d.templates.tpl_home.nodes.story_link.content.destination = destination; valid(d);
});
test('bound product/catalog/media references are typed but do not claim tenant ownership', () => {
    const d = fixture(['home']), t = d.templates.tpl_home;
    t.nodes.products = { type: 'catalog.products', source: { kind: 'manualProducts', productIds: ['a'.repeat(24)] } }; t.rootOrder.push('products'); valid(d);
    t.nodes.products.source = { kind: 'catalog', limit: 24 }; valid(d);
    t.nodes.products.source.limit = 25; invalid(d, 'SOURCE_LIMIT');
    t.nodes.products.source = { kind: 'manualProducts', productIds: ['a'.repeat(24), 'a'.repeat(24)] }; invalid(d, 'SOURCE_IDS');
    t.nodes.products.source = { kind: 'currentCustomer', expression: 'orders[0]' }; invalid(d, 'SOURCE_BINDING');
});
const px = value => ({ unit: 'px', value });
for (const [property, value] of Object.entries({ color: { token: 'foreground' }, background: { hex: '#abcdef' }, fontFamily: 'DM Sans', fontSize: px(24), fontWeight: 700, lineHeight: 1.5, letterSpacing: px(0), textAlign: 'start', width: { unit: 'percent', value: 100 }, maxWidth: px(1200), height: px(200), aspectRatio: { width: 4, height: 3 }, paddingBlockStart: px(0), marginInlineStart: px(0), borderWidth: px(0), borderRadius: px(8), gap: px(16), columns: 3, alignItems: 'stretch', justifyContent: 'space-between', stackOnMobile: false, visible: false })) test(`typed style accepts ${property}`, () => assert.equal(a.validateResponsiveStyles({ base: { [property]: value } }).valid, true));
for (const [property, value] of [
    ['position', 'absolute'], ['zIndex', 9999], ['overflow', 'hidden'], ['opacity', 0], ['pointerEvents', 'none'],
    ['className', 'hidden'], ['onClick', 'alert(1)'], ['--custom', 'x'], ['color', 'red'], ['color', { hex: 'url(x)' }],
    ['background', { token: '--arbitrary' }], ['fontFamily', 'https://fonts.test/font'], ['fontSize', px(1)], ['lineHeight', 0],
    ['fontWeight', 650], ['width', { unit: 'vw', value: 100 }], ['width', px(0)], ['height', px(99999)],
    ['aspectRatio', { width: 32, height: 1 }], ['paddingBlockStart', px(161)], ['marginBlockStart', px(-1)],
    ['borderRadius', px(65)], ['gap', null], ['visible', 0], ['color', { hex: '#fff', token: 'background' }],
]) test(`unsafe style rejected ${property}/${JSON.stringify(value)}`, () => assert.equal(a.validateResponsiveStyles({ base: { [property]: value } }).valid, false));
test('block and protected-part style capability allowlists cannot be bypassed', () => {
    mutate(d => { d.templates.tpl_home.nodes.story_text.styles = { base: { height: px(64) } }; }, 'STYLE_CAPABILITY');
    mutate(d => { d.templates.tpl_checkout.nodes.core_tpl_checkout.styles = { base: { visible: false } }; }, 'STYLE_CAPABILITY');
    mutate(d => { d.templates.tpl_checkout.nodes.core_tpl_checkout.partStyles = { input: { base: { fontSize: px(12) } } }; }, 'STYLE_VALUE');
    mutate(d => { d.templates.tpl_checkout.nodes.core_tpl_checkout.partStyles = { error: { base: { height: px(64) } } }; }, 'STYLE_CAPABILITY');
    mutate(d => { d.templates.tpl_checkout.nodes.core_tpl_checkout.partStyles = { '[data-field]': {} }; }, 'UNKNOWN_PROPERTY');
});
test('known bad contrast is rejected across page/node/preset/part layers', () => {
    const d = fixture(['checkout']), t = d.templates.tpl_checkout;
    t.styles = { base: { background: { hex: '#fff' } } };
    t.nodes.core_tpl_checkout.styles = { base: { color: { hex: '#fff' } } }; invalid(d, 'CONTRAST');
    t.nodes.core_tpl_checkout.styles.base.color = { hex: '#111' }; valid(d);
    t.nodes.core_tpl_checkout.partStyles = { error: { base: { color: { hex: '#fff' } } } }; invalid(d, 'CONTRAST');
});
for (const [width, tier] of [[0, 'base'], [767.9, 'base'], [768, 'tablet'], [1023.9, 'tablet'], [1024, 'desktop'], [1440, 'desktop']]) test(`adaptive breakpoint ${width}`, () => assert.equal(a.tierForWidth(width), tier));
test('responsive specificity resolves tiers before layers and does not inherit boxes', () => {
    const result = a.resolveResponsiveStyles({
        defaults: { base: { lineHeight: 1.5 } },
        page: { base: { paddingBlockStart: px(24), background: { hex: '#fff' } }, desktop: { color: { hex: '#ff0000' }, fontSize: px(32) } },
        preset: { base: { fontSize: px(20) }, tablet: { fontSize: px(24) } },
        node: { base: { color: { hex: '#0000ff' }, paddingBlockStart: px(0), visible: false } },
        part: { base: { textAlign: 'end' } },
    }, 'desktop');
    assert.equal(result.valid, true); assert.deepEqual(result.value.color, { hex: '#0000ff' });
    assert.deepEqual(result.value.fontSize, px(24)); assert.deepEqual(result.value.paddingBlockStart, px(0));
    assert.equal(result.value.visible, false); assert.equal(result.value.background, undefined); assert.equal(result.value.textAlign, 'end');
    assert.deepEqual(a.resolveResponsiveStyles({ page: { base: { paddingBlockStart: px(24) } } }).value, {});
    assert.equal(a.resolveResponsiveStyles({ node: { mobile: {} } }).valid, false);
    assert.equal(a.resolveResponsiveStyles({}, 'wide').valid, false);
    for (const width of [-1, NaN, Infinity, '768']) assert.throws(() => a.tierForWidth(width), RangeError);
});
test('add/copy/move/remove preserve stable IDs, subtree ownership and unrelated data', () => {
    let d = fixture(['home', 'product']); const product = copy(d.templates.tpl_product);
    const added = succeed(d, { kind: 'add', templateId: 'tpl_home', fragment: { rootId: 'new_text', nodes: { new_text: text('New content') } }, placement: { index: 1 } }); d = added.value;
    const copied = succeed(d, { kind: 'copy', templateId: 'tpl_home', nodeId: 'section_story', placement: { index: 2 } }); d = copied.value;
    assert.equal(new Set(Object.values(copied.insertedIds)).size, 3); assert.ok(!Object.values(copied.insertedIds).includes('story_text'));
    assert.deepEqual(d.templates.tpl_home.nodes[copied.insertedIds.section_story].slots.body, [copied.insertedIds.story_text, copied.insertedIds.story_link]);
    d = succeed(d, { kind: 'move', templateId: 'tpl_home', nodeId: 'new_text', placement: { parentId: copied.insertedIds.section_story, slot: 'body', index: 1 } }).value;
    assert.ok(!d.templates.tpl_home.rootOrder.includes('new_text'));
    d = succeed(d, { kind: 'remove', templateId: 'tpl_home', nodeId: copied.insertedIds.section_story }).value;
    assert.equal(d.templates.tpl_home.nodes.new_text, undefined); assert.ok(d.templates.tpl_home.nodes.story_text);
    assert.deepEqual(d.templates.tpl_product, product);
});
test('failed graph/command transitions return errors without partial document mutation', () => {
    fail(fixture(['home']), { kind: 'move', templateId: 'tpl_home', nodeId: 'section_story', placement: { parentId: 'section_story', slot: 'body', index: 0 } });
    fail(fixture(['home']), { kind: 'move', templateId: 'tpl_home', nodeId: 'story_text', placement: { index: 99 } }, 'POSITION');
    fail(fixture(['home']), { kind: 'add', templateId: 'tpl_home', fragment: { rootId: 'story_text', nodes: { story_text: text('Collision') } }, placement: { index: 1 } }, 'NODE_COLLISION');
    fail(fixture(['home']), { kind: 'content', templateId: 'tpl_home', nodeId: 'story_text', content: { text: '<script>' } }, 'CONTENT_TEXT');
    fail(fixture(['home']), { kind: 'content', templateId: 'tpl_home', nodeId: 'story_text' }, 'COMMAND_REQUIRED');
    fail(fixture(['home']), { kind: 'setStyle', templateId: 'tpl_home', nodeId: 'story_text', tier: 'base', property: 'position', value: 'fixed' }, 'STYLE_COMMAND');
    fail(fixture(['home']), { kind: 'resetStyle', templateId: 'tpl_home', nodeId: 'story_text', tier: 'base', property: 'onClick' }, 'STYLE_COMMAND');
});
test('style property/tier/subtree resets delete overrides and preserve content/source/IDs', () => {
    let d = fixture(['home']);
    d.stylePresets.story = { name: 'Story', blockTypes: ['content.text'], styles: { base: { fontSize: px(18) } } };
    d = succeed(d, { kind: 'applyPreset', templateId: 'tpl_home', nodeId: 'story_text', presetId: 'story' }).value;
    d = succeed(d, { kind: 'setStyle', templateId: 'tpl_home', nodeId: 'story_text', tier: 'base', property: 'fontSize', value: px(20) }).value;
    d = succeed(d, { kind: 'setStyle', templateId: 'tpl_home', nodeId: 'story_text', tier: 'desktop', property: 'fontSize', value: px(28) }).value;
    d = succeed(d, { kind: 'resetStyle', templateId: 'tpl_home', nodeId: 'story_text', tier: 'desktop', property: 'fontSize' }).value;
    assert.equal(d.templates.tpl_home.nodes.story_text.styles.desktop, undefined);
    d = succeed(d, { kind: 'resetStyle', templateId: 'tpl_home', nodeId: 'story_text', tier: 'base' }).value;
    assert.equal(d.templates.tpl_home.nodes.story_text.styles, undefined);
    const before = copy(d.templates.tpl_home.nodes.story_link.content);
    d = succeed(d, { kind: 'resetSectionStyles', templateId: 'tpl_home', nodeId: 'section_story' }).value;
    assert.equal(d.templates.tpl_home.nodes.story_text.styles, undefined); assert.equal(d.templates.tpl_home.nodes.story_text.stylePresetId, undefined);
    assert.deepEqual(d.templates.tpl_home.nodes.story_link.content, before);
    assert.equal(a.resolveResponsiveStyles({ preset: d.stylePresets.story.styles }).value.fontSize.value, 18);
});
test('saved section insertion creates independent copies with no synchronized linkage', () => {
    const d = fixture(['home']);
    d.savedSections.story = { name: 'Saved', pageKind: 'home', rootOrder: ['saved_section'], nodes: {
        saved_section: { type: 'content.section', slots: { body: ['saved_text'] } }, saved_text: text('Saved original'),
    } };
    const first = succeed(d, { kind: 'insertSaved', templateId: 'tpl_home', savedSectionId: 'story', placement: { index: 1 } });
    const second = succeed(first.value, { kind: 'insertSaved', templateId: 'tpl_home', savedSectionId: 'story', placement: { index: 2 } });
    assert.notEqual(first.insertedIds.saved_text, second.insertedIds.saved_text);
    const edited = succeed(second.value, { kind: 'content', templateId: 'tpl_home', nodeId: first.insertedIds.saved_text, content: { text: 'Local edit' } }).value;
    assert.equal(edited.savedSections.story.nodes.saved_text.content.text, 'Saved original');
    assert.equal(edited.templates.tpl_home.nodes[second.insertedIds.saved_text].content.text, 'Saved original');
    fail(edited, { kind: 'insertSaved', templateId: 'tpl_home', savedSectionId: 'missing', placement: { index: 0 } }, 'SAVED_REFERENCE');
});
test('style preset and dormant saved-section validation cannot bypass block restrictions', () => {
    mutate(d => { d.stylePresets.hide = { name: 'Hidden', blockTypes: ['checkout.core'], styles: { base: { visible: false } } }; }, 'STYLE_CAPABILITY');
    mutate(d => { d.stylePresets.recurse = { name: 'Recursive', blockTypes: ['content.text'], stylePresetId: 'recurse' }; }, 'UNKNOWN_PROPERTY');
    mutate(d => { d.templates.tpl_home.nodes.story_text.stylePresetId = 'missing'; }, 'PRESET_REFERENCE');
    mutate(d => { d.savedSections.bad = { name: 'Bad', pageKind: 'checkout', rootOrder: ['core_bad'], nodes: { core_bad: { type: 'checkout.core' } } }; }, 'PROTECTED_CORE');
    mutate(d => { d.savedSections.bad = { name: 'Bad', pageKind: 'home', rootOrder: ['saved_text'], nodes: { saved_text: text('<script>') } }; }, 'CONTENT_TEXT');
});
test('all initial count/depth/byte limits are enforced without truncation', () => {
    const near = sizedFixture(200); const snapshot = copy(near); assert.equal(valid(near).counts.nodes, 200); assert.deepEqual(near, snapshot);
    const extra = copy(near); extra.templates.tpl_collection.nodes.extra = text('One too many'); extra.templates.tpl_collection.rootOrder.push('extra'); invalid(extra, 'TOTAL_NODES');
    const fifty = fixture(['home']); const t = fifty.templates.tpl_home;
    for (let i = 0; i < 47; i++) { t.nodes['extra_' + i] = text('Test'); t.rootOrder.push('extra_' + i); } valid(fifty);
    t.nodes.extra_47 = text('Test'); t.rootOrder.push('extra_47'); invalid(fifty, 'NODE_LIMIT');
    mutate(d => { d.templates.extra = a.createPageTemplate('extra', 'home'); }, 'COUNT_LIMIT');
    const libraries = fixture(['home']);
    for (let i = 0; i < 20; i++) {
        libraries.savedSections['saved_' + i] = { name: 'Saved', pageKind: 'home', rootOrder: ['saved_text_' + i], nodes: { ['saved_text_' + i]: text('Saved') } };
        libraries.stylePresets['preset_' + i] = { name: 'Preset', blockTypes: ['content.text'], styles: { base: { fontSize: px(16) } } };
    }
    valid(libraries);
    succeed(libraries, { kind: 'add', templateId: 'tpl_home', fragment: { rootId: 'new_text', nodes: { new_text: text('New') } }, placement: { index: 1 } });
    const tooManySaved = copy(libraries); tooManySaved.savedSections.extra = { name: 'Extra', pageKind: 'home', rootOrder: ['extra_saved'], nodes: { extra_saved: text('Extra') } }; invalid(tooManySaved, 'COUNT_LIMIT');
    const tooManyPresets = copy(libraries); tooManyPresets.stylePresets.extra = { name: 'Extra', blockTypes: ['content.text'] }; invalid(tooManyPresets, 'COUNT_LIMIT');
    const exact = { value: '' }; exact.value = 'x'.repeat(a.LIMITS.bytes - Buffer.byteLength(JSON.stringify(exact))); assert.equal(a.validateCompleteThemeBudget(exact).valid, true);
    exact.value += 'x'; assert.equal(a.validateCompleteThemeBudget(exact).valid, false);
    assert.equal(a.validateCompleteThemeBudget({ version: 5, siteBuilder: near, legacyText: 'ক'.repeat(90000) }).valid, false);
    const big = sizedFixture(100); for (const template of Object.values(big.templates)) for (const node of Object.values(template.nodes)) if (node.type === 'content.text') node.content.text = 'x'.repeat(6000); invalid(big, 'BYTE_LIMIT');
});
test('CJS/ESM subpath parity; old entry never imports adaptive code or accepts live v5', async () => {
    const esm = await import(pathToFileURL(path.join(root, 'packages/storefront-theme/adaptive.mjs')).href);
    for (const key of Object.keys(a)) assert.equal(esm[key], a[key], key);
    const viaPackage = await import('@scaleup/storefront-theme/adaptive'); assert.equal(viaPackage.createPageTemplate, a.createPageTemplate);
    assert.equal(legacy.THEME_SCHEMA_VERSION, 4); assert.ok(!legacy.ALLOWED_THEME_KEYS.includes('siteBuilder'));
    assert.throws(() => legacy.assertSupportedThemeVersion({ version: 5, siteBuilder: fixture() }), { code: 'UNSUPPORTED_THEME_VERSION' });
    assert.equal(legacy.validateTheme({ version: 5, siteBuilder: fixture() }).valid, false);
    assert.equal(legacy.normalizeTheme({ version: 4, siteBuilder: fixture() }).siteBuilder, undefined);
    const loaded = execFileSync(process.execPath, ['-e', "require('@scaleup/storefront-theme');console.log(Object.keys(require.cache).filter(p=>/adaptive|pageTemplate|responsiveStyles/.test(p)))"], { cwd: path.join(root, 'ecommerce-backend/backend'), encoding: 'utf8' });
    assert.equal(loaded.trim(), '[]');
    for (const name of ['adaptive.cjs', 'adaptiveData.cjs', 'pageTemplates.cjs', 'pageTemplateValidation.cjs', 'responsiveStyles.cjs', 'pageTemplateCommands.cjs']) {
        const source = fs.readFileSync(path.join(root, 'packages/storefront-theme', name), 'utf8');
        assert.doesNotMatch(source, /require\(['"](?:node:|mongoose|axios|.*models\/)|process\.env|window\.|globalThis\.document|fetch\(/);
    }
});

test('malformed graph/style/preset values consistently return issues rather than throwing', () => {
    const values = [null, false, true, 0, 1, '', '__proto__', 'constructor', 'toString', [], {}, { toString: 'bad' }, ['missing']];
    const paths = [
        ['templates', 'tpl_home', 'nodes', 'story_text', 'type'], ['templates', 'tpl_home', 'nodes', 'story_text', 'styles'],
        ['templates', 'tpl_home', 'nodes', 'story_text', 'stylePresetId'], ['templates', 'tpl_home', 'rootOrder'],
        ['templates', 'tpl_home', 'nodes', 'section_story', 'slots'], ['templates', 'tpl_home', 'nodes', 'story_link', 'content', 'destination', 'kind'],
        ['stylePresets', 'test', 'blockTypes'], ['templates', 'tpl_product', 'nodes', 'core_tpl_product', 'source', 'kind'],
    ];
    for (const location of paths) for (const value of values) {
        const d = fixture(); d.stylePresets.test = { name: 'Preset', blockTypes: ['content.text'] };
        let target = d; for (const key of location.slice(0, -1)) target = target[key]; target[location.at(-1)] = value;
        assert.doesNotThrow(() => { const result = a.validatePageTemplates(d); assert.equal(typeof result.valid, 'boolean'); });
    }
    for (const value of values) assert.doesNotThrow(() => a.applyPageTemplateCommand(fixture(), {
        kind: 'setStyle', templateId: 'tpl_checkout', nodeId: 'core_tpl_checkout', partId: value,
        tier: 'base', property: 'color', value: { hex: '#111' },
    }));
});
test('reset is a no-op when overrides are absent; source updates and preset applicability remain validated', () => {
    let d = fixture(['home']);
    assert.deepEqual(succeed(d, { kind: 'resetStyle', templateId: 'tpl_home', nodeId: 'story_link', partId: 'label', tier: 'base', property: 'color' }).value, d);
    assert.deepEqual(succeed(d, { kind: 'resetStyle', templateId: 'tpl_home', tier: 'desktop' }).value, d);
    d = copy(d);
    d.templates.tpl_home.nodes.products = { type: 'catalog.products', source: { kind: 'catalog', limit: 4 } };
    d.templates.tpl_home.rootOrder.push('products');
    const updated = succeed(d, { kind: 'source', templateId: 'tpl_home', nodeId: 'products', source: { kind: 'manualProducts', productIds: ['a'.repeat(24)] } });
    assert.equal(updated.value.templates.tpl_home.nodes.products.source.kind, 'manualProducts');
    fail(updated.value, { kind: 'source', templateId: 'tpl_home', nodeId: 'products', source: { kind: 'currentOrder' } }, 'SOURCE_BINDING');
    d = copy(d);
    d.stylePresets.link = { name: 'Link', blockTypes: ['content.link'], partStyles: { label: { base: { fontSize: px(16) } } } };
    fail(d, { kind: 'applyPreset', templateId: 'tpl_home', nodeId: 'story_text', presetId: 'link' }, 'PRESET_REFERENCE');
    succeed(d, { kind: 'applyPreset', templateId: 'tpl_home', nodeId: 'story_link', presetId: 'link' });
});

test('copy across templates and saved insertion use destination compatibility without shared ownership', () => {
    let d = fixture(['home', 'product', 'checkout']);
    const original = copy(d.templates.tpl_home);
    const copied = succeed(d, { kind: 'copy', templateId: 'tpl_product', sourceTemplateId: 'tpl_home', nodeId: 'section_story', placement: { index: 1 } });
    d = copied.value;
    assert.deepEqual(d.templates.tpl_home, original);
    assert.deepEqual(d.templates.tpl_product.rootOrder, ['core_tpl_product', copied.insertedIds.section_story]);
    const coreCopy = fail(d, { kind: 'copy', templateId: 'tpl_home', sourceTemplateId: 'tpl_product', nodeId: 'core_tpl_product', placement: { index: 1 } }, 'PROTECTED_OPERATION');
    assert.ok(coreCopy.errors.length);
    d = copy(d);
    d.savedSections.image = { name: 'Image', pageKind: 'home', rootOrder: ['saved_image'], nodes: { saved_image: { type: 'content.image', content: { assetId: 'a'.repeat(24), alt: 'Fixture' } } } };
    succeed(d, { kind: 'insertSaved', templateId: 'tpl_product', savedSectionId: 'image', placement: { index: 2 } });
    fail(d, { kind: 'insertSaved', templateId: 'tpl_checkout', savedSectionId: 'image', placement: { index: 1 } }, 'PAGE_COMPATIBILITY');
    fail(d, { kind: 'copy', templateId: 'tpl_home', sourceTemplateId: 'missing', nodeId: 'section_story', placement: { index: 1 } }, 'COMMAND_TARGET');
});
test('column counts, group slots and all-core runtime state declarations are code-owned', () => {
    const d = fixture(['home']), t = d.templates.tpl_home;
    t.nodes.section_story.slots.body = ['columns'];
    t.nodes.columns = { type: 'layout.columns', slots: { columns: ['story_text', 'story_link'] }, styles: { base: { columns: 2, stackOnMobile: false } } };
    valid(d);
    const tooFew = copy(d); tooFew.templates.tpl_home.nodes.columns.slots.columns = ['story_text']; invalid(tooFew, 'SLOT_COUNT');
    const tooMany = copy(d); tooMany.templates.tpl_home.nodes.columns.slots.columns = ['story_text', 'story_link', 'story_text', 'story_link', 'story_text']; invalid(tooMany, 'SLOT_COUNT');
    for (const kind of a.PAGE_KINDS.filter(kind => kind !== 'home')) {
        assert.ok(a.BLOCK_REGISTRY[`${kind}.core`].runtimeStates.length);
        assert.equal(a.BLOCK_REGISTRY[`${kind}.core`].protected, true);
        assert.equal(a.BLOCK_REGISTRY[`${kind}.core`].optional, false);
    }
    assert.ok(a.BLOCK_REGISTRY['track.core'].runtimeStates.includes('unverified'));
    assert.ok(a.BLOCK_REGISTRY['checkout.core'].runtimeStates.includes('otp'));
});
test('page, node and semantic-part resets preserve protected core identity and sources', () => {
    let d = fixture(['product']);
    d = succeed(d, { kind: 'setStyle', templateId: 'tpl_product', tier: 'desktop', property: 'background', value: { hex: '#fff' } }).value;
    d = succeed(d, { kind: 'setStyle', templateId: 'tpl_product', nodeId: 'core_tpl_product', partId: 'title', tier: 'base', property: 'fontSize', value: px(28) }).value;
    d = succeed(d, { kind: 'resetStyle', templateId: 'tpl_product', nodeId: 'core_tpl_product', partId: 'title', tier: 'base', property: 'fontSize' }).value;
    assert.equal(d.templates.tpl_product.nodes.core_tpl_product.partStyles, undefined);
    d = succeed(d, { kind: 'resetSectionStyles', templateId: 'tpl_product', nodeId: 'core_tpl_product' }).value;
    assert.deepEqual(d.templates.tpl_product.nodes.core_tpl_product, { type: 'product.core', source: { kind: 'currentProduct' } });
    d = succeed(d, { kind: 'resetStyle', templateId: 'tpl_product', tier: 'desktop' }).value;
    assert.equal(d.templates.tpl_product.styles, undefined);
});
test('malformed template IDs, assignments and preset target records fail closed', () => {
    const d = fixture(['home']); d.templates['x'.repeat(49)] = a.createPageTemplate('short', 'product'); invalid(d, 'ID');
    assert.throws(() => a.createPageTemplate('valid', {}), TypeError);
    assert.throws(() => a.coreNodeId({}), TypeError);
    for (const key of ['unknown', 'toString', 'constructor', null, {}]) {
        assert.throws(() => a.createPageTemplate('valid', key), TypeError);
    }
    const deep = fixture(); let part = {}; deep.extra = part;
    for (let n = 0; n < 18; n++) { part.child = {}; part = part.child; }
    invalid(deep, 'JSON_DEPTH');
    const tooManyKeys = fixture(); tooManyKeys.extra = Object.fromEntries(Array.from({ length: 2001 }, (_, i) => ['key' + i, 0])); invalid(tooManyKeys, 'JSON_LIMIT');
});
test('unregistered command fields and malformed arguments never produce partial valid values', () => {
    for (const command of [null, {}, [], { kind: 'execute', templateId: 'tpl_home' }, { kind: 'remove', templateId: 'tpl_home', nodeId: 'story_text', protected: false },
        { kind: 'setStyle', templateId: 'tpl_home', tier: 'base', property: 'fontSize' }, { kind: 'copy', templateId: 'tpl_home', nodeId: 'story_text', placement: { index: -1 } },
        { kind: 'setStyle', templateId: 'tpl_product', nodeId: 'core_tpl_product', tier: 'base', property: 'color', value: 'url(javascript:bad)' }]) {
        fail(fixture(), command);
    }
    const d = fixture(['home']);
    d.templates.tpl_home.nodes.section_story.slots.body = ['story_text'];
    delete d.templates.tpl_home.nodes.story_link;
    fail(d, { kind: 'remove', templateId: 'tpl_home', nodeId: 'story_text' }, 'SLOT_COUNT');
});
test('functional contrast resolves literal/token/default background pairs and trusted effective tokens', () => {
    const d = fixture(['checkout']), core = d.templates.tpl_checkout.nodes.core_tpl_checkout;
    core.styles = { base: { color: { hex: '#fff' } } };
    invalid(d, 'CONTRAST'); // Default background is the existing background token.
    core.styles = { base: { color: { token: 'background' } } }; invalid(d, 'CONTRAST');
    core.styles = { base: { color: { token: 'foreground' }, background: { hex: '#111827' } } }; invalid(d, 'CONTRAST');
    core.styles = { base: { color: { hex: '#fff' } } };
    const tokens = Object.fromEntries(a.COLOR_TOKENS.map(token => [token, legacy.FALLBACK_THEME.colors[token]]));
    tokens.background = '#111827'; tokens.foreground = '#ffffff';
    assert.equal(a.validatePageTemplates(d, tokens).valid, true);
    const snapshot = copy(d);
    const change = a.applyPageTemplateCommand(deepFreeze(d), { kind: 'setStyle', templateId: 'tpl_checkout', nodeId: 'core_tpl_checkout', tier: 'base', property: 'color', value: { hex: '#111827' } }, tokens);
    assert.equal(change.valid, false); assert.ok(change.errors.some(error => error.code === 'CONTRAST')); assert.deepEqual(d, snapshot);
    for (const context of [null, {}, { background: 'url(bad)' }, { ...tokens, background: '#ffffff' }]) assert.equal(a.validatePageTemplates(snapshot, context).valid, false);
});
test('missing text/media/source fields, unsafe retained content and inactive templates are fully validated', () => {
    mutate(d => { delete d.templates.tpl_home.nodes.story_text.content.text; }, 'CONTENT_REQUIRED');
    mutate(d => { delete d.templates.tpl_product.nodes.core_tpl_product.source; }, 'SOURCE_REQUIRED');
    mutate(d => { d.templates.tpl_home.nodes.story_text.content.text = 'x'.repeat(6001); }, 'CONTENT_TEXT');
    const d = fixture(['home']); d.templates.dormant = a.createPageTemplate('dormant', 'checkout');
    d.templates.dormant.nodes.core_dormant.partStyles = { input: { base: { visible: false } } }; invalid(d, 'STYLE_CAPABILITY');
    const p = fixture(['home']); p.stylePresets.dormant = { name: 'Unused', blockTypes: ['content.text'], styles: { base: { color: 'red' } } }; invalid(p, 'STYLE_VALUE');
    const savedRef = fixture(['home']); savedRef.templates.tpl_home.nodes.story_text.savedSectionId = 'shared'; invalid(savedRef, 'UNKNOWN_PROPERTY');
});
test('resolved values are detached from frozen input and malformed style capabilities fail closed', () => {
    const layers = deepFreeze({ node: { base: { fontSize: px(20), color: { hex: '#111827' } } } });
    const result = a.resolveResponsiveStyles(layers);
    assert.equal(result.valid, true); result.value.fontSize.value = 32;
    assert.equal(layers.node.base.fontSize.value, 20);
    for (const capability of [null, false, [], { properties: null }, { properties: 'color' }, { properties: ['onClick'] }, { functional: 'false' }]) {
        assert.equal(a.validateResponsiveStyles({ base: { color: { hex: '#fff' } } }, capability).valid, false);
        assert.equal(a.resolveResponsiveStyles({ node: {} }, 'base', capability).valid, false);
    }
});
