import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(projectRoot, '..')
const fromStorefrontNodeModules = (packagePath) => path.resolve(projectRoot, 'node_modules', packagePath)
const lucideReactEntry = './node_modules/lucide-react/dist/esm/lucide-react.mjs'
const storefrontThemeEntry = './node_modules/@scaleup/storefront-theme/index.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' }
      ]
    }]
  },
  turbopack: {
    root: workspaceRoot,
    resolveAlias: {
      'lucide-react': lucideReactEntry,
      '@scaleup/storefront-theme': storefrontThemeEntry
    }
  },
  webpack: (config) => {
    config.resolve.alias['lucide-react'] = fromStorefrontNodeModules('lucide-react')
    config.resolve.alias['@scaleup/storefront-theme'] = fromStorefrontNodeModules('@scaleup/storefront-theme')
    return config
  },
  images: {
    // Uploaded storefront assets are served from Cloudinary. Unknown external
    // image hosts must render unoptimized in components instead of going
    // through Next Image optimization.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com'
      }
    ]
  }
}

export default nextConfig
