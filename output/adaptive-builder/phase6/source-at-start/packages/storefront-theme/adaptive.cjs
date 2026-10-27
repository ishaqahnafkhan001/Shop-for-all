'use strict';

// Explicit opt-in import only. Never imported by the current v4 root entry.
const { LIMITS } = require('./adaptiveData.cjs');
const { ADAPTIVE_CONTRACT_VERSION, PAGE_KINDS, DEFAULT_PAGE_KINDS, SOURCE_BINDINGS, PAGE_TEMPLATES, BLOCK_REGISTRY, coreNodeId, createPageTemplate, createPageTemplateDocument } = require('./pageTemplates.cjs');
const { validatePageTemplates, validateCompleteThemeBudget } = require('./pageTemplateValidation.cjs');
const { ADAPTIVE_BREAKPOINTS, APPROVED_FONTS, COLOR_TOKENS, STYLE_PROPERTIES, validateResponsiveStyles, tierForWidth, resolveResponsiveStyles } = require('./responsiveStyles.cjs');
const { applyPageTemplateCommand } = require('./pageTemplateCommands.cjs');
module.exports = { LIMITS, ADAPTIVE_CONTRACT_VERSION, PAGE_KINDS, DEFAULT_PAGE_KINDS, SOURCE_BINDINGS, PAGE_TEMPLATES, BLOCK_REGISTRY,
    coreNodeId, createPageTemplate, createPageTemplateDocument, validatePageTemplates, validateCompleteThemeBudget,
    ADAPTIVE_BREAKPOINTS, APPROVED_FONTS, COLOR_TOKENS, STYLE_PROPERTIES, validateResponsiveStyles, tierForWidth,
    resolveResponsiveStyles, applyPageTemplateCommand };
