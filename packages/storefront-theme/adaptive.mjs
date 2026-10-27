import * as namespace from './adaptive.cjs';
const contract = namespace.default || namespace;
export const { LIMITS, ADAPTIVE_CONTRACT_VERSION, PAGE_KINDS, DEFAULT_PAGE_KINDS, SOURCE_BINDINGS, PAGE_TEMPLATES, BLOCK_REGISTRY,
    coreNodeId, createPageTemplate, createPageTemplateDocument, validatePageTemplates, validateCompleteThemeBudget,
    ADAPTIVE_BREAKPOINTS, APPROVED_FONTS, COLOR_TOKENS, STYLE_PROPERTIES, validateResponsiveStyles, tierForWidth,
    resolveResponsiveStyles, applyPageTemplateCommand, getAdaptiveColorTokens } = contract;
export default contract;
