'use strict';

const { inspectJson, shape, issue, own, id, clone } = require('./adaptiveData.cjs');
const { BLOCK_REGISTRY, PAGE_TEMPLATES, createPageTemplateDocument } = require('./pageTemplates.cjs');
const { validatePageTemplates } = require('./pageTemplateValidation.cjs');

const COMMAND_FIELDS = Object.freeze({
    add: ['fragment', 'placement'], remove: ['nodeId'], copy: ['nodeId', 'placement', 'sourceTemplateId'], move: ['nodeId', 'placement'],
    content: ['nodeId', 'content'], source: ['nodeId', 'source'],
    setStyle: ['nodeId', 'partId', 'tier', 'property', 'value'], resetStyle: ['nodeId', 'partId', 'tier', 'property'],
    resetSectionStyles: ['nodeId'], applyPreset: ['nodeId', 'presetId'], insertSaved: ['savedSectionId', 'placement'],
    saveSection: ['nodeId', 'savedSectionId', 'name'], renameSaved: ['savedSectionId', 'name'], deleteSaved: ['savedSectionId'],
    savePreset: ['nodeId', 'presetId', 'name'], deletePreset: ['presetId'],
    resetPageStyles: [],
});
const OPTIONAL_FIELDS = Object.freeze({ copy: ['sourceTemplateId'], setStyle: ['nodeId', 'partId'], resetStyle: ['nodeId', 'partId', 'property'] });
function subtree(tree, rootId) {
    const ids = [];
    const walk = nodeId => { ids.push(nodeId); Object.values(tree.nodes[nodeId].slots || {}).flat().forEach(walk); };
    walk(rootId);
    return ids;
}
function applyPageTemplateCommand(document, command, colorTokens) {
    const before = validatePageTemplates(document, colorTokens);
    if (!before.valid) return { valid: false, errors: before.errors };
    const scan = inspectJson(command);
    if (!scan.valid) return { valid: false, errors: scan.errors };
    const errors = [], fields = own(COMMAND_FIELDS, command?.kind) ? COMMAND_FIELDS[command.kind] : null;
    if (!fields || !shape(command, ['kind', 'templateId', ...fields], errors, ['command'])) {
        issue(errors, ['command'], 'COMMAND', 'Use a registered command and its declared properties.');
        return { valid: false, errors };
    }
    const required = fields.filter(field => !(OPTIONAL_FIELDS[command.kind] || []).includes(field));
    for (const field of required) if (!own(command, field)) issue(errors, ['command', field], 'COMMAND_REQUIRED', 'Required command field is missing.');
    if (errors.length) return { valid: false, errors };
    if (!id(command.templateId) || !own(document.templates, command.templateId)) {
        issue(errors, ['command', 'templateId'], 'COMMAND_TARGET', 'Target template does not exist.'); return { valid: false, errors };
    }
    const value = clone(document), tree = value.templates[command.templateId], kind = command.kind;
    const sourceTemplateId = kind === 'copy' && own(command, 'sourceTemplateId') ? command.sourceTemplateId : command.templateId;
    if (!id(sourceTemplateId) || !own(value.templates, sourceTemplateId)) {
        issue(errors, ['command', 'sourceTemplateId'], 'COMMAND_TARGET', 'Source template does not exist.'); return { valid: false, errors };
    }
    const sourceTree = value.templates[sourceTemplateId];
    const node = own(sourceTree.nodes, command.nodeId) ? sourceTree.nodes[command.nodeId] : null;
    const nodeRequired = !['add', 'insertSaved', 'setStyle', 'resetStyle', 'renameSaved', 'deleteSaved', 'deletePreset', 'resetPageStyles'].includes(kind) || own(command, 'nodeId');
    if (nodeRequired && !node) issue(errors, ['command', 'nodeId'], 'COMMAND_TARGET', 'Target node does not exist.');
    const operation = { setStyle: 'style', resetStyle: 'reset', resetSectionStyles: 'reset', applyPreset: 'preset' }[kind] || kind;
    const libraryOperation = ['saveSection', 'savePreset'].includes(kind);
    if (node && ((!libraryOperation && !BLOCK_REGISTRY[node.type].operations.includes(operation))
        || (kind === 'saveSection' && BLOCK_REGISTRY[node.type].protected))) issue(errors, ['command', 'nodeId'], 'PROTECTED_OPERATION', 'This operation is not permitted for the registered block.');
    if (errors.length) return { valid: false, errors };
    const detach = nodeId => {
        tree.rootOrder = tree.rootOrder.filter(reference => reference !== nodeId);
        for (const item of Object.values(tree.nodes)) for (const [slot, refs] of Object.entries(item.slots || {})) item.slots[slot] = refs.filter(reference => reference !== nodeId);
    };
    const place = nodeId => {
        const placement = command.placement;
        if (!shape(placement, ['parentId', 'slot', 'index'], errors, ['command', 'placement'])) return;
        let order;
        if (!own(placement, 'parentId')) {
            if (own(placement, 'slot')) issue(errors, ['command', 'placement', 'slot'], 'POSITION', 'Root insertion has no child slot.');
            order = tree.rootOrder;
        } else {
            const parent = own(tree.nodes, placement.parentId) ? tree.nodes[placement.parentId] : null;
            const block = parent && own(BLOCK_REGISTRY, parent.type) ? BLOCK_REGISTRY[parent.type] : null;
            if (!block || !own(block.slots, placement.slot)) { issue(errors, ['command', 'placement'], 'POSITION', 'Target slot does not exist.'); return; }
            parent.slots ||= {};
            parent.slots[placement.slot] ||= [];
            order = parent.slots[placement.slot];
        }
        if (!Number.isInteger(placement.index) || placement.index < 0 || placement.index > order.length) issue(errors, ['command', 'placement', 'index'], 'POSITION', 'Use an insertion index in the target list after removal.');
        else order.splice(placement.index, 0, nodeId);
    };
    const insertedIds = {};
    const insert = (sourceTree, rootId, fresh) => {
        const ids = subtree(sourceTree, rootId);
        const occupied = new Set([...Object.values(value.templates), ...Object.values(value.savedSections)].flatMap(item => Object.keys(item.nodes)));
        let counter = 1;
        for (const oldId of ids) {
            let nextId = oldId;
            if (fresh) { while (occupied.has(`node_${counter}`)) counter++; nextId = `node_${counter++}`; }
            if (occupied.has(nextId)) { issue(errors, ['command', 'fragment'], 'NODE_COLLISION', 'Added node IDs must be fresh across the document.'); return; }
            insertedIds[oldId] = nextId; occupied.add(nextId);
        }
        for (const oldId of ids) {
            const copied = clone(sourceTree.nodes[oldId]);
            if (copied.slots) for (const [slot, refs] of Object.entries(copied.slots)) copied.slots[slot] = refs.map(reference => insertedIds[reference]);
            tree.nodes[insertedIds[oldId]] = copied;
        }
        place(insertedIds[rootId]);
    };
    if (kind === 'remove') { detach(command.nodeId); subtree(tree, command.nodeId).forEach(nodeId => delete tree.nodes[nodeId]); }
    if (kind === 'resetPageStyles') delete tree.styles;
    if (kind === 'move') { detach(command.nodeId); place(command.nodeId); }
    if (kind === 'copy') insert(sourceTree, command.nodeId, true);
    if (kind === 'insertSaved') {
        const saved = own(value.savedSections, command.savedSectionId) ? value.savedSections[command.savedSectionId] : null;
        if (!saved) issue(errors, ['command', 'savedSectionId'], 'SAVED_REFERENCE', 'Use an existing saved section.');
        else insert(saved, saved.rootOrder[0], true);
    }
    if (kind === 'add') {
        const fragment = command.fragment;
        if (shape(fragment, ['rootId', 'nodes'], errors, ['command', 'fragment']) && id(fragment.rootId) && fragment.nodes && own(fragment.nodes, fragment.rootId)) {
            // Validate fragment structure as an isolated saved-section tree first.
            const test = createPageTemplateDocument();
            test.stylePresets = value.stylePresets;
            test.savedSections.command_fragment = { name: 'Command fragment', pageKind: tree.pageKind, rootOrder: [fragment.rootId], nodes: fragment.nodes };
            const checked = validatePageTemplates(test, colorTokens);
            if (!checked.valid) errors.push(...checked.errors);
            else insert({ nodes: fragment.nodes }, fragment.rootId, false);
        } else issue(errors, ['command', 'fragment'], 'COMMAND_FRAGMENT', 'A valid root ID and complete optional subtree are required.');
    }
    if (kind === 'content' || kind === 'source') node[kind] = clone(command[kind]);
    if (kind === 'applyPreset') node.stylePresetId = command.presetId;
    if (['setStyle', 'resetStyle'].includes(kind)) {
        const target = node || tree;
        let styles;
        if (own(command, 'partId')) {
            if (!node || !own(BLOCK_REGISTRY[node.type].parts, command.partId)) issue(errors, ['command', 'partId'], 'PART', 'Use a registered semantic part.');
            else {
                if (kind === 'setStyle') { target.partStyles ||= {}; target.partStyles[command.partId] ||= {}; }
                styles = target.partStyles?.[command.partId];
            }
        } else { if (kind === 'setStyle') target.styles ||= {}; styles = target.styles; }
        const blockParts = node ? BLOCK_REGISTRY[node.type].parts : {};
        const properties = node ? (own(command, 'partId') ? (own(blockParts, command.partId) ? blockParts[command.partId] : []) : BLOCK_REGISTRY[node.type].styles) : PAGE_TEMPLATES[tree.pageKind].styles;
        if (!['base', 'tablet', 'desktop'].includes(command.tier) || (own(command, 'property') && !properties.includes(command.property))) issue(errors, ['command'], 'STYLE_COMMAND', 'Use a registered tier/property.');
        else if (styles) {
            if (kind === 'setStyle') {
                if (!own(command, 'property') || !own(command, 'value')) issue(errors, ['command'], 'STYLE_COMMAND', 'Property and value are required.');
                else { styles[command.tier] ||= {}; styles[command.tier][command.property] = clone(command.value); }
            } else if (own(command, 'property')) {
                if (styles[command.tier]) delete styles[command.tier][command.property];
            } else delete styles[command.tier];
            if (kind === 'resetStyle') {
                if (styles[command.tier] && !Object.keys(styles[command.tier]).length) delete styles[command.tier];
                if (!Object.keys(styles).length) {
                    if (own(command, 'partId')) {
                        delete target.partStyles[command.partId];
                        if (!Object.keys(target.partStyles).length) delete target.partStyles;
                    } else delete target.styles;
                }
            }
        }
    }
    if (kind === 'resetSectionStyles') for (const nodeId of subtree(tree, command.nodeId)) {
        delete tree.nodes[nodeId].styles; delete tree.nodes[nodeId].partStyles; delete tree.nodes[nodeId].stylePresetId;
    }
    if (['saveSection', 'savePreset'].includes(kind)) {
        const key = kind === 'saveSection' ? command.savedSectionId : command.presetId;
        const library = kind === 'saveSection' ? value.savedSections : value.stylePresets;
        if (!id(key) || own(library, key)) issue(errors, ['command'], 'LIBRARY_ID', 'Use a fresh, safe library identity.');
        else if (kind === 'savePreset') library[key] = { name: command.name, blockTypes: [node.type],
            ...(node.styles ? { styles: clone(node.styles) } : {}), ...(node.partStyles ? { partStyles: clone(node.partStyles) } : {}) };
        else {
            const occupied = new Set([...Object.values(value.templates), ...Object.values(value.savedSections)].flatMap(item => Object.keys(item.nodes)));
            const ids = subtree(tree, command.nodeId), mapping = {};
            let counter = 1;
            for (const oldId of ids) { while (occupied.has(`library_${counter}`)) counter++; const next = `library_${counter++}`; occupied.add(next); mapping[oldId] = next; }
            const nodes = Object.fromEntries(ids.map(oldId => {
                const copied = clone(tree.nodes[oldId]);
                if (copied.slots) for (const slot of Object.keys(copied.slots)) copied.slots[slot] = copied.slots[slot].map(reference => mapping[reference]);
                return [mapping[oldId], copied];
            }));
            library[key] = { name: command.name, pageKind: tree.pageKind, rootOrder: [mapping[command.nodeId]], nodes };
        }
    }
    if (['renameSaved', 'deleteSaved'].includes(kind)) {
        if (!id(command.savedSectionId) || !own(value.savedSections, command.savedSectionId)) issue(errors, ['command'], 'SAVED_REFERENCE', 'Select an existing saved section.');
        else if (kind === 'renameSaved') value.savedSections[command.savedSectionId].name = command.name;
        else delete value.savedSections[command.savedSectionId];
    }
    if (kind === 'deletePreset') {
        const used = [...Object.values(value.templates), ...Object.values(value.savedSections)].some(item => Object.values(item.nodes).some(node => node.stylePresetId === command.presetId));
        if (!id(command.presetId) || !own(value.stylePresets, command.presetId) || used) issue(errors, ['command'], 'PRESET_IN_USE', 'Remove references before deleting this preset.');
        else delete value.stylePresets[command.presetId];
    }
    if (errors.length) return { valid: false, errors };
    const after = validatePageTemplates(value, colorTokens);
    return after.valid ? { valid: true, errors: [], value, insertedIds } : { valid: false, errors: after.errors };
}
module.exports = { applyPageTemplateCommand };
