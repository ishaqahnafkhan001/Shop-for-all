'use strict';
// One-time source move, not a runtime engine. Preserves existing JSX verbatim and
// leaves hooks, API calls, authorization, filtering and calculations in place.
const { results, root, req, parser, traverse } = require('./inspect-view-seams.cjs');
const fs = require('node:fs'), path = require('node:path');
const generate = req('@babel/generator').default;
const join = file => path.join(root, file);
const parse = source => parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
function free(target) {
    const names = new Set();
    target.traverse({ ReferencedIdentifier(p) { const binding = p.scope.getBinding(p.node.name); if (binding && (binding.path.node.start < target.node.start || binding.path.node.end > target.node.end)) names.add(p.node.name); } });
    return [...names].sort();
}
function trimImports(source) {
    const ast = parse(source), edits = [];
    traverse(ast, { Program(p) { p.scope.crawl(); }, ImportDeclaration(p) {
        const kept = p.node.specifiers.filter(spec => p.scope.getBinding(spec.local.name)?.referenced);
        if (kept.length === p.node.specifiers.length) return;
        edits.push({ start: p.node.start, end: p.node.end, text: kept.length ? generate({ ...p.node, specifiers: kept }).code : '' });
    } });
    for (const edit of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
    return source;
}
const evidence = [];
for (const entry of results.filter(entry => entry.name !== 'AccountSecurityView')) {
    let source = fs.readFileSync(join(entry.file), 'utf8'); const ast = parse(source);
    let owner;
    traverse(ast, { FunctionDeclaration(p) { if (p.node.id.name === entry.functionName) owner = p; } });
    const target = owner.get('body.body').filter(p => p.isReturnStatement()).at(-1).get('argument');
    const moved = [], edits = [], constants = [];
    // All module-level helpers in tracking are presentation-only. Keep shared
    // controller uses through imports; no controller state or callback is moved.
    if (entry.name === 'TrackingView') for (const p of ast.program.body) if (p.type === 'VariableDeclaration') {
        constants.push(source.slice(p.start, p.end)); p.declarations.forEach(declaration => moved.push(declaration.id.name));
        edits.push({ start: p.start, end: p.end, text: '' });
    }
    if (entry.name === 'CategoryView') for (const p of ast.program.body) if (p.type === 'VariableDeclaration') {
        constants.push(source.slice(p.start, p.end)); p.declarations.forEach(declaration => moved.push(declaration.id.name));
        edits.push({ start: p.start, end: p.end, text: '' });
    }
    const staticNames = new Set(['Link', 'SafeProductImage', 'ProductCard', 'optimizeCloudinaryImage', 'POLICY_LABELS', 'POLICY_TYPES', 'getPolicyContent', ...moved]);
    const iconNames = new Set();
    for (const item of ast.program.body) if (item.type === 'ImportDeclaration' && item.source.value === 'lucide-react') for (const specifier of item.specifiers) { staticNames.add(specifier.local.name); iconNames.add(specifier.local.name); }
    const props = free(target).filter(name => !staticNames.has(name));
    let content = `'use client';\nimport { useRef } from 'react';\nimport { ${[...iconNames].join(', ')} } from 'lucide-react';\nimport { Link } from './Runtime.jsx';\nimport SafeProductImage from './SafeProductImage.jsx';\nimport { ProductCard } from '../reference/StorefrontProductCard.jsx';\nimport { optimizeCloudinaryImage } from '../reference/referenceCore.jsx';\nimport { useAtelierDialog } from '../atelier/useAtelierDialog.js';\nimport { POLICY_LABELS, POLICY_TYPES, getPolicyContent } from './policyData.js';\n${constants.join('\n')}\n`;
    if (entry.name === 'PolicyIndexView') content = content.replace("'use client';\n", '');
    if (entry.name === 'CategoryView') {
        let filter;
        owner.traverse({ VariableDeclarator(p) { if (p.node.id.name === 'filterContent') filter = p.get('init'); } });
        const filterProps = free(filter).filter(name => !staticNames.has(name));
        content += `export function CategoryFilters({ ${filterProps.join(', ')} }) { return (${source.slice(filter.node.start, filter.node.end)}); }\n`;
        edits.push({ start: filter.node.start, end: filter.node.end, text: `<CategoryFilters {...{ ${filterProps.join(', ')} }} />` });
        moved.push('CategoryFilters');
    }
    content += `\nexport function ${entry.name}({ ${props.join(', ')} }) { return (${source.slice(target.node.start, target.node.end)}); }\n`;
    if (moved.length) content += `\nexport { ${moved.filter(name => name !== 'CategoryFilters').join(', ')} };\n`;
    const shared = `packages/storefront-renderer/presentation/${entry.name}.jsx`;
    if (fs.existsSync(join(shared))) throw new Error('Do not overwrite an extracted view: ' + shared);
    fs.writeFileSync(join(shared), trimImports(content));
    const useRuntime = entry.name !== 'PolicyIndexView';
    const call = `<${entry.name} {...{ ${props.join(', ')} }} />`;
    edits.push({ start: target.node.start, end: target.node.end, text: useRuntime ? `<StorefrontPresentationRuntime>${call}</StorefrontPresentationRuntime>` : call });
    for (const edit of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
    source = `import { ${[entry.name, ...moved].join(', ')} } from '@scaleup/storefront-renderer/presentation/${entry.name}';\n${useRuntime ? "import StorefrontPresentationRuntime from '@/components/storefront/StorefrontPresentationRuntime';\n" : ''}` + source;
    // Preserve a file's original client boundary before the new imports.
    source = source.replace(/\n["']use client["'];?\s*/, '\n'); if (useRuntime) source = '"use client";\n' + source;
    fs.writeFileSync(join(entry.file), trimImports(source));
    evidence.push({ ...entry, props, shared, jsxMovedWithoutRewriting: true });
}
fs.writeFileSync(path.join(__dirname, 'view-seams.json'), JSON.stringify(evidence, null, 2));
