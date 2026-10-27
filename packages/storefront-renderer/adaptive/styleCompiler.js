import { isAdaptivePagePlan } from './pagePlan.js';
import { normalizeHexColor } from '@scaleup/storefront-theme';
import { compileCorePalette } from './corePalette.js';

const cssNames = Object.freeze({ color: 'color', background: 'background', fontFamily: 'font-family', fontSize: 'font-size',
    fontWeight: 'font-weight', lineHeight: 'line-height', letterSpacing: 'letter-spacing', textAlign: 'text-align',
    width: 'width', maxWidth: 'max-width', height: 'height', minHeight: 'min-height', aspectRatio: 'aspect-ratio',
    paddingBlockStart: 'padding-block-start', paddingBlockEnd: 'padding-block-end', paddingInlineStart: 'padding-inline-start',
    paddingInlineEnd: 'padding-inline-end', marginBlockStart: 'margin-block-start', marginBlockEnd: 'margin-block-end',
    marginInlineStart: 'margin-inline-start', marginInlineEnd: 'margin-inline-end', borderColor: 'border-color',
    borderWidth: 'border-width', borderRadius: 'border-radius', gap: 'gap', alignItems: 'align-items', justifyContent: 'justify-content' });
const fonts = Object.freeze({ Inter: 'Inter,sans-serif', Arial: 'Arial,sans-serif', Georgia: 'Georgia,serif',
    Roboto: 'Roboto,sans-serif', 'DM Sans': '"DM Sans",sans-serif' });
const selectorForPart = (root, kind, part, type) => {
    const marker = `${root} [data-ab-part="${part}"]`;
    if (part === 'surface') return marker;
    // Fixed selectors provide the seam for existing checkout presentation. No
    // merchant selector or form restructuring is needed.
    if (kind === 'checkout') {
        if (['heading', 'label', 'input', 'primaryButton', 'summary'].includes(part)) return marker;
    }
    if (type === 'catalog.products') {
        if (part === 'title') return `${root} h2`;
        if (part === 'card') return `${root} article`;
    }
    return marker;
};
const textProperties = ['color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign'];
const textTargets = ':where(p,h1,h2,h3,h4,h5,h6,span,label,a,button,input,textarea,select,summary,dt,dd,small,strong)';
function declarations(styles, node, tier, tokens) {
    const result = [];
    for (const [property, value] of Object.entries(styles)) {
        if (property === 'layoutMode') { result.push(`--ab-core-columns:${value === 'stack' ? 1 : 2}`, `--ab-summary-column:${value === 'stack' ? 'auto' : 2}`, `--ab-summary-row:${value === 'stack' ? 'auto' : '1/3'}`, `--ab-marketing-row:${value === 'stack' ? 'auto' : 2}`); continue; }
        if (property === 'visible') { result.push(`display:${value ? (node.type === 'content.link' ? 'inline-flex' : 'block') : 'none'}`); continue; }
        if (property === 'columns' || property === 'stackOnMobile' || property === 'objectFit') continue;
        if (node.palette && ['color', 'background'].includes(property)) continue;
        const name = cssNames[property];
        if (!name) throw new TypeError('Uncompiled adaptive style property.');
        let compiled = value;
        if (['color', 'background', 'borderColor'].includes(property)) compiled = normalizeHexColor(value.hex || tokens[value.token]);
        else if (property === 'fontFamily') compiled = fonts[value];
        else if (property === 'aspectRatio') compiled = `${value.width}/${value.height}`;
        else if (typeof value === 'object') compiled = ['fontSize', 'letterSpacing'].includes(property)
            ? `${value.value / 16}rem` : `${value.value}${value.unit === 'percent' ? '%' : 'px'}`;
        if (property === 'width' || property === 'maxWidth') compiled = `min(100%,${compiled})`;
        result.push(`${name}:${compiled}`);
        if (property === 'borderWidth') result.push('border-style:solid');
    }
    // Layout display is compiler-owned. Visibility must not accidentally turn a
    // columns/stack container into a block when it becomes visible again.
    if (['content.section', 'layout.stack', 'layout.columns'].includes(node.type) && styles.visible !== false) {
        result.push(`display:${node.type === 'layout.columns' ? 'grid' : 'flex'}`);
        if (node.type !== 'layout.columns') result.push('flex-direction:column');
    }
    if (node.type === 'layout.columns') result.push(`grid-template-columns:repeat(${tier === 'base' && styles.stackOnMobile !== false ? 1 : (styles.columns || node.slots.columns.length)},minmax(0,1fr))`);
    return result.join(';');
}
function typography(styles, selector, tier, tokens) {
    const values = Object.fromEntries(Object.entries(styles).filter(([key]) => textProperties.includes(key) && key !== 'color'));
    let css = '';
    for (const [property, value] of Object.entries(values)) {
        const declaration = declarations({ [property]: value }, {}, tier, tokens);
        const compiled = declaration.slice(declaration.indexOf(':') + 1);
        const name = cssNames[property], variable = `--ab-type-${name}`;
        css += `${selector}{${variable}:${compiled};${name}:var(${variable})!important}`;
        css += `${selector} ${textTargets}{${name}:var(${variable})!important}`;
    }
    // Legacy text-size utilities can carry a fixed line height. A larger
    // approved font must not retain that smaller line box and clip field text.
    if (styles.fontSize) css += `${selector},${selector} ${textTargets}{line-height:var(--ab-type-line-height,1.5)!important}`;
    return css;
}

