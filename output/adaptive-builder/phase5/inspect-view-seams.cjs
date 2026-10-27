'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../..');
const req = createRequire(path.join(root, 'ecommerce-admin/package.json'));
const parser = req('@babel/parser'), traverse = req('@babel/traverse').default;
const entries = [
    ['CategoryView', 'ecommerce-storefront/src/app/[subdomain]/categories/[slug]/CategoryPageClient.jsx', 'CategoryPageClient'],
    ['CollectionView', 'ecommerce-storefront/src/app/[subdomain]/collections/[slug]/CollectionPageClient.jsx', 'CollectionPageClient'],
    ['TrackingView', 'ecommerce-storefront/src/app/[subdomain]/track/page.jsx', 'TrackOrderPage'],
    ['PolicyIndexView', 'ecommerce-storefront/src/app/[subdomain]/policies/page.jsx', null],
    ['AccountSecurityView', 'ecommerce-storefront/src/components/account/CustomerTabs.jsx', 'SecurityTab'],
];
function inspect([name, file, functionName]) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
    let owner;
    traverse(ast, { FunctionDeclaration(p) { if (functionName ? p.node.id.name === functionName : p.parentPath.isExportDefaultDeclaration()) owner = p; } });
    if (!owner) throw new Error('View owner missing: ' + name);
    const returns = owner.get('body.body').filter(p => p.isReturnStatement());
    const target = returns.at(-1).get('argument');
    const names = new Set();
    target.traverse({ ReferencedIdentifier(p) { const binding = p.scope.getBinding(p.node.name); if (binding && (binding.path.node.start < target.node.start || binding.path.node.end > target.node.end)) names.add(p.node.name); } });
    return { name, file, functionName: owner.node.id.name, start: target.node.start, end: target.node.end, names: [...names].sort(), returnLines: source.slice(target.node.start, target.node.end).split('\n').length };
}
const results = entries.map(inspect);
if (require.main === module) console.log(JSON.stringify(results, null, 2));
module.exports = { results, root, req, parser, traverse };
