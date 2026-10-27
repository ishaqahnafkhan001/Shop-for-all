'use strict';
// One-time additive semantic markers. Default rendering attributes stay absent.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const req = require('node:module').createRequire(path.join(root, 'ecommerce-admin/package.json'));
const parser = req('@babel/parser'), traverse = req('@babel/traverse').default;
const files = {
    CategoryView: 'category', CollectionView: 'collection', TrackingView: 'track', CartView: 'cart',
    AccountAuthView: 'account', AccountDashboardView: 'account', AccountTabsViews: 'account', AccountSecurityView: 'account',
    PolicyIndexView: 'policiesIndex', PolicyView: 'policy',
};
const registry = require(path.join(root, 'packages/storefront-theme/adaptive.cjs')).BLOCK_REGISTRY;
for (const [name, kind] of Object.entries(files)) {
    const file = path.join(root, `packages/storefront-renderer/presentation/${name}.jsx`);
    let source = fs.readFileSync(file, 'utf8');
    const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] }), edits = [];
    const parts = registry[`${kind}.core`].parts;
    traverse(ast, {
        Function(p) {
            const arg = p.node.params[0];
            if (arg?.type !== 'ObjectPattern') return;
            let jsx = false; p.traverse({ JSXElement() { jsx = true; } });
            if (jsx && !arg.properties.some(prop => prop.key?.name === 'adaptiveParts')) edits.push({ start: arg.start + 1, end: arg.start + 1, text: ' adaptiveParts = false,' });
        },
        JSXOpeningElement(p) {
            const node = p.node, tag = node.name.name;
            const attrs = Object.fromEntries(node.attributes.filter(attr => attr.type === 'JSXAttribute').map(attr => [attr.name.name, attr]));
            const classText = attrs.className ? source.slice(attrs.className.start, attrs.className.end) : '';
            let part;
            if (/^[a-z]/.test(tag)) {
                if (tag === 'h1') part = ['category', 'collection'].includes(kind) ? 'title' : 'heading';
                if (tag === 'label') part = 'label';
                if (['input', 'textarea', 'select'].includes(tag)) part = tag === 'select' && ['category', 'collection'].includes(kind) ? 'sort' : 'input';
                if (tag === 'button') part = 'primaryButton';
                if (tag === 'article' && kind === 'policy') part = 'body';
                if (classText.includes('gridClass')) part = 'listing';
                const old = attrs['data-atelier-part'] && source.slice(attrs['data-atelier-part'].start, attrs['data-atelier-part'].end);
                if (old?.includes('catalog-cover')) part = 'cover';
                if (old?.includes('catalog-filter') || old?.includes('filter-sheet')) part = 'filters';
                if (old?.includes('cart-item')) part = 'items';
                if (old?.includes('cart-summary')) part = 'totals';
                if (old?.includes('tracking-results')) part = 'summary';
                if (classText.includes('border-dashed') && ['category', 'collection'].includes(kind)) part = 'empty';
                if (attrs.role?.value?.value === 'alert') part = 'error';
                if (part && parts[part] && !attrs['data-ab-part']) edits.push({ start: node.name.end, end: node.name.end, text: ` data-ab-part={adaptiveParts ? '${part}' : undefined}` });
                if (/bg-(white|slate|gray|rose|red|emerald|indigo|gradient)/.test(classText) && !attrs['data-ab-surface']) edits.push({ start: node.name.end, end: node.name.end, text: ' data-ab-surface={adaptiveParts ? \'\' : undefined}' });
                if (old?.includes('cart-layout') || (kind === 'account' && classText.includes('md:grid-cols-[250px'))) edits.push({ start: node.name.end, end: node.name.end, text: ` data-ab-layout={adaptiveParts ? '${kind}' : undefined}` });
            } else if (['ProductCard', 'OrderHistoryTab', 'ProfileTab', 'SecurityComponent', 'ModalShell', 'StatusPill'].includes(tag) && !attrs.adaptiveParts) edits.push({ start: node.name.end, end: node.name.end, text: ' adaptiveParts={adaptiveParts}' });
            // Reuse existing explicit associations for adaptive forms too.
            for (const attr of node.attributes) if (['aria-label', 'aria-pressed', 'id', 'htmlFor'].includes(attr.name?.name) && attr.value?.type === 'JSXExpressionContainer') {
                const exp = attr.value.expression;
                if (exp.type === 'ConditionalExpression' && exp.test.type === 'Identifier' && exp.test.name === 'atelier') edits.push({ start: exp.test.start, end: exp.test.end, text: '(atelier || adaptiveParts)' });
            }
        },
    });
    for (const edit of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
    fs.writeFileSync(file, source);
}
