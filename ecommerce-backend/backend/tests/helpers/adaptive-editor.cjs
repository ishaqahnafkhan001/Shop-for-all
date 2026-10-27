'use strict';
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../../../..');
const req = Module.createRequire(path.join(root, 'ecommerce-admin/package.json'));
async function loadAdaptiveEditor() {
    const { rolldown } = await import(pathToFileURL(req.resolve('rolldown')));
    const modules = new Set();
    const bundle = await rolldown({ input: 'virtual:editor', platform: 'node', external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react'],
        plugins: [{ name: 'isolated-editor', resolveId(id) {
            if (/\/api\/|AuthContext|CartContext|axios|storefrontServer|^next\//.test(id)) throw new Error('Live controller blocked in editor fixture: ' + id);
            if (id === 'virtual:editor') return id;
            if (id === '@scaleup/storefront-renderer/adaptive') return path.join(root, 'packages/storefront-renderer/adaptive/index.jsx');
            if (id.startsWith('@scaleup/storefront-renderer/presentation/')) return path.join(root, 'packages/storefront-renderer/presentation', id.split('/').at(-1) + '.jsx');
            if (id === '@scaleup/storefront-renderer') return path.join(root, 'packages/storefront-renderer/index.jsx');
            if (id === '@scaleup/storefront-theme/storage') return path.join(root, 'packages/storefront-theme/storage.mjs');
            if (id === '@scaleup/storefront-theme/adaptive') return path.join(root, 'packages/storefront-theme/adaptive.mjs');
            if (id === '@scaleup/storefront-theme') return path.join(root, 'packages/storefront-theme/index.mjs');
            return null;
        }, load(id) {
            modules.add(id);
            if (id.endsWith('.css')) return { code: '', moduleType: 'js' };
            if (id === 'virtual:editor') return `export * from '${path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/adaptive/adaptiveEditorState.js').replaceAll('\\', '/')}';
                export { stableStringify } from '${path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/storeBuilderThemeUtils.js').replaceAll('\\', '/')}';
                export { AdaptiveInspector } from '${path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/adaptive/AdaptiveInspector.jsx').replaceAll('\\', '/')}';
                export * from '${path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/adaptive/AdaptiveStoreEditor.jsx').replaceAll('\\', '/')}';
                export * from '${path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/adaptive/previewState.js').replaceAll('\\', '/')}';
                export * from '${path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder/adaptive/developmentTransport.js').replaceAll('\\', '/')}';
                export * from '${path.join(root, 'packages/storefront-renderer/adaptive/index.jsx').replaceAll('\\', '/')}';
                export { ProtectedCore } from '${path.join(root, 'packages/storefront-renderer/adaptive/ProtectedCore.jsx').replaceAll('\\', '/')}';`;
            return null;
        } }] });
    try {
        const { output } = await bundle.generate({ format: 'cjs', codeSplitting: false });
        const filename = path.join(root, 'ecommerce-admin/adaptive-editor-fixture.cjs');
        const compiled = new Module(filename, module); compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename);
        return { ui: compiled.exports, React: req('react'), render: req('react-dom/server').renderToStaticMarkup, modules: [...modules] };
    } finally { await bundle.close(); }
}
module.exports = { loadAdaptiveEditor };
