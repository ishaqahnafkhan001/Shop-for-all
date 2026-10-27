'use strict';

const { inspectJson, shape, issue, own, clone, deepFreeze } = require('./adaptiveData.cjs');
const { FALLBACK_THEME, normalizeHexColor, contrastRatio } = require('./index.cjs');
const ADAPTIVE_BREAKPOINTS = Object.freeze({ base: 0, tablet: 768, desktop: 1024 });
const TIERS = Object.freeze(Object.keys(ADAPTIVE_BREAKPOINTS));
const APPROVED_FONTS = Object.freeze(['Inter', 'Arial', 'Georgia', 'Roboto', 'DM Sans']);
// Reuse existing semantic names; never accept a merchant-defined CSS variable.
const COLOR_TOKENS = Object.freeze(Object.keys(FALLBACK_THEME.colors).filter(key => typeof FALLBACK_THEME.colors[key] === 'string'));
const DEFAULT_COLOR_TOKENS = Object.freeze(Object.fromEntries(COLOR_TOKENS.map(key => [key, FALLBACK_THEME.colors[key]])));
const TEXT_STYLES = Object.freeze(['color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign']);
const BOX_STYLES = Object.freeze(['background', 'width', 'maxWidth', 'paddingBlockStart', 'paddingBlockEnd', 'paddingInlineStart', 'paddingInlineEnd', 'marginBlockStart', 'marginBlockEnd', 'marginInlineStart', 'marginInlineEnd', 'borderColor', 'borderWidth', 'borderRadius']);
const CORE_STYLES = Object.freeze([...TEXT_STYLES, 'background', 'paddingBlockStart', 'paddingBlockEnd', 'paddingInlineStart', 'paddingInlineEnd', 'borderColor', 'borderWidth', 'borderRadius']);
const PAGE_STYLES = Object.freeze([...CORE_STYLES, 'maxWidth']);
const STYLE_PROPERTIES = deepFreeze({
    color: { kind: 'color' }, background: { kind: 'color' }, borderColor: { kind: 'color' },
    fontFamily: { values: APPROVED_FONTS }, fontSize: { kind: 'px', min: 12, max: 96 },
    fontWeight: { kind: 'number', min: 100, max: 900, step: 100 },
    lineHeight: { kind: 'number', min: 1.1, max: 2.5 }, letterSpacing: { kind: 'px', min: -1, max: 4 },
    textAlign: { values: ['start', 'center', 'end'] },
    width: { kind: 'dimension' }, maxWidth: { kind: 'dimension' },
    height: { kind: 'px', min: 64, max: 1200 }, minHeight: { kind: 'px', min: 0, max: 600 },
    aspectRatio: { kind: 'ratio' }, objectFit: { values: ['contain', 'cover'] },
    ...Object.fromEntries(BOX_STYLES.filter(key => /^(padding|margin)/.test(key)).map(key => [key, { kind: 'px', min: 0, max: 160 }])),
    borderWidth: { kind: 'px', min: 0, max: 8 }, borderRadius: { kind: 'px', min: 0, max: 64 },
    gap: { kind: 'px', min: 0, max: 80 }, columns: { values: [1, 2, 3, 4] },
    alignItems: { values: ['start', 'center', 'end', 'stretch'] },
    justifyContent: { values: ['start', 'center', 'end', 'space-between'] },
    stackOnMobile: { kind: 'boolean' }, visible: { kind: 'boolean' },
    layoutMode: { values: ['stack', 'columns'] },
});
function validateValue(property, value, errors, path, functional, outerWidth, media, grid) {
    const rule = STYLE_PROPERTIES[property];
    if (!rule) return issue(errors, path, 'STYLE_PROPERTY', 'Unregistered style property.');
    let valid = false;
    if (rule.values) valid = rule.values.includes(value);
    else if (rule.kind === 'boolean') valid = typeof value === 'boolean';
    else if (rule.kind === 'number') valid = typeof value === 'number' && Number.isFinite(value) && value >= rule.min && value <= rule.max && (!rule.step || value % rule.step === 0);
    else if (rule.kind === 'color') {
        if (value && typeof value === 'object') {
            if (own(value, 'token')) valid = shape(value, ['token'], errors, path) && COLOR_TOKENS.includes(value.token);
            else valid = shape(value, ['hex'], errors, path) && typeof value.hex === 'string' && Boolean(normalizeHexColor(value.hex));
        }
    } else if (rule.kind === 'ratio') {
        valid = shape(value, ['width', 'height'], errors, path) && ['width', 'height'].every(key => Number.isInteger(value[key]) && value[key] >= 1 && value[key] <= 32)
            && value.width / value.height >= 0.25 && value.width / value.height <= 4;
    } else if (rule.kind === 'dimension') {
        valid = shape(value, ['unit', 'value'], errors, path) && typeof value.value === 'number' && Number.isFinite(value.value)
            && ((value.unit === 'percent' && value.value >= 25 && value.value <= 100) || (value.unit === 'px' && value.value >= 160 && value.value <= 1920));
    } else if (rule.kind === 'px') {
        valid = shape(value, ['unit', 'value'], errors, path) && value.unit === 'px' && typeof value.value === 'number'
            && Number.isFinite(value.value) && value.value >= rule.min && value.value <= rule.max;
    }
    if (functional && valid) {
        if (property === 'fontSize') valid = value.value >= 14 && value.value <= 48;
        if (property === 'fontWeight') valid = value >= 400;
        if (property === 'lineHeight') valid = value >= 1.25;
        if (property === 'letterSpacing') valid = value.value >= 0 && value.value <= 2;
        if (/^padding/.test(property)) valid = value.value <= 48;
        if (['height', 'minHeight', 'aspectRatio', 'objectFit', 'width', 'maxWidth', 'visible', 'stackOnMobile', 'columns'].includes(property)) {
            valid = (media === true && ['height', 'aspectRatio', 'objectFit'].includes(property))
                || (grid === true && property === 'columns')
                || (property === 'maxWidth' && outerWidth === true && (value.unit === 'percent' ? value.value === 100 : value.value >= 320));
        }
    }
    if (!valid) issue(errors, path, 'STYLE_VALUE', 'Use a typed value within this component’s approved bounds.');
}
function checkStyles(styles, capability = {}, errors = [], path = []) {
    if (!shape(capability, ['properties', 'functional', 'outerWidth', 'media', 'grid'], errors, [...path, 'capability'])) return errors;
    if ((own(capability, 'properties') && (!Array.isArray(capability.properties) || !capability.properties.every(property => own(STYLE_PROPERTIES, property))))
        || (own(capability, 'functional') && typeof capability.functional !== 'boolean')
        || ['outerWidth', 'media', 'grid'].some(key => own(capability, key) && typeof capability[key] !== 'boolean')) {
        issue(errors, [...path, 'capability'], 'STYLE_CAPABILITY', 'Use a trusted property allowlist and boolean functional flag.'); return errors;
    }
    const allowed = capability.properties || Object.keys(STYLE_PROPERTIES);
    if (!shape(styles, TIERS, errors, path)) return errors;
    for (const tier of Object.keys(styles)) {
        if (!TIERS.includes(tier) || !shape(styles[tier], Object.keys(STYLE_PROPERTIES), errors, [...path, tier])) continue;
        for (const [property, value] of Object.entries(styles[tier])) {
            if (!allowed.includes(property)) issue(errors, [...path, tier, property], 'STYLE_CAPABILITY', 'This component does not permit this property.');
            else validateValue(property, value, errors, [...path, tier, property], capability.functional, capability.outerWidth, capability.media, capability.grid);
        }
    }
    return errors;
}
function validateResponsiveStyles(styles, capability = {}) {
    const scan = inspectJson(styles);
    if (!scan.valid) return scan;
    const errors = checkStyles(styles, capability);
    return { valid: errors.length === 0, errors };
}
function tierForWidth(width) {
    if (typeof width !== 'number' || !Number.isFinite(width) || width < 0) throw new RangeError('Width must be a finite nonnegative number.');
    return width >= 1024 ? 'desktop' : width >= 768 ? 'tablet' : 'base';
}
const resolveTier = (styles, tier) => Object.assign({}, ...TIERS.slice(0, TIERS.indexOf(tier) + 1).map(key => styles?.[key] || {}));
function resolveResponsiveStyles(layers, tier = 'base', capability = {}) {
    const scan = inspectJson(layers);
    const errors = [...scan.errors];
    if (scan.valid && shape(layers, ['defaults', 'page', 'preset', 'node', 'part'], errors, [])) {
        for (const [key, styles] of Object.entries(layers)) checkStyles(styles, key === 'page' ? { properties: PAGE_STYLES, functional: true, outerWidth: true } : capability, errors, [key]);
    }
    if (!TIERS.includes(tier)) issue(errors, ['tier'], 'STYLE_TIER', 'Use base, tablet or desktop.');
    if (errors.length) return { valid: false, errors };
    // Resolve each layer before specificity. Only text properties inherit from a
    // page/parent; box/layout/visibility never get copied to a child.
    const inherited = Object.fromEntries(Object.entries(resolveTier(layers.page, tier)).filter(([key]) => TEXT_STYLES.includes(key)));
    const value = { ...resolveTier(layers.defaults, tier), ...inherited, ...resolveTier(layers.preset, tier), ...resolveTier(layers.node, tier), ...resolveTier(layers.part, tier) };
    return { valid: true, errors: [], value: clone(value) };
}
function checkKnownContrast(styles, errors, path, colorTokens = DEFAULT_COLOR_TOKENS) {
    const color = value => value?.hex || (own(colorTokens, value?.token) ? colorTokens[value.token] : undefined);
    const foreground = color(styles.color), background = color(styles.background);
    if (foreground && background && contrastRatio(foreground, background) < 4.5) {
        issue(errors, path, 'CONTRAST', 'Functional foreground/background colors require at least 4.5:1 contrast.');
    }
}
module.exports = { ADAPTIVE_BREAKPOINTS, TIERS, APPROVED_FONTS, COLOR_TOKENS, DEFAULT_COLOR_TOKENS, STYLE_PROPERTIES,
    TEXT_STYLES, BOX_STYLES, CORE_STYLES, PAGE_STYLES, checkStyles, validateResponsiveStyles, tierForWidth, resolveResponsiveStyles, checkKnownContrast, resolveTier };
