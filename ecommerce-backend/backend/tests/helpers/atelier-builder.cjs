const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const {
  pathToFileURL
} = require('node:url');
const root = path.resolve(__dirname, '../../../..');

// Same installed Rolldown/React SSR approach as the existing preview parity tests.
// Only iframe mounting is substituted. Network-capable application modules fail closed.
async function loadBuilder() {
  const filename = path.join(root, 'ecommerce-admin/atelier-builder-test.cjs');
  const req = Module.createRequire(filename);
  const {
    rolldown
  } = await import(pathToFileURL(req.resolve('rolldown')));
  const builder = path.join(root, 'ecommerce-admin/src/pages/dashboard/StoreBuilder').replaceAll('\\', '/');
  const renderer = path.join(root, 'packages/storefront-renderer').replaceAll('\\', '/');
  const modules = new Set();
  const bundle = await rolldown({
    input: 'virtual:atelier-builder',
    platform: 'node',
    external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react'],
    plugins: [{
      name: 'isolated-builder',
      resolveId(id) {
        if (/\/api\/api(?:\.|$)|AuthContext|CartContext/.test(id)) throw new Error('Network/session module reached preview: ' + id);
        if (id.startsWith('virtual:')) return id;
        if (id.endsWith('/StorefrontPreviewFrame.jsx')) return 'virtual:frame';
        return null;
      },
      load(id) {
        modules.add(id);
        if (id === 'virtual:frame') return 'export const StorefrontPreviewFrame = ({children}) => children;';
        if (id === 'virtual:atelier-builder') return `
                export * from '${builder}/StorefrontPreview.jsx';
                export * from '${builder}/PreviewCommercePages.jsx';
                export * from '${builder}/themes/ThemeGallery.jsx';
                export {default as ThemeGallery} from '${builder}/themes/ThemeGallery.jsx';
                export * from '${builder}/themes/themeAvailability.js';
                export * from '${builder}/editors/BasicEditors.jsx';
                export * from '${builder}/editors/HeroEditor.jsx';
                export * from '${builder}/editors/DynamicSectionsEditor.jsx';
                export * from '${builder}/storeBuilderThemeUtils.js';
                export * from '${renderer}/presentation/CheckoutSections.jsx';
            `;
        return null;
      }
    }]
  });
  try {
    const {
      output
    } = await bundle.generate({
      format: 'cjs',
      codeSplitting: false
    });
    const compiled = new Module(filename, module);
    compiled.paths = Module._nodeModulePaths(path.dirname(filename));
    compiled._compile(output[0].code, filename);
    return {
      ui: compiled.exports,
      React: req('react'),
      render: req('react-dom/server').renderToStaticMarkup,
      modules: [...modules]
    };
  } finally {
    await bundle.close();
  }
}
module.exports = {
  loadBuilder,
  root
};