// Pure, one stylesheet per page. Scope is supplied by useId, never by JSON.
export function compileAdaptiveStyles(plan, scope) {
    if (!isAdaptivePagePlan(plan) || !/^ab_[a-f0-9]+$/.test(scope)) throw new TypeError('Use a resolved plan and compiler-owned scope.');
    const root = `.sf-adaptive[data-ab-scope="${scope}"]`;
    let css = `${root}{min-width:0;max-width:100%;overflow-wrap:anywhere;color:${plan.colorTokens.foreground};background-color:${plan.colorTokens.background}}`;
    css += `${root} :where(*, *::before, *::after){box-sizing:border-box;min-width:0}`;
    css += `${root} [data-ab-node]{max-width:100%}${root} img{max-width:100%}`;
    // Let the validated page/core surface show through the legacy view shell.
    // Card, field, state and dialog interiors keep their trusted presentation.
    css += `${root} [data-ab-core] .sf-page{background:transparent}`;
    css += `${root} [data-ab-core="header"] header,${root} [data-ab-core="footer"] footer{position:static;overflow:visible}`;
    // Global compositions respond to their edited container, even inside a
    // wide preview. Merchant configuration cannot hide the navigation core.
    css += `${root} [data-ab-layout="headerDesktop"],${root} [data-ab-layout="footerDesktop"]{display:none!important}`;
    css += `${root} [data-ab-layout="headerMobile"]{display:flex!important;height:auto;min-height:64px;flex-wrap:wrap}`;
    css += `${root} [data-ab-layout="headerMobileSearch"],${root} [data-ab-layout="footerMobile"]{display:block!important}`;
    css += `${root} [data-ab-layout="footerColumns"]{grid-template-columns:minmax(0,1fr)!important}`;
    css += `${root} .atelier-header-row{display:flex!important;flex-wrap:wrap}${root} .atelier-desktop-navigation{display:none!important}${root} .atelier-menu-toggle{display:inline-flex!important}${root} .atelier-utilities{flex-wrap:wrap}${root} .atelier-utilities span{display:none!important}${root} .atelier-footer-grid{grid-template-columns:minmax(0,1fr)!important}`;
    css += `@container(min-width:1024px){${root} [data-ab-layout="headerDesktop"]{display:block!important;height:auto;min-height:76px}${root} [data-ab-layout="footerDesktop"]{display:contents!important}${root} [data-ab-layout="headerMobile"],${root} [data-ab-layout="headerMobileSearch"],${root} [data-ab-layout="footerMobile"]{display:none!important}${root} [data-ab-layout="footerColumns"]{grid-template-columns:minmax(0,1.25fr) minmax(0,.7fr) minmax(0,1fr)!important}${root} .atelier-desktop-navigation{display:block!important}${root} .atelier-header-row{display:grid!important}${root} .atelier-menu-toggle{display:none!important}${root} .atelier-footer-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}}`;
    css += `${root} [data-ab-part="galleryFrame"]{width:100%;max-width:100%}`;
    css += `${root} [data-ab-core]{container-type:inline-size}${root} :is([data-ab-layout="product"],[data-ab-layout="checkout"],[data-ab-layout="cart"],[data-ab-layout="account"]){grid-template-columns:minmax(0,1fr)!important}`;
    css += `@container(min-width:1000px){${root} :is([data-ab-layout="product"],[data-ab-layout="checkout"],[data-ab-layout="cart"],[data-ab-layout="account"]){grid-template-columns:repeat(var(--ab-core-columns,2),minmax(0,1fr))!important}}`;
    css += `@container(min-width:1000px){${root} [data-ab-layout="checkout"]>[data-ab-region="details"]{grid-column:1;grid-row:1}${root} [data-ab-layout="checkout"]>[data-ab-region="summary"]{grid-column:var(--ab-summary-column,2);grid-row:var(--ab-summary-row,1/3)}${root} [data-ab-layout="checkout"]>[data-ab-region="marketing"]{grid-column:1;grid-row:var(--ab-marketing-row,2)}}`;
    css += `${root} [data-ab-type="content.image"] img{display:block;width:100%;height:100%;object-fit:contain;border-radius:inherit}`;
    css += `${root} :is(a,button,input:not([type="checkbox"]),select,summary){min-height:44px}${root} a{align-items:center}`;
    css += `${root} button{min-width:44px}${root} [role="dialog"] form{max-height:100dvh;overflow-y:auto;overscroll-behavior:contain}`;
    css += `${root} :is(a,button,input,textarea,select,summary):focus-visible{outline:2px solid #fff!important;outline-offset:1px;box-shadow:0 0 0 4px #000!important}`;
    // Existing rose feedback backgrounds need a darker default error ink.
    // An explicit validated semantic palette below takes precedence.
    css += `${root} [data-ab-core="checkout"] [data-ab-part="error"]{color:#b91c1c}`;
    css += `${root} [data-ab-core] [data-ab-muted]{color:#475569}`;
    css += `@media(prefers-reduced-motion:reduce){${root} *,${root} *::before,${root} *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}`;
    for (const tier of ['base', 'tablet', 'desktop']) {
        let rules = `${root}{${declarations(plan.pageStyles[tier], {}, tier, plan.colorTokens)}}`;
        for (const node of Object.values(plan.nodes)) {
            const selector = `${root} [data-ab-style="${node.styleId}"]`;
            const core = node.type.endsWith('.core');
            const nodeBox = core ? Object.fromEntries(Object.entries(node.styles[tier]).filter(([key]) => !textProperties.includes(key))) : node.styles[tier];
            rules += `${selector}{${declarations(nodeBox, node, tier, plan.colorTokens)}}`;
            if (node.palette) rules += compileCorePalette(node.palette, selector, tier);
            if (core) rules += typography(node.styles[tier], selector, tier, plan.colorTokens);
            if (node.type.startsWith('catalog.') && node.styles[tier].background) {
                rules += `${selector}>section{${declarations({ background: node.styles[tier].background }, node, tier, plan.colorTokens)}!important}`;
            }
            if (node.type.startsWith('catalog.') && node.styles[tier].gap) rules += `${selector} [data-ab-layout="catalog"]{gap:${node.styles[tier].gap.value}px!important}`;
            if (node.type === 'content.image' && node.styles[tier].objectFit) rules += `${selector} img{object-fit:${node.styles[tier].objectFit}}`;
            for (const [part, values] of Object.entries(node.parts)) {
                const target = selectorForPart(selector, plan.pageKind, part, node.type);
                // Existing trusted views use some inline theme declarations.
                // Only validated part properties may override those, scoped to
                // this node; no selector/property/priority comes from JSON.
                const box = core ? Object.fromEntries(Object.entries(values[tier]).filter(([key]) => !textProperties.includes(key))) : values[tier];
                const partCss = declarations(box, node, tier, plan.colorTokens)
                    .split(';').filter(Boolean).map(declaration => `${declaration}!important`).join(';');
                rules += `${target}{${partCss}}`;
                if (part === 'listing' && values[tier].columns) rules += `${target}{display:grid!important;grid-template-columns:repeat(${values[tier].columns},minmax(0,1fr))!important}`;
                if (['galleryFrame', 'cover', 'image'].includes(part) && values[tier].objectFit) rules += `${target} img{object-fit:${values[tier].objectFit}!important}`;
                if (['galleryFrame', 'cover', 'image'].includes(part) && (values[tier].height || values[tier].aspectRatio)) rules += `${target}{min-height:64px!important;max-height:none!important}`;
                if (core) {
                    for (const scope of target.split(',')) rules += typography(node.partOverrides[part][tier], scope, tier, plan.colorTokens);
                    continue;
                }
                const partText = Object.fromEntries(Object.entries(values[tier]).filter(([key]) => textProperties.includes(key) && key !== 'color'));
                const partTextCss = declarations(partText, node, tier, plan.colorTokens).split(';').filter(Boolean).map(rule => `${rule}!important`).join(';');
                // Every target in a selector list needs its own descendant suffix.
                if (partTextCss) rules += `${target.split(',').map(value => `${value} ${textTargets}`).join(',')}{${partTextCss}}`;
                if (values[tier].color) {
                    const color = declarations({ color: values[tier].color }, node, tier, plan.colorTokens);
                    rules += `${target.split(',').map(value => `${value} ${textTargets}:not(button,button *,input,textarea,select)`).join(',')}{${color}!important}`;
                }
            }
        }
        css += tier === 'base' ? rules : `@media(min-width:${tier === 'tablet' ? 768 : 1024}px){${rules}}`;
    }
    return css;
}
