'use strict';

const a = require('../../../../../packages/storefront-theme/adaptive.cjs');
const text = value => ({ type: 'content.text', content: { text: value } });
function fixture(kinds = a.PAGE_KINDS) {
    const document = a.createPageTemplateDocument();
    for (const kind of kinds) {
        const templateId = `tpl_${kind}`;
        document.templates[templateId] = a.createPageTemplate(templateId, kind);
        document[['header', 'footer'].includes(kind) ? 'globals' : 'defaultTemplates'][kind] = templateId;
    }
    if (document.templates.tpl_home) {
        Object.assign(document.templates.tpl_home.nodes, {
            section_story: { type: 'content.section', slots: { body: ['story_text', 'story_link'] } },
            story_text: text('Synthetic merchant story'),
            story_link: { type: 'content.link', content: { label: 'Shipping policy', destination: { kind: 'storePath', path: '/policies/shipping' } } },
        });
        document.templates.tpl_home.rootOrder.push('section_story');
    }
    return document;
}
function sizedFixture(targetNodes) {
    const document = fixture();
    let count = Object.values(document.templates).reduce((sum, template) => sum + Object.keys(template.nodes).length, 0);
    let next = 1;
    for (const kind of ['home', 'product', 'category', 'collection']) {
        const template = document.templates[`tpl_${kind}`];
        while (count < targetNodes && Object.keys(template.nodes).length < 50) {
            const nodeId = `text_${next++}`;
            template.nodes[nodeId] = { ...text('Synthetic content with useful merchant information.'),
                styles: { base: { paddingBlockStart: { unit: 'px', value: 0 }, fontSize: { unit: 'px', value: 16 } }, desktop: { fontSize: { unit: 'px', value: 20 } } } };
            template.rootOrder.push(nodeId); count++;
        }
    }
    return document;
}
module.exports = { fixture, sizedFixture, text };
