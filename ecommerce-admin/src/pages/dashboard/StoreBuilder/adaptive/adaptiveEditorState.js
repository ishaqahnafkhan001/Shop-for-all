import { applyPageTemplateCommand, BLOCK_REGISTRY, getAdaptiveColorTokens, PAGE_KINDS, PAGE_TEMPLATES, validatePageTemplates } from '@scaleup/storefront-theme/adaptive';
import { normalizeStoredTheme, validateStoredTheme } from '@scaleup/storefront-theme/storage';

export const EDITABLE_REGIONS = Object.freeze([...PAGE_KINDS]);
export const PAGE_GROUPS = Object.freeze({ Storefront: { home: 'Homepage', product: 'Product Details', category: 'Categories', collection: 'Collections' },
    Shopping: { cart: 'Cart', checkout: 'Checkout' }, Customer: { account: 'Account', track: 'Order Tracking' },
    Information: { policiesIndex: 'Policies', policy: 'Policy Details' }, Global: { header: 'Global header', footer: 'Global footer' } });
export const VIEWPORTS = Object.freeze({ base: { label: 'Mobile', width: 390 }, tablet: { label: 'Tablet', width: 768 }, desktop: { label: 'Desktop', width: 1280 } });
export const editorTokens = getAdaptiveColorTokens;
export const regionTemplateId = (document, region) => ['header', 'footer'].includes(region) ? document.globals[region] : document.defaultTemplates[region];
export const mayOpenAdaptiveEditor = (theme, availability) => Number(theme?.version) === 5 && availability?.available === true;
export const nodeLabel = (tree, nodeId) => {
    const node = tree.nodes[nodeId];
    return node?.content?.text?.slice(0, 60) || node?.content?.label || node?.content?.alt || node?.type || 'Page';
};
export function flattenTree(tree) {
    const result = [];
    const visit = (nodeId, parentId = null, slot = null, depth = 0) => {
        result.push({ nodeId, parentId, slot, depth });
        for (const [name, ids] of Object.entries(tree.nodes[nodeId].slots || {})) ids.forEach(id => visit(id, nodeId, name, depth + 1));
    };
    tree.rootOrder.forEach(id => visit(id)); return result;
}
export function validateSelection(document, selection) {
    if (!selection || !EDITABLE_REGIONS.includes(document.templates[selection.templateId]?.pageKind) || !Object.hasOwn(VIEWPORTS, selection.viewport)) return null;
    const node = document.templates[selection.templateId].nodes[selection.nodeId];
    if (selection.nodeId && !node) return null;
    if (selection.partId && (!node || !Object.hasOwn(BLOCK_REGISTRY[node.type].parts, selection.partId))) return null;
    return { templateId: selection.templateId, nodeId: selection.nodeId || null, partId: selection.partId || null, viewport: selection.viewport };
}
export function applyAdaptiveEdit(theme, command) {
    const checked = validateStoredTheme(theme);
    if (!checked.valid) return checked;
    if (Number(theme.version) !== 5 || !EDITABLE_REGIONS.includes(theme.siteBuilder.templates[command?.templateId]?.pageKind)) return { valid: false, errors: [{ code: 'EDITOR_SCOPE', path: [], message: 'Select an assigned registered page template.' }] };
    const result = applyPageTemplateCommand(theme.siteBuilder, command, editorTokens(theme));
    if (!result.valid) return result;
    const value = { ...theme, siteBuilder: result.value };
    const complete = validateStoredTheme(value);
    return complete.valid ? { ...result, value } : complete;
}
export function freshDesignId(document, prefix = 'block') {
    const occupied = new Set([...Object.keys(document.savedSections), ...Object.keys(document.stylePresets), ...Object.values(document.templates).flatMap(tree => Object.keys(tree.nodes)), ...Object.values(document.savedSections).flatMap(tree => Object.keys(tree.nodes))]);
    let index = 1; while ([...occupied].some(key => key === `${prefix}_${index}` || key.startsWith(`${prefix}_${index}_`))) index++;
    return `${prefix}_${index}`;
}
// Code-owned starter compositions use the existing eight optional block types.
// Names are UI labels, not new node types or a conversion of legacy sections.
export function createBlockFragment(document, kind, assetId) {
    const nodes = {}, prefix = freshDesignId(document), next = type => { const id = `${prefix}_${Object.keys(nodes).length}`; nodes[id] = { type }; return id; };
    const text = (copy, heading = false) => { const id = next('content.text'); nodes[id].content = { text: copy, kind: heading ? 'heading' : 'paragraph' }; return id; };
    const link = () => { const id = next('content.link'); nodes[id].content = { label: 'Explore the store', destination: { kind: 'storePath', path: '/' } }; return id; };
    let rootId;
    if (['hero', 'story', 'promotion', 'banner', 'content.section'].includes(kind)) {
        rootId = next('content.section');
        const names = { hero: 'Welcome to our store', story: 'Our story', promotion: 'Discover our collection', banner: 'Featured collection' };
        const body = [text(names[kind] || 'New section', true), text('Add your own store information.')];
        if (kind === 'banner' && assetId) { const id = next('content.image'); nodes[id].content = { assetId, alt: 'Collection image' }; body.push(id); }
        if (kind === 'hero' || kind === 'promotion') body.push(link());
        nodes[rootId].slots = { body };
    } else if (kind === 'layout.stack' || kind === 'layout.columns') {
        rootId = next(kind); nodes[rootId].slots = { [kind === 'layout.stack' ? 'body' : 'columns']: kind === 'layout.stack' ? [text('New content')] : [text('First column'), text('Second column')] };
    } else if (kind === 'content.text') rootId = text('New text');
    else if (kind === 'content.link') rootId = link();
    else if (kind === 'content.image') { rootId = next(kind); nodes[rootId].content = { assetId, alt: 'Describe this image' }; }
    else if (kind === 'catalog.products' || kind === 'catalog.categories') { rootId = next(kind); nodes[rootId].source = { kind: kind === 'catalog.products' ? 'catalog' : 'categories', limit: 6 }; }
    else throw new TypeError('Select a registered optional block.');
    return { rootId, nodes };
}
export function compatiblePlacements(tree, type, movingId) {
    const result = [], block = BLOCK_REGISTRY[type];
    if (!block || block.protected || !block.pageKinds.includes(tree.pageKind)) return result;
    const descendants = new Set();
    const visit = id => { descendants.add(id); Object.values(tree.nodes[id].slots || {}).flat().forEach(visit); };
    if (movingId && tree.nodes[movingId]) visit(movingId);
    if (PAGE_TEMPLATES[tree.pageKind].rootTypes.includes(type) && block.parentSlots.includes('root')) result.push({ label: 'Page', placement: { index: tree.rootOrder.length - (tree.rootOrder.includes(movingId) ? 1 : 0) } });
    for (const [parentId, node] of Object.entries(tree.nodes)) if (!descendants.has(parentId)) for (const [slot, definition] of Object.entries(BLOCK_REGISTRY[node.type].slots)) {
        const refs = node.slots?.[slot] || [];
        if (definition.allowedTypes.includes(type) && block.parentSlots.includes(`${node.type}.${slot}`) && refs.length - Number(refs.includes(movingId)) < definition.max) result.push({ label: `${nodeLabel(tree, parentId)} / ${slot}`, placement: { parentId, slot, index: refs.length - Number(refs.includes(movingId)) } });
    }
    return result;
}
export function styleOrigin(theme, selection, property) {
    const tree = theme.siteBuilder.templates[selection.templateId], node = tree.nodes[selection.nodeId];
    const preset = theme.siteBuilder.stylePresets[node?.stylePresetId];
    const layers = node ? [selection.partId ? node.partStyles?.[selection.partId] : node.styles,
        selection.partId ? preset?.partStyles?.[selection.partId] : preset?.styles] : [tree.styles];
    const tiers = Object.keys(VIEWPORTS).slice(0, Object.keys(VIEWPORTS).indexOf(selection.viewport) + 1).reverse();
    for (let layer = 0; layer < layers.length; layer++) for (const tier of tiers) if (Object.hasOwn(layers[layer]?.[tier] || {}, property)) return layer === 1 ? `Style preset · ${tier}` : tier === selection.viewport ? 'Explicit override' : `Inherited · ${VIEWPORTS[tier].label}`;
    return node ? 'Inherited from page, parent or theme' : 'Controlled by theme';
}
export function parseBuilderRecovery(record, expectedRevision) {
    if (!record) return { compatible: false, message: 'No recovery copy.' };
    if (record.formatVersion !== undefined && record.formatVersion !== 1) return { compatible: false, message: 'A newer or unknown recovery format is preserved. Open it in a compatible editor before discarding it.' };
    if (Number(record.basedOnRevision || 0) !== Number(expectedRevision || 0)) return { compatible: false, message: 'This recovery copy belongs to another published revision. It has been preserved for reconciliation.' };
    try {
        if (typeof record.snapshot !== 'string' || record.snapshot.length > 1024 * 1024) throw new Error('Recovery snapshot is missing or exceeds the supported budget.');
        const value = JSON.parse(record.snapshot);
        if (!value.theme || Object.keys(value).some(key => !['theme', 'searchAliases', 'customDomain', 'storewideDiscount'].includes(key))) throw new Error('This recovery snapshot format is not supported.');
        const theme = normalizeStoredTheme(value.theme);
        return { compatible: true, value: { ...value, theme } };
    } catch (error) { return { compatible: false, message: error.message || 'Recovery data could not be validated. The copy has been preserved.' }; }
}
export function selectedIssue(document, issue, viewport) {
    const path = Array.isArray(issue.path) ? issue.path : String(issue.path || '').split('.');
    const start = path[0] === 'siteBuilder' ? 1 : 0;
    if (path[start] !== 'templates') return null;
    const templateId = path[start + 1], nodeId = path[start + 2] === 'nodes' ? path[start + 3] : null;
    const partIndex = path.indexOf('partStyles', start + 4);
    return validateSelection(document, { templateId, nodeId, partId: partIndex >= 0 ? path[partIndex + 1] : null, viewport });
}
export const validateEditorDocument = (document, tokens) => validatePageTemplates(document, tokens);
export const FUTURE_REGIONS = Object.freeze(PAGE_KINDS.filter(kind => !EDITABLE_REGIONS.includes(kind)));
