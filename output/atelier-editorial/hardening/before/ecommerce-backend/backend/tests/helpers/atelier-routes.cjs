'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const {
  pathToFileURL
} = require('node:url');
const root = path.resolve(__dirname, '../../../..');
async function loadRoutes({
  baseline = false
} = {}) {
  const filename = path.join(root, 'ecommerce-admin/atelier-route-test.cjs');
  const req = Module.createRequire(filename);
  const {
    rolldown
  } = await import(pathToFileURL(req.resolve('rolldown')));
  const fixture = path.join(root, 'ecommerce-admin/tests/fixtures').replaceAll('\\', '/');
  const mocks = fixture + '/atelier-route-runtime.jsx';
  const resolveFile = p => [p, p + '.jsx', p + '.js', p + '.mjs'].find(x => fs.existsSync(x));
  const bundle = await rolldown({
    input: 'virtual:route-entry',
    platform: 'node',
    external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react'],
    moduleTypes: {
      '.js': 'jsx'
    },
    transform: {
      define: {
        'process.env.NEXT_PUBLIC_ADMIN_PANEL_URL': '"https://admin.example.test"'
      }
    },
    plugins: [{
      name: 'isolated-routes',
      resolveId(id) {
        if (id.startsWith('virtual:')) return id;
        if (id.endsWith('atelier-route-runtime.jsx')) return mocks;
        if (id === 'next/link') return 'virtual:link';
        if (id === 'next/image') return 'virtual:image';
        if (id === 'next/navigation') return 'virtual:navigation';
        if (id === 'next/headers') return 'virtual:headers';
        if (id === 'react-hot-toast') return 'virtual:toast';
        if (['@/api/api', '@/context/AuthContext', '@/components/storefront/StorefrontThemeProvider', '@/utils/analyticsTracker', '@/lib/storefrontServer'].includes(id)) return mocks;
        if (id.startsWith('@/')) return resolveFile(path.join(root, 'ecommerce-storefront/src', id.slice(2)));
        if (id === '@scaleup/storefront-theme') return path.join(root, 'packages/storefront-theme/index.mjs');
        if (id === '@scaleup/storefront-theme/prebuilt') return path.join(root, 'packages/storefront-theme/prebuilt.mjs');
        if (id.startsWith('@scaleup/storefront-renderer/presentation/')) return resolveFile(path.join(root, 'packages/storefront-renderer/presentation', id.split('/').pop()));
        if (id === '@scaleup/storefront-renderer/product-data') return path.join(root, 'packages/storefront-renderer/normalizeProduct.js');
      },
      load(id) {
        if (id === 'virtual:route-entry') return `export * from '${fixture}/atelier-route-cases.jsx';export * from '${fixture}/atelier-phase4-cases.jsx';export * from '${mocks}';export * from '${path.join(root, 'packages/storefront-renderer/presentation/CheckoutSections.jsx').replaceAll('\\', '/')}';export {ProductDetailsView} from '${path.join(root, 'packages/storefront-renderer/presentation/ProductDetailsView.jsx').replaceAll('\\', '/')}';`;
        if (id === 'virtual:link') return `export {FixtureLink as default} from '${mocks}';`;
        if (id === 'virtual:image') return `export {FixtureImage as default} from '${mocks}';`;
        if (id === 'virtual:navigation') return `export {useRouter,usePathname,useSearchParams,useParams,notFound,redirect} from '${mocks}';`;
        if (id === 'virtual:headers') return `export {headers} from '${mocks}';`;
        if (id === 'virtual:toast') return `export {toast} from '${mocks}';`;
        if (baseline && path.isAbsolute(id)) {
          const rel = path.relative(root, id);
          const saved = path.join(root, 'output/atelier-editorial/phase3/baseline-source', rel);
          if (!rel.startsWith('..') && fs.existsSync(saved)) return fs.readFileSync(saved, 'utf8');
        }
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
      render: req('react-dom/server').renderToStaticMarkup
    };
  } finally {
    await bundle.close();
  }
}
module.exports = {
  loadRoutes,
  root
};
