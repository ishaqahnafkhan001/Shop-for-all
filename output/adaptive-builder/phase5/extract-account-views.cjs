'use strict';
const fs = require('node:fs'), path = require('node:path');
const { root, req, parser, traverse } = require('./inspect-view-seams.cjs');
const generate = req('@babel/generator').default;
const join = file => path.join(root, file);
const dir = 'ecommerce-storefront/src/components/account/';
const targetDir = 'packages/storefront-renderer/presentation/';
function write(file, text) { if (fs.existsSync(join(file))) throw new Error('Preserve existing extracted file: ' + file); fs.writeFileSync(join(file), text); }
let auth = fs.readFileSync(join(dir + 'AuthView.jsx'), 'utf8').replace("from '@scaleup/storefront-renderer'", "from '../atelier/AtelierAccountAccent.jsx'");
write(targetDir + 'AccountAuthView.jsx', auth);
fs.writeFileSync(join(dir + 'AuthView.jsx'), "export { default } from '@scaleup/storefront-renderer/presentation/AccountAuthView';\n");
let tabs = fs.readFileSync(join(dir + 'CustomerTabs.jsx'), 'utf8');
const ast = parser.parse(tabs, { sourceType: 'module', plugins: ['jsx'] });
const pure = [], edits = [];
for (const item of ast.program.body) if (item.type === 'ExportNamedDeclaration' && ['OrderHistoryTab', 'ProfileTab'].includes(item.declaration?.id?.name)) {
    pure.push(tabs.slice(item.start, item.end)); edits.push({ start: item.start, end: item.end, text: '' });
}
write(targetDir + 'AccountTabsViews.jsx', `"use client";\nimport { useState } from 'react';\nimport { Link } from './Runtime.jsx';\nimport { ChevronDown, ChevronUp, Package, ExternalLink } from 'lucide-react';\nimport SafeProductImage from './SafeProductImage.jsx';\n${pure.join('\n')}\n`);
let security;
traverse(ast, { FunctionDeclaration(p) { if (p.node.id.name === 'SecurityTab') security = p; } });
const returned = security.get('body.body').filter(p => p.isReturnStatement()).at(-1).get('argument');
const dependencies = new Set();
returned.traverse({ ReferencedIdentifier(p) { const binding = p.scope.getBinding(p.node.name); if (binding && (binding.path.node.start < returned.node.start || binding.path.node.end > returned.node.end)) dependencies.add(p.node.name); } });
const props = [...dependencies].filter(name => name !== 'Lock').sort();
write(targetDir + 'AccountSecurityView.jsx', `"use client";\nimport { Lock } from 'lucide-react';\nexport function AccountSecurityView({ ${props.join(', ')} }) { return (${tabs.slice(returned.node.start, returned.node.end)}); }\n`);
edits.push({ start: returned.node.start, end: returned.node.end, text: `<AccountSecurityView {...{ ${props.join(', ')} }} />` });
for (const edit of edits.sort((a, b) => b.start - a.start)) tabs = tabs.slice(0, edit.start) + edit.text + tabs.slice(edit.end);
tabs = tabs.replace(/import Link from 'next\/link';\s*/, '').replace(/import SafeProductImage[^\n]+\n/, '').replace(/import \{ ChevronDown, ChevronUp, Package, ExternalLink, Lock \} from 'lucide-react';\s*/, '');
tabs = tabs.replace('"use client";', '"use client";\nimport { AccountSecurityView } from \'@scaleup/storefront-renderer/presentation/AccountSecurityView\';\nexport { OrderHistoryTab, ProfileTab } from \'@scaleup/storefront-renderer/presentation/AccountTabsViews\';');
fs.writeFileSync(join(dir + 'CustomerTabs.jsx'), tabs);
let dashboard = fs.readFileSync(join(dir + 'CustomerDashboard.jsx'), 'utf8');
dashboard = dashboard.replace("import { OrderHistoryTab, ProfileTab, SecurityTab } from './CustomerTabs'; // Adjust import path", "import { OrderHistoryTab, ProfileTab } from './AccountTabsViews.jsx';");
dashboard = dashboard.replace('handlePasswordReset, presentationVariant })', "handlePasswordReset, presentationVariant, initialTab = 'orders', SecurityComponent })");
dashboard = dashboard.replace("useState('orders')", 'useState(initialTab)').replace('<SecurityTab ', '<SecurityComponent ');
write(targetDir + 'AccountDashboardView.jsx', dashboard);
fs.writeFileSync(join(dir + 'CustomerDashboard.jsx'), `"use client";\nimport SharedDashboard from '@scaleup/storefront-renderer/presentation/AccountDashboardView';\nimport { SecurityTab } from './CustomerTabs';\nexport default function CustomerDashboard(props) { return <SharedDashboard {...props} SecurityComponent={SecurityTab} />; }\n`);
// Client wrappers retain the original server/runtime boundary and all APIs stay
// in CustomerTabs/PasswordResetFlow/AccountPage, outside the shared view package.
const manifest = { views: ['AccountAuthView', 'AccountTabsViews', 'AccountSecurityView', 'AccountDashboardView'], securityViewProps: props };
fs.writeFileSync(path.join(__dirname, 'account-seams.json'), JSON.stringify(manifest, null, 2));
