/** @type {import('next').NextConfig} */
const nextConfig = {
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
