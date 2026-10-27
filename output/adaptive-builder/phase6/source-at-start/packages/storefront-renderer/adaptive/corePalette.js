import { contrastRatio, normalizeHexColor } from '@scaleup/storefront-theme';
import { BLOCK_REGISTRY, resolveResponsiveStyles } from '@scaleup/storefront-theme/adaptive';

const paintKeys = ['color', 'background', 'borderColor'];
const hasPaint = styles => Object.values(styles || {}).some(tier => ['color', 'background'].some(key => Object.hasOwn(tier, key)));
const hasControlBorder = styles => Object.values(styles || {}).some(tier => ['borderColor', 'borderWidth'].some(key => Object.hasOwn(tier, key)));
const solid = (value, tokens) => normalizeHexColor(value?.hex || tokens[value?.token]);
const parents = Object.fromEntries(Object.entries(BLOCK_REGISTRY).filter(([, block]) => block.protected).map(([type, block]) => [type.split('.')[0], block.partParents]));

// Verify the exact code-owned surface contexts used by the presentation, not
// just a generic node foreground/background pair. No merchant parent graph.
export function resolveCorePalette({ node, preset, template, styles, pageStyles, tokens, kind }) {
    const root = hasPaint(node.styles) || hasPaint(preset.styles) || hasPaint(template.styles)
        || hasPaint(node.partStyles?.surface) || hasPaint(preset.partStyles?.surface);
    const targets = Object.keys(parents[kind]).filter(part => hasPaint(node.partStyles?.[part]) || hasPaint(preset.partStyles?.[part])
        || (['input', 'primaryButton'].includes(part) && (hasControlBorder(node.partStyles?.[part]) || hasControlBorder(preset.partStyles?.[part]))));
    if (!root && !targets.length) return { valid: true, value: null };
    const value = { root, targets, tiers: {} }, errors = [];
    for (const tier of ['base', 'tablet', 'desktop']) {
        const overrides = {}, borderWidths = {};
        for (const part of Object.keys(parents[kind])) {
            const resolved = resolveResponsiveStyles({ preset: preset.partStyles?.[part] || {}, part: node.partStyles?.[part] || {} }, tier);
            overrides[part] = Object.fromEntries(Object.entries(resolved.value).filter(([key]) => paintKeys.includes(key))
                .map(([key, color]) => [key, solid(color, tokens)]));
            borderWidths[part] = resolved.value.borderWidth?.value ?? 1;
        }
        const surface = { color: solid(styles[tier].color, tokens) || tokens.foreground,
            background: solid(styles[tier].background || pageStyles[tier].background, tokens) || tokens.background,
            ...overrides.surface };
        const primary = { color: tokens.primaryButtonText, background: tokens.primaryButtonBg, ...overrides.primaryButton };
        overrides.primaryButton = primary;
        if (Object.hasOwn(parents[kind], 'secondaryButton')) overrides.secondaryButton = { color: tokens.secondaryButtonText, background: tokens.secondaryButtonBg, ...overrides.secondaryButton };
        const summary = { ...surface, ...overrides.summary };
        const contexts = { surface, summary };
        for (const part of ['information', 'listing', 'totals']) if (Object.hasOwn(parents[kind], part)) contexts[part] = { ...surface, ...overrides[part] };
        for (const [part, placements] of Object.entries(parents[kind])) {
            for (const parent of placements.length ? placements : ['surface']) {
                const palette = part === 'surface' ? surface : { ...contexts[parent], ...overrides[part] };
                if (contrastRatio(palette.color, palette.background) < 4.5) errors.push({ code: 'CORE_CONTRAST', path: ['partStyles', part, tier],
                    message: `Required ${part} text needs 4.5:1 contrast in its ${parent} surface.` });
                const border = overrides[part].borderColor || palette.color;
                if (['input', 'primaryButton'].includes(part) && (borderWidths[part] === 0 || contrastRatio(border, contexts[parent].background) < 3)
                    && contrastRatio(palette.background, contexts[parent].background) < 3) errors.push({ code: 'CONTROL_CONTRAST', path: ['partStyles', part, tier, 'borderColor'],
                    message: 'A required control needs a distinguishable border or fill (3:1).'});
            }
        }
        value.tiers[tier] = { surface, overrides };
    }
    return errors.length ? { valid: false, errors } : { valid: true, value };
}

// Only fixed selectors, semantic markers and validated hex values. All paint
// stays inside an atomic core; unrelated legacy/optional nodes are unaffected.
export function compileCorePalette(palette, selector, tier) {
    if (!palette) return '';
    const { surface, overrides } = palette.tiers[tier];
    let css = `${selector}{--ab-ink:${surface.color};--ab-surface:${surface.background}}`;
    for (const [part, values] of Object.entries(overrides)) {
        const variables = Object.entries(values).filter(([key]) => key !== 'borderColor')
            .map(([key, color]) => `${{ color: '--ab-ink', background: '--ab-surface' }[key]}:${color}`).join(';');
        if (variables) css += `${selector} [data-ab-part="${part}"]{${variables}}`;
    }
    const scopes = palette.root ? [selector] : palette.targets.map(part => `${selector} [data-ab-part="${part}"]`);
    for (const scope of scopes) {
        css += `${scope}{background:var(--ab-surface)!important;color:var(--ab-ink)!important}`;
        css += `${scope} :where(*){color:var(--ab-ink)!important;border-color:var(--ab-ink)!important}`;
        css += `${scope} [data-ab-surface],${scope} :where(input:not([type="checkbox"]),textarea,select,button){background:var(--ab-surface)!important}`;
        css += `${scope} :where(input:not([type="checkbox"]),textarea,select,button){border:1px solid var(--ab-ink)}`;
        css += `${scope} input[type="checkbox"]{accent-color:var(--ab-ink)}`;
        css += `${scope} :where(button[aria-pressed="true"],button[aria-selected="true"]){box-shadow:inset 0 -3px currentColor}`;
    }
    return css;
}
