'use strict';
const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../../../..');
async function loadAdaptiveRenderer(format = 'cjs') {
    const filename = path.join(root, 'ecommerce-admin/adaptive-renderer-test.cjs');
    const req = Module.createRequire(filename);
    const { rolldown } = await import(pathToFileURL(req.resolve('rolldown')));
    const renderer = path.join(root, 'packages/storefront-renderer').replaceAll('\\', '/');
    const modules = new Set();
    const bundle = await rolldown({ input: 'virtual:adaptive', platform: 'node',
        external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react'],
        plugins: [{ name: 'isolated-adaptive-renderer',
            resolveId(id) {
                if (/\/api\/|AuthContext|CartContext|axios|storefrontServer|^next\//.test(id)) throw new Error('Live dependency reached synthetic renderer: ' + id);
                if (id.startsWith('virtual:')) return id;
                if (id === '@scaleup/storefront-theme/adaptive') return path.join(root, 'packages/storefront-theme/adaptive.mjs');
                if (id === '@scaleup/storefront-theme') return path.join(root, 'packages/storefront-theme/index.mjs');
                return null;
            },
            load(id) {
                modules.add(id);
                if (id === 'virtual:adaptive') return `export * from '${renderer}/adaptive/index.jsx';
                    export {ProtectedCore} from '${renderer}/adaptive/ProtectedCore.jsx';
                    export {ProductDetailsView} from '${renderer}/presentation/ProductDetailsView.jsx';
                    export * from '${renderer}/presentation/CheckoutSections.jsx';`;
                return null;
            },
        }],
    });
    try {
        const { output } = await bundle.generate({ format, codeSplitting: false,
            ...(format === 'es' ? { paths: id => pathToFileURL(req.resolve(id)).href } : {}) });
        // ESM is parsed separately by the browser-target tooling check. Node SSR
        // uses the same installed dependencies as the existing immutable suites.
        if (format !== 'cjs') return { code: output[0].code, modules: [...modules] };
        const compiled = new Module(filename, module);
        compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename);
        return { ui: compiled.exports, React: req('react'), render: req('react-dom/server').renderToStaticMarkup,
            modules: [...modules], code: output[0].code };
    } finally { await bundle.close(); }
}
module.exports = { loadAdaptiveRenderer, root };
