'use strict';

const { id, own, deepFreeze, LIMITS } = require('./adaptiveData.cjs');
const { TEXT_STYLES, BOX_STYLES, CORE_STYLES, PAGE_STYLES } = require('./responsiveStyles.cjs');
const PAGE_KINDS = Object.freeze(['home', 'product', 'category', 'collection', 'cart', 'checkout', 'account', 'track', 'policiesIndex', 'policy', 'header', 'footer']);
const DEFAULT_PAGE_KINDS = Object.freeze(PAGE_KINDS.slice(0, 10));
const SOURCE_BINDINGS = deepFreeze({
    currentProduct: { fields: ['kind'], required: ['kind'], context: 'route', private: false },
    currentCategory: { fields: ['kind'], required: ['kind'], context: 'route', private: false },
    currentCollection: { fields: ['kind'], required: ['kind'], context: 'route', private: false },
    currentPolicy: { fields: ['kind'], required: ['kind'], context: 'route', private: false },
    manualProducts: { fields: ['kind', 'productIds'], required: ['kind', 'productIds'], minItems: 1, maxItems: 24, ownershipRequired: true },
    catalog: { fields: ['kind', 'limit'], required: ['kind', 'limit'], minItems: 1, maxItems: 24, ownershipRequired: true },
    categories: { fields: ['kind', 'limit'], required: ['kind', 'limit'], minItems: 1, maxItems: 12, ownershipRequired: true },
});
const ADAPTIVE_CONTRACT_VERSION = 1; // Isolated siteBuilder format; NOT the persisted theme schema version.
const optional = ['add', 'remove', 'copy', 'move', 'style', 'reset', 'preset'];
const richPages = ['home', 'product', 'category', 'collection', 'policiesIndex', 'policy'];
const leafTypes = ['content.text', 'content.image', 'content.link', 'catalog.products', 'catalog.categories'];
const groupTypes = ['layout.stack', 'layout.columns'];
const definition = (fields) => {
    const block = {
        pageKinds: PAGE_KINDS, parentSlots: ['root', 'content.section.body', 'layout.stack.body', 'layout.columns.columns'],
        slots: {}, minChildren: 0, maxChildren: 0, contentFields: [], requiredContent: [], sourceKinds: [], sourceRequired: false,
        styles: [...TEXT_STYLES, ...BOX_STYLES, 'visible'], parts: {}, operations: optional,
        optional: true, protected: false, ...fields,
    };
    if (block.optional) block.operations = [...optional, ...(block.contentFields.length ? ['content'] : []), ...(block.sourceKinds.length ? ['source'] : [])];
    return block;
};
const blocks = {
    'content.section': definition({ parentSlots: ['root'],
        slots: { body: { allowedTypes: [...leafTypes, ...groupTypes], min: 1, max: 12 } }, minChildren: 1, maxChildren: 12,
        styles: [...BOX_STYLES, ...TEXT_STYLES, 'minHeight', 'gap', 'visible'] }),
    'layout.stack': definition({ parentSlots: ['content.section.body'],
        slots: { body: { allowedTypes: leafTypes, min: 1, max: 12 } }, minChildren: 1, maxChildren: 12,
        styles: [...BOX_STYLES, ...TEXT_STYLES, 'gap', 'alignItems', 'justifyContent', 'visible'] }),
    'layout.columns': definition({ pageKinds: richPages, parentSlots: ['content.section.body'],
        slots: { columns: { allowedTypes: leafTypes, min: 2, max: 4 } }, minChildren: 2, maxChildren: 4,
        styles: [...BOX_STYLES, ...TEXT_STYLES, 'gap', 'columns', 'alignItems', 'stackOnMobile', 'visible'] }),
    'content.text': definition({ contentFields: ['text', 'kind'], requiredContent: ['text'] }),
    'content.link': definition({ contentFields: ['label', 'destination'], requiredContent: ['label', 'destination'], parts: { label: TEXT_STYLES } }),
    'content.image': definition({ pageKinds: richPages, contentFields: ['assetId', 'alt'], assetFields: ['assetId'], requiredContent: ['assetId', 'alt'],
        styles: [...BOX_STYLES, 'height', 'aspectRatio', 'objectFit', 'visible'] }),
    'catalog.products': definition({ pageKinds: ['home', 'product', 'category', 'collection'],
        sourceKinds: ['manualProducts', 'catalog'], sourceRequired: true, legacySectionType: 'FeaturedProducts',
        parts: { title: TEXT_STYLES, card: CORE_STYLES }, styles: [...BOX_STYLES, 'gap', 'visible'] }),
    'catalog.categories': definition({ pageKinds: ['home'], sourceKinds: ['categories'], sourceRequired: true,
        legacySectionType: 'CategoryList', styles: [...BOX_STYLES, 'gap', 'visible'] }),
};
const corePartParents = {
    header: { surface: [], identity: ['surface'], navigation: ['surface'], utilities: ['surface'] },
    footer: { surface: [], identity: ['surface'], navigation: ['surface'], policies: ['surface'] },
    product: { surface: [], information: ['surface'], title: ['information'], price: ['information'], description: ['information'], options: ['information'], quantity: ['information'], primaryButton: ['surface', 'information'], secondaryButton: ['surface', 'information'], error: ['surface'] },
    category: { surface: [], title: ['surface'], description: ['surface'], filters: ['surface'], sort: ['surface'], listing: ['surface'], card: ['listing'], pagination: ['surface'], empty: ['surface'], error: ['surface'] },
    collection: { surface: [], title: ['surface'], description: ['surface'], sort: ['surface'], listing: ['surface'], card: ['listing'], pagination: ['surface'], empty: ['surface'], error: ['surface'] },
    cart: { surface: [], heading: ['surface'], items: ['surface'], totals: ['surface'], primaryButton: ['totals'], error: ['surface'] },
    account: { surface: [], heading: ['surface'], label: ['surface'], input: ['surface'], primaryButton: ['surface'], error: ['surface'] },
    track: { surface: [], heading: ['surface', 'summary'], label: ['surface', 'summary'], input: ['surface', 'summary'], summary: ['surface'], primaryButton: ['surface', 'summary'], error: ['surface', 'summary'] },
    policiesIndex: { surface: [], heading: ['surface'], links: ['surface'] },
    policy: { surface: [], heading: ['surface'], body: ['surface'], links: ['surface'] },
    checkout: { surface: [], summary: ['surface'], heading: ['surface', 'summary'], label: ['surface', 'summary'], input: ['surface', 'summary'], primaryButton: ['surface', 'summary'], error: ['surface', 'summary'] },
};
const coreParts = {
    product: ['surface', 'layout', 'galleryFrame', 'information', 'description', 'title', 'price', 'options', 'quantity', 'primaryButton', 'secondaryButton', 'error'],
    category: ['surface', 'title', 'description', 'cover', 'filters', 'sort', 'listing', 'card', 'pagination', 'empty', 'error'],
    collection: ['surface', 'title', 'description', 'cover', 'sort', 'listing', 'card', 'pagination', 'empty', 'error'],
    cart: ['surface', 'layout', 'heading', 'image', 'items', 'totals', 'primaryButton', 'error'],
    checkout: ['surface', 'layout', 'heading', 'label', 'input', 'summary', 'primaryButton', 'error'],
    account: ['surface', 'layout', 'heading', 'label', 'input', 'primaryButton', 'error'],
    track: ['surface', 'heading', 'label', 'input', 'summary', 'primaryButton', 'error'],
    policiesIndex: ['surface', 'heading', 'links'], policy: ['surface', 'heading', 'body', 'links'],
    header: ['surface', 'identity', 'navigation', 'utilities'], footer: ['surface', 'identity', 'navigation', 'policies'],
};
const bindings = { product: 'currentProduct', category: 'currentCategory', collection: 'currentCollection', policy: 'currentPolicy' };
const states = {
    product: ['loading', 'missing', 'available', 'unavailable', 'variantRequired'],
    category: ['loading', 'missing', 'populated', 'empty', 'filtered'], collection: ['loading', 'missing', 'populated', 'empty'],
    cart: ['empty', 'populated', 'refreshing', 'error'], checkout: ['empty', 'form', 'otp', 'busy', 'error', 'success'],
    account: ['anonymous', 'customer', 'vendor', 'registration', 'reset', 'security'],
    track: ['lookup', 'unverified', 'verified', 'cancelEligible', 'returnEligible', 'ineligible'],
    policiesIndex: ['index'], policy: ['content', 'notFound'], header: ['navigation'], footer: ['policyAccess'],
};
const pages = {};
for (const kind of PAGE_KINDS) {
    const coreType = kind === 'home' ? null : `${kind}.core`;
    if (coreType) blocks[coreType] = definition({ pageKinds: [kind], parentSlots: ['root'], optional: false, protected: true,
        operations: ['style', 'reset', 'preset'], styles: CORE_STYLES,
        sourceKinds: bindings[kind] ? [bindings[kind]] : [], sourceRequired: Boolean(bindings[kind]),
        parts: Object.fromEntries(coreParts[kind].map(part => [part,
            ['galleryFrame', 'cover', 'image'].includes(part) ? [...CORE_STYLES.filter(key => !TEXT_STYLES.includes(key)), 'aspectRatio', 'objectFit', 'height']
                : part === 'listing' ? [...CORE_STYLES, 'columns', 'gap'] : part === 'layout' ? ['layoutMode', 'gap']
                    : ['error', 'label', 'price'].includes(part) ? TEXT_STYLES : CORE_STYLES])),
        partStyleOptions: Object.fromEntries(coreParts[kind].filter(part => ['galleryFrame', 'cover', 'image', 'listing'].includes(part)).map(part => [part, part === 'listing' ? { grid: true } : { media: true }])),
        partParents: corePartParents[kind], runtimeStates: states[kind],
    });
    pages[kind] = { pageKind: kind, blueprintId: kind === 'checkout' ? 'checkout-default-v1' : `${kind}-standard-v1`,
        blueprintVersion: 1, requiredCore: coreType, corePosition: coreType ? 0 : null,
        rootTypes: [coreType, 'content.section', 'content.text', 'content.link', ...(richPages.includes(kind) ? ['content.image', 'catalog.products', 'catalog.categories'] : [])].filter(Boolean),
        maxRoots: kind === 'checkout' || ['header', 'footer'].includes(kind) ? 3 : LIMITS.nodesPerTemplate,
        // Functional conditions live in the existing controllers, never in JSON.
        runtimeStates: states[kind] || ['content'], styles: PAGE_STYLES,
        surroundingContent: { beforeCore: false, afterCore: true },
    };
}
const BLOCK_REGISTRY = deepFreeze(blocks);
const PAGE_TEMPLATES = deepFreeze(pages);
const coreNodeId = templateId => {
    if (!id(templateId) || templateId.length > 48) throw new TypeError('Use a safe template ID of at most 48 characters.');
    return `core_${templateId}`;
};
function createPageTemplate(templateId, pageKind) {
    if (!id(templateId) || templateId.length > 48 || !own(PAGE_TEMPLATES, pageKind)) throw new TypeError('Use a registered page kind and a template ID of at most 48 characters.');
    const page = PAGE_TEMPLATES[pageKind], coreId = coreNodeId(templateId), core = page.requiredCore;
    return { pageKind, blueprintId: page.blueprintId, rootOrder: core ? [coreId] : [], nodes: core ? {
        [coreId]: { type: core, ...(bindings[pageKind] ? { source: { kind: bindings[pageKind] } } : {}) },
    } : {} };
}
function createPageTemplateDocument() {
    return { version: ADAPTIVE_CONTRACT_VERSION, defaultTemplates: {}, globals: {}, templates: {}, savedSections: {}, stylePresets: {} };
}
module.exports = { ADAPTIVE_CONTRACT_VERSION, PAGE_KINDS, DEFAULT_PAGE_KINDS, SOURCE_BINDINGS, PAGE_TEMPLATES, BLOCK_REGISTRY, coreNodeId, createPageTemplate, createPageTemplateDocument };
