const path = require('node:path');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
let cached;
const loadAiPresentation = () => cached || (cached = (async () => {
    const root = path.resolve(__dirname, '../../../..');
    const filename = path.join(root, 'ecommerce-admin/ai-presentation-test.cjs');
    const requireAdmin = Module.createRequire(filename);
    const { rolldown } = await import(pathToFileURL(requireAdmin.resolve('rolldown')).href);
    const shared = path.join(root, 'packages/storefront-renderer').replaceAll('\\', '/');
    const bundle = await rolldown({ input: 'virtual:ai-presentation', platform: 'node',
        resolve: { alias: { '@scaleup/storefront-theme': path.join(root, 'packages/storefront-theme/index.mjs') } },
        external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react'],
        plugins: [{ name: 'ai-presentation', resolveId: id => id === 'virtual:ai-presentation' ? id : null,
            load: id => id === 'virtual:ai-presentation' ? `
                export { ProductFeatures } from '${shared}/presentation/ProductExtras.jsx';
                export { default as RelatedProducts } from '${shared}/presentation/RelatedProducts.jsx';
                export { StorefrontHero } from '${shared}/reference/StorefrontHero.jsx';
                export { ReferenceStorefrontHome } from '${shared}/reference/StorefrontHome.jsx';
                export { StorefrontAllProducts } from '${shared}/reference/StorefrontAllProducts.jsx';
                export * from '${shared}/presentation/CartView.jsx';
                export * from '${shared}/presentation/CheckoutSections.jsx';
                export * from '${shared}/presentation/ProductDetailsView.jsx';
            ` : null }] });
    try {
        const { output } = await bundle.generate({ format: 'cjs' });
        const compiled = new Module(filename, module);
        compiled.paths = Module._nodeModulePaths(path.dirname(filename));
        compiled._compile(output[0].code, filename);
        const React = requireAdmin('react');
        const render = requireAdmin('react-dom/server').renderToStaticMarkup;
        return { ...compiled.exports, render: (Component, props) => render(React.createElement(Component, props)) };
    } finally { await bundle.close(); }
})());
module.exports = { loadAiPresentation };
