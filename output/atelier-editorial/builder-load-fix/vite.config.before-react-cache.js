import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fromAdminNodeModules = (pkgPath) => path.resolve(__dirname, 'node_modules', pkgPath)
const storefrontPackageRoots = [
  path.resolve(__dirname, '../packages/storefront-renderer'),
  path.resolve(__dirname, '../packages/storefront-theme')
]

// Local packages resolve through node_modules junctions, which Vite does not
// watch. Refresh both transformed modules and optimized dependencies when their
// real sources change, including newly added/removed modules and exports.
export const watchStorefrontPackages = () => ({
  name: 'watch-storefront-packages',
  configureServer(server) {
    let restartTimer
    const onSourceChange = (event, file) => {
      if (!['add', 'change', 'unlink'].includes(event)) return
      const absoluteFile = path.resolve(file)
      const isSharedSource = storefrontPackageRoots.some(root => {
        const relative = path.relative(root, absoluteFile)
        return relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)
      })
      if (!isSharedSource || !/\.(?:[cm]?js|jsx|css|json)$/.test(absoluteFile)) return
      clearTimeout(restartTimer)
      restartTimer = setTimeout(() => {
        void server.restart(true).catch(error => server.config.logger.error(error.message))
      }, 100)
    }
    server.watcher.add(storefrontPackageRoots)
    server.watcher.on('all', onSourceChange)
    server.httpServer?.once('close', () => {
      clearTimeout(restartTimer)
      server.watcher.off('all', onSourceChange)
    })
  }
})

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    watchStorefrontPackages()
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
