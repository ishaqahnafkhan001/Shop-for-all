'use strict';
const { renderDocument, px } = require('./render-fixtures.cjs');
const palettes = {
    light: { color: '#111827', background: '#f8fafc', error: '#991b1b' },
    dark: { color: '#f8fafc', background: '#101826', error: '#ffb4ab' },
    custom: { color: '#fef3c7', background: '#12343b', error: '#ffb4ab' },
    edge: { color: '#000000', background: '#ffffff', error: '#000000' },
};
const paint = ({ color, background }) => ({ color: { hex: color }, background: { hex: background } });
function remediationDocument(mode = 'default', narrow = false) {
    const document = renderDocument();
    document.templates.tpl_home.nodes.section_story.styles.base.minHeight = px(120);
    document.templates.tpl_home.nodes.image.styles.base.objectFit = 'cover';
    document.templates.tpl_home.nodes.image.styles.base.height = px(180);
    document.templates.tpl_home.nodes.products.styles = { base: { gap: px(24), background: { hex: '#f1f5f9' } } };
    document.templates.tpl_home.nodes.products.partStyles = { card: { base: { fontSize: px(18), color: { hex: '#111827' }, background: { hex: '#ffffff' } } } };
    for (const kind of ['home', 'product', 'checkout']) {
        const template = document.templates[`tpl_${kind}`];
        template.styles ||= {};
        if (narrow) template.styles.desktop = { ...template.styles.desktop, maxWidth: px(520), paddingInlineStart: px(8), paddingInlineEnd: px(8) };
        if (kind === 'home') continue;
        const core = template.nodes[`core_tpl_${kind}`];
        core.styles = { base: { fontSize: px(18) } };
        if (mode !== 'default') {
            const palette = palettes[mode];
            core.styles.base = { ...core.styles.base, ...paint(palette) };
            core.partStyles.error.base.color = { hex: palette.error };
            if (mode === 'edge') delete core.partStyles.error.base.color;
            if (kind === 'checkout') {
                core.partStyles.summary = { base: { ...paint(mode === 'edge' ? { color: '#ffffff', background: '#000000' } : palette), fontSize: px(20) } };
                core.partStyles.label = { base: { fontSize: px(16) } };
                core.partStyles.input = { base: { ...paint({ color: '#17241d', background: '#fff8e7' }), borderColor: { hex: '#17241d' }, borderWidth: px(1) } };
            }
        }
    }
    return document;
}
module.exports = { remediationDocument, palettes };
