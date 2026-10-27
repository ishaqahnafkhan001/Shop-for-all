import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fromAdminNodeModules = (pkgPath) => path.resolve(__dirname, 'node_modules', pkgPath)
const storefrontPackageManifests = new Set([
  path.resolve(__dirname, '../packages/storefront-renderer/package.json'),
  path.resolve(__dirname, '../packages/storefront-theme/package.json')
])

// preserveSymlinks keeps these packages under node_modules in Vite's cache.
// Watch their real manifests so newly added exports also work in a warm server.
const watchStorefrontPackageExports = () => ({
  name: 'watch-storefront-package-exports',
  configureServer(server) {
    server.watcher.add([...storefrontPackageManifests])
    server.watcher.on('change', file => {
      if (!storefrontPackageManifests.has(path.resolve(file))) return
      void server.restart().catch(error => server.config.logger.error(error.message))
    })
  }
})

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    watchStorefrontPackageExports()
  ],

  resolve: {
    alias: [
      { find: /^react$/, replacement: fromAdminNodeModules('react') },
      { find: /^react\/jsx-runtime$/, replacement: fromAdminNodeModules('react/jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: fromAdminNodeModules('react/jsx-dev-runtime.js') },
      { find: /^react-dom$/, replacement: fromAdminNodeModules('react-dom') },
      { find: /^react-dom\/client$/, replacement: fromAdminNodeModules('react-dom/client.js') },
      { find: /^lucide-react$/, replacement: fromAdminNodeModules('lucide-react/dist/esm/lucide-react.mjs') },
      { find: /^@scaleup\/storefront-theme$/, replacement: fromAdminNodeModules('@scaleup/storefront-theme/index.mjs') }
    ],
    dedupe: ['react', 'react-dom'],
    preserveSymlinks: true
  },

  optimizeDeps: {
    include: ['@scaleup/storefront-theme']
  },

  server: {
    // Shared local font and decorative assets resolve outside node_modules through the package junction.
    // Permit only that asset directory, never the backend/workspace root.
    fs: { allow: [__dirname, path.resolve(__dirname, '../packages/storefront-renderer/fonts'), path.resolve(__dirname, '../packages/storefront-renderer/atelier')] },
    host: '0.0.0.0',
    port: 5173
  }
})
