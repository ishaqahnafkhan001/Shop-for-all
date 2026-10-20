import { defineConfig, mergeConfig, transformWithOxc } from 'vite';
import base from '../vite.config.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const admin = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(admin, '../ecommerce-storefront/src');
const fixture = name => path.resolve(admin, 'tests/fixtures', name);
const mocks = fixture('atelier-route-runtime.jsx');
export default mergeConfig(base, defineConfig({
  optimizeDeps: {
    entries: ['tests/fixtures/atelier-routes.html'],
    rolldownOptions: {
      moduleTypes: {
        '.js': 'jsx'
      }
    }
  },
  cacheDir: path.resolve(admin, '../output/atelier-editorial/phase3/.vite-fixture'),
  plugins: [{
    name: 'fixture-jsx-hooks',
    enforce: 'pre',
    async transform(code, id) {
      if (id.replaceAll('\\', '/').includes('/ecommerce-storefront/src/') && id.endsWith('.js')) return transformWithOxc(code, id, {
        lang: 'jsx',
        jsx: {
          runtime: 'automatic'
        }
      });
    }
  }],
  resolve: {
    alias: [{
      find: /^@atelier-real-toast$/,
      replacement: path.resolve(admin, 'node_modules/react-hot-toast/dist/index.mjs')
    }, {
      find: /^next\/link$/,
      replacement: fixture('atelier-link.js')
    }, {
      find: /^next\/image$/,
      replacement: fixture('atelier-image.js')
    }, {
      find: /^next\/navigation$/,
      replacement: fixture('atelier-navigation.js')
    }, {
      find: /^next\/headers$/,
      replacement: fixture('atelier-headers.js')
    }, {
      find: /^react-hot-toast$/,
      replacement: fixture('atelier-toast.js')
    }, ...['api/api', 'context/AuthContext', 'components/storefront/StorefrontThemeProvider', 'utils/analyticsTracker', 'lib/storefrontServer'].map(p => ({
      find: '@/' + p,
      replacement: mocks
    })), {
      find: /^@\//,
      replacement: source.replaceAll('\\', '/') + '/'
    }]
  },
  define: {
    'process.env.NEXT_PUBLIC_ADMIN_PANEL_URL': JSON.stringify('https://admin.example.test')
  },
  server: {
    host: '127.0.0.1',
    port: 5211,
    strictPort: true,
    fs: {
      allow: [admin, source, path.resolve(admin, '../packages/storefront-renderer')]
    }
  }
}));
