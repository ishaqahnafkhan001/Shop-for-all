import { resolveCorePalette } from './corePalette.js';
import { BLOCK_REGISTRY, PAGE_KINDS, PAGE_TEMPLATES, validatePageTemplates, resolveResponsiveStyles } from '@scaleup/storefront-theme/adaptive';

const plans = new WeakSet();
const tiers = ['base', 'tablet', 'desktop'];
const textProperties = ['color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign'];
export const ADAPTIVE_RENDERED_PAGES = Object.freeze([...PAGE_KINDS]);
const failure = (code, message, path = []) => ({ valid: false, errors: [{ code, message, path }] });
const freeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.values(value).forEach(freeze);
        Object.freeze(value);
    }
    return value;
};
export const isAdaptivePagePlan = plan => Boolean(plan && plans.has(plan));

// The editor must intersect the shared format with the adapters actually
// implemented in this entry. An absent adapter never implies a working control.
export const ADAPTIVE_RENDER_CAPABILITIES = freeze(Object.fromEntries(Object.entries(PAGE_TEMPLATES).map(([kind, page]) => [kind, {
    supported: ADAPTIVE_RENDERED_PAGES.includes(kind),
    ...(ADAPTIVE_RENDERED_PAGES.includes(kind) ? {
        pageStyles: page.styles, corePosition: page.corePosition, surroundingContent: page.surroundingContent,
        blocks: Object.fromEntries(Object.entries(BLOCK_REGISTRY).filter(([, block]) => block.pageKinds.includes(kind)
            && (!block.protected || block.pageKinds[0] === kind)).map(([type, block]) => [type, {
            styles: block.styles, parts: block.parts, protected: block.protected,
        }])),
    } : { reason: 'PAGE_ADAPTER' }),
}])));

// Validate before cloning/reading fields. A projection differs from the full
// contract only by omitting the private saved-section library. Never accept a
// partial template or silently strip unknown fields to make input valid.
export function resolveAdaptivePage({ siteBuilder, pageKind, colorTokens } = {}) {
    if (!ADAPTIVE_RENDERED_PAGES.includes(pageKind)) return failure('PAGE_ADAPTER', 'This page family has no approved presentation adapter yet.');
    if (!colorTokens) return failure('COLOR_CONTEXT', 'Provide the complete trusted effective color-token map.');
    // The contract inspector rejects getters without evaluating them.
    const descriptor = siteBuilder && typeof siteBuilder === 'object'
        ? Object.getOwnPropertyDescriptor(siteBuilder, 'savedSections') : null;
    let document = siteBuilder;
    if (!descriptor && siteBuilder && typeof siteBuilder === 'object' && !Array.isArray(siteBuilder)) {
        // Inspect the unmodified value first, with an own empty library attached
        // through descriptors; object spread would evaluate hostile getters.
        document = Object.create(Object.getPrototypeOf(siteBuilder), Object.getOwnPropertyDescriptors(siteBuilder));
        Object.defineProperty(document, 'savedSections', { value: {}, enumerable: true });
    }
    const checked = validatePageTemplates(document, colorTokens);
    if (!checked.valid) return checked;
    const templateId = ['header', 'footer'].includes(pageKind) ? document.globals[pageKind] : document.defaultTemplates[pageKind];
    if (!templateId) return failure('PAGE_ASSIGNMENT', 'No adaptive assignment exists; retain the legacy route.', ['defaultTemplates', pageKind]);
    const detached = JSON.parse(JSON.stringify(document));
    const template = detached.templates[templateId];
    const nodes = {};
    const paletteErrors = [];
    let ordinal = 0;
    const resolve = (layers, tier, capability) => {
        const result = resolveResponsiveStyles(layers, tier, capability);
        if (!result.valid) throw new TypeError('Validated adaptive styles failed resolution.');
        return result.value;
    };
    const pageStyles = Object.fromEntries(tiers.map(tier => [tier, resolve({ node: template.styles || {} }, tier,
        { properties: PAGE_TEMPLATES[pageKind].styles, functional: true, outerWidth: true })]));
    const visit = (nodeId, parent) => {
        const node = template.nodes[nodeId], block = BLOCK_REGISTRY[node.type];
        const preset = detached.stylePresets[node.stylePresetId] || {};
        const styles = {}, parts = {}, partOverrides = {};
        for (const tier of tiers) {
            const inherited = parent && Object.fromEntries(Object.entries(nodes[parent].styles[tier])
                .filter(([key]) => textProperties.includes(key) && block.styles.includes(key)));
            styles[tier] = resolve({ ...(parent ? { defaults: { base: inherited } } : { page: template.styles || {} }),
                preset: preset.styles || {}, node: node.styles || {} }, tier, { properties: block.styles, functional: block.protected });
            for (const [partId, properties] of Object.entries(block.parts)) {
                parts[partId] ||= {};
                partOverrides[partId] ||= {};
                partOverrides[partId][tier] = resolve({ preset: preset.partStyles?.[partId] || {}, part: node.partStyles?.[partId] || {} }, tier,
                    { properties, functional: block.protected, ...block.partStyleOptions?.[partId] });
                // Box overrides on the node are never copied into its parts.
                // Text may inherit; preset/explicit part overrides are stronger.
                const inheritedText = Object.fromEntries(Object.entries(styles[tier])
                    .filter(([key]) => textProperties.includes(key) && properties.includes(key)));
                parts[partId][tier] = resolve({ defaults: { base: inheritedText },
                    preset: preset.partStyles?.[partId] || {}, part: node.partStyles?.[partId] || {} }, tier,
                { properties, functional: block.protected, ...block.partStyleOptions?.[partId] });
            }
        }
        const palette = block.protected ? resolveCorePalette({ node, preset, template, styles, pageStyles, tokens: colorTokens, kind: pageKind }) : null;
        if (palette && !palette.valid) paletteErrors.push(...palette.errors.map(error => ({ ...error, path: ['templates', templateId, 'nodes', nodeId, ...error.path] })));
        nodes[nodeId] = { ...node, styleId: `n${ordinal++}`, styles, parts, partOverrides, ...(palette?.value ? { palette: palette.value } : {}) };
        for (const children of Object.values(node.slots || {})) children.forEach(child => visit(child, nodeId));
    };
    template.rootOrder.forEach(nodeId => visit(nodeId));
    if (paletteErrors.length) return { valid: false, errors: paletteErrors.slice(0, 100) };
    const plan = freeze({ version: 1, pageKind, templateId, rootOrder: template.rootOrder, nodes,
        pageStyles, colorTokens: JSON.parse(JSON.stringify(colorTokens)) });
    plans.add(plan);
    return { valid: true, errors: [], value: plan };
}
