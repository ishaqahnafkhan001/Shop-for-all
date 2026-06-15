import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fromAdminNodeModules = (pkgPath) => path.resolve(__dirname, 'node_modules', pkgPath)

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],

  resolve: {
    alias: [
      { find: /^react$/, replacement: fromAdminNodeModules('react') },
      { find: /^react\/jsx-runtime$/, replacement: fromAdminNodeModules('react/jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: fromAdminNodeModules('react/jsx-dev-runtime.js') },
      { find: /^react-dom$/, replacement: fromAdminNodeModules('react-dom') },
      { find: /^react-dom\/client$/, replacement: fromAdminNodeModules('react-dom/client.js') },
      { find: /^lucide-react$/, replacement: fromAdminNodeModules('lucide-react/dist/esm/lucide-react.mjs') }
    ],
    dedupe: ['react', 'react-dom']
  },

  server: {
    host: '0.0.0.0',
    port: 5173
  }
})
