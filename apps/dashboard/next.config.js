/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@team-dashboard/ui', '@team-dashboard/utils', '@team-dashboard/types'],
  experimental: {
    optimizePackageImports: ['@team-dashboard/ui'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
}

module.exports = nextConfig