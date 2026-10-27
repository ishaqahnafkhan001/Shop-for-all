'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../..');
const req = createRequire(path.join(root, 'ecommerce-admin/package.json'));
const parser = req('@babel/parser'), traverse = req('@babel/traverse').default;
const files = ['reference/StorefrontHeader.jsx', 'reference/StorefrontFooter.jsx', 'atelier/AtelierHeader.jsx', 'atelier/AtelierFooter.jsx'];
const nameOf = p => p.node.id?.name || (p.parentPath.isVariableDeclarator() ? p.parentPath.node.id.name : '');
for (const relative of files) {
    const file = path.join(root, 'packages/storefront-renderer', relative), source = fs.readFileSync(file, 'utf8');
    const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] }), edits = [], components = new Set();
    traverse(ast, { Function(p) {
        const name = nameOf(p), param = p.node.params[0];
        if (!/^[A-Z]/.test(name) || param?.type !== 'ObjectPattern') return;
        components.add(name);
        if (!param.properties.some(prop => prop.key?.name === 'adaptiveParts')) edits.push([param.start + 1, ' adaptiveParts = false,']);
    } });
    traverse(ast, { JSXOpeningElement(p) {
        const owner = p.findParent(item => item.isFunction() && components.has(nameOf(item)));
        if (!owner) return;
        const name = p.node.name.name, attrs = p.node.attributes, existing = key => attrs.some(a => a.name?.name === key);
        if (components.has(name) && !existing('adaptiveParts')) edits.push([p.node.name.end, ' adaptiveParts={adaptiveParts}']);
        const classAttr = attrs.find(a => a.name?.name === 'className');
        const text = classAttr ? source.slice(classAttr.start, classAttr.end) : '';
        if (/^[a-z]/.test(name) && !existing('data-ab-surface') && (/bg-|atelier-header|atelier-footer/.test(text) || ['header', 'footer'].includes(name)
            || attrs.some(a => a.name?.name === 'style' && /background/.test(source.slice(a.start, a.end))))) edits.push([p.node.name.end, " data-ab-surface={adaptiveParts ? '' : undefined}"]);
        let part = null;
        const ownerName = nameOf(owner);
        if (ownerName === 'BrandMark' && p.node.start === owner.node.body.openingElement?.start) part = "'identity'";
        if (name === 'nav') part = "'navigation'";
        if (/atelier-wordmark|atelier-footer-identity/.test(text)) part = "'identity'";
        if (/atelier-utilities/.test(text)) part = "'utilities'";
        const declaration = p.findParent(item => item.isVariableDeclarator());
        if (['utilitySlot', 'searchSlot', 'compactSearchSlot'].includes(declaration?.node.id?.name) && p.node.start === declaration.node.init?.openingElement?.start) part = "'utilities'";
        if (owner.node.body.type === 'JSXElement' && p.node.start === owner.node.body.openingElement.start) {
            if (ownerName === 'FooterColumn') part = "'navigation'";
            if (ownerName === 'FooterSupportColumn') part = "'policies'";
            if (ownerName === 'FooterAccordion') part = "(title === 'Support' ? 'policies' : 'navigation')";
        }
        if (ownerName === 'AtelierFooter' && name === 'div' && p.parentPath.parentPath.isArrowFunctionExpression()) part = "(title === 'Support' ? 'policies' : 'navigation')";
        if (part && !existing('data-ab-part')) edits.push([p.node.name.end, ` data-ab-part={adaptiveParts ? ${part} : undefined}`]);
    } });
    let result = source;
    for (const [offset, text] of edits.sort((a, b) => b[0] - a[0])) result = result.slice(0, offset) + text + result.slice(offset);
    fs.writeFileSync(file, result);
    console.log(relative, edits.length);
}
