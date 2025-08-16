/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@team-dashboard/ui'],
  experimental: {
    optimizePackageImports: ['@team-dashboard/ui'],
  },
  basePath: process.env.NODE_ENV === 'production' ? '/docs' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/docs' : '',
}

module.exports = nextConfig