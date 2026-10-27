'use strict';

// Reader support is deliberately separate from the legacy v4 editor contract.
const legacy = require('./index.cjs');
const { validatePageTemplates, validateCompleteThemeBudget, BLOCK_REGISTRY, SOURCE_BINDINGS } = require('./adaptive.cjs');
const READABLE_THEME_VERSION = 5;
const isAdaptiveTheme = theme => Number(theme?.version) === 5 && Object.hasOwn(theme || {}, 'siteBuilder');
const failure = (message, code = 'INVALID_ADAPTIVE_THEME', validation = []) => Object.assign(new Error(message), {
    code, statusCode: 409, validation,
});
const assertReadableThemeVersion = (theme = {}) => {
    if (!theme || typeof theme !== 'object' || Array.isArray(theme)) throw failure('A theme must be an object.');
    if (theme.version !== undefined && (!Number.isInteger(Number(theme.version)) || Number(theme.version) < 1 || Number(theme.version) > READABLE_THEME_VERSION)) {
        throw failure('Update the application before reading this theme version.', 'UNSUPPORTED_THEME_VERSION');
    }
    if (Number(theme.version) === 5 && !Object.hasOwn(theme, 'siteBuilder')) {
        throw failure('A v5 theme requires its complete siteBuilder document.', 'UNSUPPORTED_THEME_VERSION');
    }
    if (Number(theme.version) === 5 && theme.version !== 5) throw failure('Theme version 5 must be a number.', 'UNSUPPORTED_THEME_VERSION');
    if (Number(theme.version) !== 5 && Object.hasOwn(theme, 'siteBuilder')) {
        throw failure('Adaptive configuration requires explicit theme version 5.');
    }
};
const legacyFields = theme => {
    const rest = { ...theme }; delete rest.siteBuilder;
    return { ...rest, version: 4 };
};
const tokensFor = theme => {
    const colors = legacy.normalizeThemeColors(theme);
    return Object.fromEntries(Object.keys(legacy.FALLBACK_THEME.colors)
        .filter(key => typeof legacy.FALLBACK_THEME.colors[key] === 'string').map(key => [key, colors[key]]));
};
const validateStoredTheme = (theme = {}) => {
    try { assertReadableThemeVersion(theme); } catch (error) {
        return { valid: false, errors: [{ path: ['version'], code: error.code, message: error.message }] };
    }
    if (!isAdaptiveTheme(theme)) return legacy.validateTheme(theme);
    const budget = validateCompleteThemeBudget(theme);
    if (!budget.valid) return budget;
    const graph = validatePageTemplates(theme.siteBuilder, tokensFor(theme));
    const old = legacy.validateTheme(legacyFields(theme));
    const errors = [...old.errors, ...graph.errors.map(error => ({ ...error, path: ['siteBuilder', ...error.path] }))];
    return { valid: errors.length === 0, errors };
};
const normalizeStoredTheme = (theme = {}) => {
    assertReadableThemeVersion(theme);
    if (!isAdaptiveTheme(theme)) return legacy.normalizeTheme(theme);
    const result = validateStoredTheme(theme);
    if (!result.valid) throw failure('The adaptive theme is invalid. Correct the indicated fields.', 'INVALID_ADAPTIVE_THEME', result.errors);
    const normalized = { ...legacy.normalizeTheme(legacyFields(theme)), version: 5, siteBuilder: JSON.parse(JSON.stringify(theme.siteBuilder)) };
    const budget = validateCompleteThemeBudget(normalized);
    if (!budget.valid) throw failure('The complete normalized theme exceeds the supported budget.', 'INVALID_ADAPTIVE_THEME', budget.errors);
    return normalized;
};

// Typed discovery only: traverse declared records and registry-declared fields.
const collectAdaptiveReferences = theme => {
    if (!isAdaptiveTheme(theme)) return { assetIds: [], productIds: [] };
    const validation = validateStoredTheme(theme);
    if (!validation.valid) throw failure('Cannot collect references from an invalid theme.', 'INVALID_ADAPTIVE_THEME', validation.errors);
    const assets = new Set(), products = new Set();
    for (const tree of [...Object.values(theme.siteBuilder.templates), ...Object.values(theme.siteBuilder.savedSections)]) {
        for (const node of Object.values(tree.nodes)) {
            const definition = BLOCK_REGISTRY[node.type];
            for (const field of definition.assetFields || []) if (node.content?.[field]) assets.add(node.content[field]);
            const source = SOURCE_BINDINGS[node.source?.kind];
            if (source?.ownershipRequired && source.fields.includes('productIds')) for (const id of node.source.productIds || []) products.add(id);
        }
    }
    return { assetIds: [...assets], productIds: [...products] };
};

// Inert future projection. No reader/route invokes it until renderer approval.
const projectAdaptiveTheme = theme => {
    const normalized = normalizeStoredTheme(theme);
    if (!isAdaptiveTheme(normalized)) return null;
    const graph = normalized.siteBuilder;
    const assigned = new Set([...Object.values(graph.defaultTemplates), ...Object.values(graph.globals)]);
    const templates = Object.fromEntries([...assigned].map(id => [id, graph.templates[id]]));
    const usedPresets = new Set(Object.values(templates).flatMap(tree => Object.values(tree.nodes).map(node => node.stylePresetId).filter(Boolean)));
    return JSON.parse(JSON.stringify({ version: graph.version, defaultTemplates: graph.defaultTemplates, globals: graph.globals,
        templates, stylePresets: Object.fromEntries([...usedPresets].map(id => [id, graph.stylePresets[id]])) }));
};
module.exports = { READABLE_THEME_VERSION, isAdaptiveTheme, assertReadableThemeVersion, validateStoredTheme,
    normalizeStoredTheme, collectAdaptiveReferences, projectAdaptiveTheme };
