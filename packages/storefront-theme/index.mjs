import * as contractNamespace from './index.cjs';

// Node/Next expose CommonJS module.exports as `default`, while Vite's dev
// transform exposes the statically detected named exports. Support both so
// this shared contract behaves the same in each consuming app.
const contract = contractNamespace.default || contractNamespace;

export const {
    THEME_SCHEMA_VERSION,
    SECTION_REGISTRY,
    SECTION_TYPES,
    ALLOWED_THEME_KEYS,
    FALLBACK_THEME,
    cloneTheme,
    normalizeTheme,
    createDefaultSection,
    normalizeHomepageSections,
    normalizeThemeColors,
    sanitizeThemePayload,
    validateTheme,
    getEnabledHomepageSections,
    getSortedNavigation,
    getThemeCssVars,
    getThemeCapabilityMetadata,
    extractThemeAssetUrls,
    summarizeThemeChanges,
    isSafeThemeUrl,
    sanitizeThemeUrl,
    TITLE_MAX,
    DESCRIPTION_MAX,
    SPELLING_GROUPS,
    cleanSeoText,
    truncateSeoText,
    normalizeSearchText,
    expandSearchSynonyms,
    areBrandAliasesRelated,
    normalizeSearchAliases,
    buildSeoInputSnapshot,
    computeSeoInputHash,
    isVerifiedCustomDomain,
    resolveCanonicalOrigin,
    resolveHomepageSeo,
    buildNextHomepageMetadata,
    buildSeoPreviewModel,
    evaluateHomepageSeo,
} = contract;

export default contract;
