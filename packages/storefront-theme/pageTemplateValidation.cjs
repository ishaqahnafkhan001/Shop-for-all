'use strict';

const { LIMITS, own, id, record, issue, inspectJson, shape } = require('./adaptiveData.cjs');
const { ADAPTIVE_CONTRACT_VERSION, PAGE_KINDS, DEFAULT_PAGE_KINDS, SOURCE_BINDINGS, PAGE_TEMPLATES, BLOCK_REGISTRY, coreNodeId } = require('./pageTemplates.cjs');
const { CORE_STYLES, TIERS, COLOR_TOKENS, DEFAULT_COLOR_TOKENS, checkStyles, resolveResponsiveStyles, checkKnownContrast, resolveTier } = require('./responsiveStyles.cjs');
const { isSafeThemeUrl, normalizeHexColor } = require('./index.cjs');
const assetId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
function plainText(value, max, errors, path, empty = false) {
    // eslint-disable-next-line no-control-regex -- Reject non-text control bytes while allowing ordinary text whitespace.
    if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()) || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]|&(?:lt|gt|#0*60|#x0*3c);|\$\{|\{\{/iu.test(value)) {
        issue(errors, path, 'CONTENT_TEXT', `Use plain text of at most ${max} characters.`);
    }
}
function checkDestination(value, pageKind, errors, path) {
    if (!record(value)) return issue(errors, path, 'DESTINATION', 'Use a typed destination.');
    const fields = { storePath: 'path', https: 'url', email: 'address', phone: 'number' };
    const field = own(fields, value.kind) ? fields[value.kind] : null;
    if (!field || !shape(value, ['kind', field], errors, path)) return issue(errors, path, 'DESTINATION', 'Destination kind is not registered.');
    const raw = value[field];
    let decoded = raw, valid = typeof raw === 'string' && raw.length > 0 && raw.length <= 1000;
    if (valid) {
        try {
            for (let n = 0; n < 4 && decoded.includes('%'); n++) decoded = decodeURIComponent(decoded);
            // eslint-disable-next-line no-control-regex -- Encoded URL control characters must fail closed.
            valid = !decoded.includes('%') && !/[\s\\\u0000-\u001f\u007f<>]/u.test(decoded);
        } catch { valid = false; }
    }
    if (valid && value.kind === 'storePath') valid = raw.startsWith('/') && decoded.startsWith('/') && !decoded.startsWith('//') && isSafeThemeUrl(decoded);
    else if (valid && value.kind === 'https') {
        try {
            const url = new URL(raw);
            valid = /^https:\/\//i.test(raw) && url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password && isSafeThemeUrl(decoded);
        } catch { valid = false; }
    } else if (valid && value.kind === 'email') valid = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(raw) && raw.length <= 254;
    else if (valid && value.kind === 'phone') valid = /^\+?[0-9]{7,15}$/.test(raw);
    if (pageKind === 'checkout' && value.kind !== 'storePath') valid = false;
    if (!valid) issue(errors, path, 'UNSAFE_DESTINATION', 'Use an approved canonical store path or typed safe destination.');
}
function checkContent(node, block, pageKind, errors, path) {
    if (!own(node, 'content')) {
        if (block.requiredContent.length) issue(errors, [...path, 'content'], 'CONTENT_REQUIRED', 'Required content is missing.');
        return;
    }
    if (!shape(node.content, block.contentFields, errors, [...path, 'content'])) return;
    for (const field of block.requiredContent) if (!own(node.content, field)) issue(errors, [...path, 'content', field], 'CONTENT_REQUIRED', 'Required content is missing.');
    for (const [field, value] of Object.entries(node.content)) {
        const location = [...path, 'content', field];
        if (field === 'text') plainText(value, 6000, errors, location);
        if (field === 'label') plainText(value, 120, errors, location);
        if (field === 'alt') plainText(value, 240, errors, location, true);
        if (field === 'kind' && !['paragraph', 'heading'].includes(value)) issue(errors, location, 'CONTENT_ENUM', 'Use paragraph or heading.');
        if (field === 'assetId' && !assetId(value)) issue(errors, location, 'ASSET_REFERENCE', 'Use a valid asset ID; tenant ownership is checked by the backend in Phase 2.');
        if (field === 'destination') checkDestination(value, pageKind, errors, location);
    }
}
function checkSource(node, block, errors, path) {
    if (!own(node, 'source')) {
        if (block.sourceRequired) issue(errors, [...path, 'source'], 'SOURCE_REQUIRED', 'Required registered source is missing.');
        return;
    }
    const source = node.source, kind = source?.kind;
    if (!record(source) || !block.sourceKinds.includes(kind)) return issue(errors, [...path, 'source'], 'SOURCE_BINDING', 'Source binding is not permitted for this block.');
    const binding = SOURCE_BINDINGS[kind];
    shape(source, binding.fields, errors, [...path, 'source']);
    for (const field of binding.required) if (!own(source, field)) issue(errors, [...path, 'source', field], 'SOURCE_REQUIRED', 'Required source field is missing.');
    if (kind === 'manualProducts' && (!Array.isArray(source.productIds) || source.productIds.length < binding.minItems || source.productIds.length > binding.maxItems || !source.productIds.every(assetId) || new Set(source.productIds).size !== source.productIds.length)) {
        issue(errors, [...path, 'source', 'productIds'], 'SOURCE_IDS', 'Use 1–24 distinct product IDs; ownership/public eligibility is a Phase 2 check.');
    }
    if (['catalog', 'categories'].includes(kind) && (!Number.isInteger(source.limit) || source.limit < binding.minItems || source.limit > binding.maxItems)) issue(errors, [...path, 'source', 'limit'], 'SOURCE_LIMIT', 'Source count exceeds its registered range.');
}
function checkParts(value, block, errors, path) {
    if (!shape(value, Object.keys(block.parts), errors, path)) return;
    for (const [part, styles] of Object.entries(value)) if (own(block.parts, part)) checkStyles(styles, { properties: block.parts[part], functional: block.protected, ...block.partStyleOptions?.[part] }, errors, [...path, part]);
}
function checkPresets(presets, errors) {
    if (!record(presets)) return;
    for (const [presetId, preset] of Object.entries(presets)) {
        const path = ['stylePresets', presetId];
        if (!id(presetId)) issue(errors, path, 'ID', 'Invalid preset ID.');
        if (!shape(preset, ['name', 'blockTypes', 'styles', 'partStyles'], errors, path)) continue;
        plainText(preset.name, 80, errors, [...path, 'name']);
        if (!Array.isArray(preset.blockTypes) || preset.blockTypes.length < 1 || preset.blockTypes.length > 20 || new Set(preset.blockTypes).size !== preset.blockTypes.length) {
            issue(errors, [...path, 'blockTypes'], 'PRESET_TYPES', 'Declare 1–20 distinct registered block types.'); continue;
        }
        for (const type of preset.blockTypes) {
            if (!own(BLOCK_REGISTRY, type)) { issue(errors, [...path, 'blockTypes'], 'BLOCK_TYPE', 'Unregistered preset target.'); continue; }
            const block = BLOCK_REGISTRY[type];
            if (own(preset, 'styles')) checkStyles(preset.styles, { properties: block.styles, functional: block.protected }, errors, [...path, 'styles']);
            if (own(preset, 'partStyles')) checkParts(preset.partStyles, block, errors, [...path, 'partStyles']);
        }
    }
}
function validatePageTemplates(candidate, colorTokens = DEFAULT_COLOR_TOKENS) {
    const scan = inspectJson(candidate);
    if (!scan.valid) return scan;
    const errors = [];
    // Future callers must pass the effective tenant theme's complete flat token
    // map as trusted context. Defaults make isolated contract fixtures useful;
    // they are not proof of contrast against an unknown published theme.
    const colorScan = inspectJson(colorTokens);
    if (!colorScan.valid) return { valid: false, errors: colorScan.errors.map(error => ({ ...error, path: ['colorTokens', ...error.path] })) };
    if (shape(colorTokens, COLOR_TOKENS, errors, ['colorTokens'])) for (const token of COLOR_TOKENS) {
        if (typeof colorTokens[token] !== 'string' || !normalizeHexColor(colorTokens[token])) issue(errors, ['colorTokens', token], 'COLOR_CONTEXT', 'Provide every approved effective color token as a solid hex color.');
    }
    if (errors.length) return { valid: false, errors };
    if (!shape(candidate, ['version', 'defaultTemplates', 'globals', 'templates', 'savedSections', 'stylePresets'], errors, [])) return { valid: false, errors };
    if (candidate.version !== ADAPTIVE_CONTRACT_VERSION) issue(errors, ['version'], 'CONTRACT_VERSION', 'Unsupported inactive page-template contract version.');
    for (const field of ['defaultTemplates', 'globals', 'templates', 'savedSections', 'stylePresets']) if (!record(candidate[field])) issue(errors, [field], 'OBJECT_REQUIRED', 'A bounded map is required.');
    if (errors.length) return { valid: false, errors };
    for (const [field, maximum] of [['templates', LIMITS.templates], ['savedSections', LIMITS.savedSections], ['stylePresets', LIMITS.stylePresets]]) {
        if (Object.keys(candidate[field]).length > maximum) issue(errors, [field], 'COUNT_LIMIT', `At most ${maximum} records are supported.`);
    }
    if (errors.length) return { valid: false, errors };
    checkPresets(candidate.stylePresets, errors);
    for (const [field, kinds] of [['defaultTemplates', DEFAULT_PAGE_KINDS], ['globals', ['header', 'footer']]]) {
        for (const [kind, templateId] of Object.entries(candidate[field])) {
            if (!kinds.includes(kind) || !id(templateId) || !own(candidate.templates, templateId) || candidate.templates[templateId]?.pageKind !== kind) issue(errors, [field, kind], 'ASSIGNMENT', 'Assignment must reference a template of the matching registered page kind.');
        }
    }
    const scopes = [...Object.entries(candidate.templates).map(([key, value]) => ({ key, value, saved: false, path: ['templates', key] })),
        ...Object.entries(candidate.savedSections).map(([key, value]) => ({ key, value, saved: true, path: ['savedSections', key] }))];
    const globalIds = new Map();
    let totalNodes = 0;
    for (const scope of scopes) {
        if (!id(scope.key) || scope.key.length > 48) issue(errors, scope.path, 'ID', 'Template/library IDs must contain at most 48 safe characters.');
        if (!record(scope.value)) continue;
        if (record(scope.value.nodes)) for (const nodeId of Object.keys(scope.value.nodes)) {
            totalNodes++;
            if (!id(nodeId)) issue(errors, [...scope.path, 'nodes', nodeId], 'ID', 'Invalid node ID.');
            if (globalIds.has(nodeId)) issue(errors, [...scope.path, 'nodes', nodeId], 'NODE_COLLISION', 'Node IDs must be unique across templates and saved sections.');
            globalIds.set(nodeId, scope);
        }
    }
    if (totalNodes > LIMITS.totalNodes) {
        issue(errors, [], 'TOTAL_NODES', `At most ${LIMITS.totalNodes} nodes across templates and saved sections are supported.`);
        return { valid: false, errors };
    }
    for (const scope of scopes) checkTree(scope, candidate, globalIds, errors, colorTokens);
    return { valid: errors.length === 0, errors, bytes: scan.bytes, counts: { templates: Object.keys(candidate.templates).length, nodes: totalNodes } };
}
function checkTree(scope, candidate, globalIds, errors, colorTokens) {
    const { value: tree, path, saved, key } = scope;
    if (!id(key) || key.length > 48) return; // Already reported before graph traversal.
    if (!shape(tree, saved ? ['name', 'pageKind', 'rootOrder', 'nodes'] : ['pageKind', 'blueprintId', 'rootOrder', 'nodes', 'styles'], errors, path)) return;
    if (!PAGE_KINDS.includes(tree.pageKind)) { issue(errors, [...path, 'pageKind'], 'PAGE_KIND', 'Unregistered page kind.'); return; }
    const page = PAGE_TEMPLATES[tree.pageKind];
    if (saved) plainText(tree.name, 80, errors, [...path, 'name']);
    else if (tree.blueprintId !== page.blueprintId) issue(errors, [...path, 'blueprintId'], 'BLUEPRINT', 'Use the registered versioned blueprint.');
    if (!record(tree.nodes) || !Array.isArray(tree.rootOrder)) { issue(errors, path, 'TREE_SHAPE', 'A node map and ordered roots are required.'); return; }
    const nodeIds = Object.keys(tree.nodes);
    if (nodeIds.length > LIMITS.nodesPerTemplate) {
        issue(errors, [...path, 'nodes'], 'NODE_LIMIT', `At most ${LIMITS.nodesPerTemplate} nodes per tree are supported.`);
        return;
    }
    if (tree.rootOrder.length > (saved ? 1 : page.maxRoots) || (saved && tree.rootOrder.length !== 1)) issue(errors, [...path, 'rootOrder'], 'ROOT_LIMIT', 'Root count exceeds this blueprint’s limit.');
    if (own(tree, 'styles')) checkStyles(tree.styles, { properties: page.styles, functional: true, outerWidth: true }, errors, [...path, 'styles']);
    const owners = new Map(), edges = new Map();
    const connect = (reference, parentSlot, location) => {
        if (!id(reference) || !own(tree.nodes, reference)) { issue(errors, location, globalIds.has(reference) ? 'CROSS_TEMPLATE_REFERENCE' : 'MISSING_NODE', 'Node must exist in this same tree.'); return; }
        owners.set(reference, (owners.get(reference) || 0) + 1);
        const target = tree.nodes[reference], block = own(BLOCK_REGISTRY, target?.type) ? BLOCK_REGISTRY[target.type] : null;
        if (block && !block.parentSlots.includes(parentSlot)) issue(errors, location, 'PARENT_SLOT', 'Block is incompatible with this parent slot.');
    };
    tree.rootOrder.forEach((reference, index) => {
        connect(reference, 'root', [...path, 'rootOrder', index]);
        if (own(tree.nodes, reference) && !page.rootTypes.includes(tree.nodes[reference]?.type)) issue(errors, [...path, 'rootOrder', index], 'ROOT_TYPE', 'This blueprint does not permit this root type.');
    });
    let coreCount = 0;
    for (const [nodeId, node] of Object.entries(tree.nodes)) {
        const location = [...path, 'nodes', nodeId];
        if (!shape(node, ['type', 'content', 'source', 'slots', 'styles', 'partStyles', 'stylePresetId'], errors, location)) continue;
        if (!own(BLOCK_REGISTRY, node.type)) { issue(errors, [...location, 'type'], 'BLOCK_TYPE', 'Unregistered block type.'); continue; }
        const block = BLOCK_REGISTRY[node.type];
        if (!block.pageKinds.includes(tree.pageKind)) issue(errors, location, 'PAGE_COMPATIBILITY', 'Block is incompatible with this page family.');
        if (block.protected) {
            coreCount++;
            if (saved || node.type !== page.requiredCore || nodeId !== coreNodeId(key)) issue(errors, location, 'PROTECTED_CORE', 'Only the blueprint’s required root core and reserved ID are permitted.');
        } else if (nodeId.startsWith('core_')) issue(errors, location, 'RESERVED_ID', 'Core IDs are reserved by trusted code.');
        checkContent(node, block, tree.pageKind, errors, location);
        checkSource(node, block, errors, location);
        if (own(node, 'styles')) checkStyles(node.styles, { properties: block.styles, functional: block.protected }, errors, [...location, 'styles']);
        if (own(node, 'partStyles')) checkParts(node.partStyles, block, errors, [...location, 'partStyles']);
        let preset;
        if (own(node, 'stylePresetId')) {
            preset = own(candidate.stylePresets, node.stylePresetId) ? candidate.stylePresets[node.stylePresetId] : undefined;
            if (!id(node.stylePresetId) || !own(candidate.stylePresets, node.stylePresetId) || !Array.isArray(preset?.blockTypes) || !preset.blockTypes.includes(node.type)) issue(errors, [...location, 'stylePresetId'], 'PRESET_REFERENCE', 'Use an existing preset compatible with this block.');
        }
        if (block.protected) for (const tier of TIERS) {
            const resolved = resolveResponsiveStyles({ page: tree.styles || {}, preset: preset?.styles || {}, node: node.styles || {} }, tier, { properties: CORE_STYLES, functional: true });
            if (resolved.valid) {
                const surface = { color: { token: 'foreground' }, background: { token: 'background' }, ...resolved.value };
                const pageBackground = resolveTier(tree.styles, tier).background;
                if (!resolved.value.background && pageBackground) surface.background = pageBackground;
                checkKnownContrast(surface, errors, [...location, 'styles', tier], colorTokens);
                const partOverrides = Object.fromEntries(Object.keys(block.parts).map(part => [part,
                    resolveResponsiveStyles({ preset: preset?.partStyles?.[part] || {}, part: node.partStyles?.[part] || {} }, tier)]));
                const paint = part => Object.fromEntries(Object.entries(partOverrides[part]?.value || {}).filter(([property]) => ['color', 'background'].includes(property)));
                const paintedSurface = { ...surface, ...paint('surface') }, contexts = { surface: paintedSurface };
                for (const part of ['information', 'listing', 'totals', 'summary']) if (own(block.parts, part)) contexts[part] = { ...paintedSurface, ...paint(part) };
                for (const part of Object.keys(block.parts)) {
                    // Contrast uses the same trusted semantic containment as
                    // the renderer. Box properties are never inherited here.
                    if (!block.parts[part].includes('color') || !partOverrides[part].valid) continue;
                    const placements = block.partParents?.[part]?.length ? block.partParents[part] : ['surface'];
                    for (const parent of placements) {
                        const before = errors.length;
                        checkKnownContrast({ ...contexts[parent], ...partOverrides[part].value }, errors, [...location, 'partStyles', part, tier], colorTokens);
                        if (parent !== 'surface') for (let index = before; index < errors.length; index++) errors[index] = { ...errors[index], code: 'CORE_CONTRAST',
                            message: `Required ${part} text needs 4.5:1 contrast in its ${parent} surface.` };
                    }
                }
            }
        }
        const childRefs = [];
        const slots = own(node, 'slots') ? node.slots : {};
        if (shape(slots, Object.keys(block.slots), errors, [...location, 'slots'])) {
            for (const [slotName, slot] of Object.entries(block.slots)) {
                const refs = slots[slotName];
                if (!Array.isArray(refs) || refs.length < slot.min || refs.length > slot.max) { issue(errors, [...location, 'slots', slotName], 'SLOT_COUNT', 'Slot children must satisfy its declared count bounds.'); continue; }
                refs.forEach((reference, index) => {
                    connect(reference, node.type + '.' + slotName, [...location, 'slots', slotName, index]);
                    if (own(tree.nodes, reference) && !slot.allowedTypes.includes(tree.nodes[reference]?.type)) issue(errors, [...location, 'slots', slotName, index], 'CHILD_TYPE', 'Child type is not allowed in this slot.');
                    childRefs.push(reference);
                });
            }
        }
        edges.set(nodeId, childRefs);
        if (childRefs.length < block.minChildren || childRefs.length > block.maxChildren) issue(errors, location, 'CHILD_COUNT', 'Block child count violates the manifest.');
    }
    if (!saved && page.requiredCore && (coreCount !== 1 || tree.rootOrder[page.corePosition] !== coreNodeId(key))) issue(errors, [...path, 'rootOrder'], 'REQUIRED_CORE', 'Keep exactly one required core in its fixed blueprint position.');
    const active = new Set(), reached = new Set();
    function visit(nodeId, depth) {
        if (!own(tree.nodes, nodeId)) return;
        if (active.has(nodeId)) { issue(errors, [...path, 'nodes', nodeId], 'GRAPH_CYCLE', 'Node cycles are not permitted.'); return; }
        if (depth > LIMITS.layoutDepth) issue(errors, [...path, 'nodes', nodeId], 'LAYOUT_DEPTH', 'Layout depth exceeds three levels.');
        if (reached.has(nodeId)) return;
        reached.add(nodeId); active.add(nodeId);
        for (const reference of edges.get(nodeId) || []) visit(reference, depth + 1);
        active.delete(nodeId);
    }
    tree.rootOrder.forEach(nodeId => visit(nodeId, 1));
    const rootReachable = new Set(reached);
    for (const nodeId of nodeIds) {
        if ((owners.get(nodeId) || 0) > 1) issue(errors, [...path, 'nodes', nodeId], 'MULTIPLE_OWNERS', 'A node can have only one owning root/slot.');
        if (!rootReachable.has(nodeId)) { issue(errors, [...path, 'nodes', nodeId], 'UNREACHABLE_NODE', 'Every node must be reachable from an ordered root.'); visit(nodeId, 1); }
    }
}
// Byte validation only: deliberately NOT a v5 persistence validator or migration.
const validateCompleteThemeBudget = candidate => inspectJson(candidate, LIMITS.bytes);
module.exports = { validatePageTemplates, validateCompleteThemeBudget };
