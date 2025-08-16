/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@team-dashboard/ui', '@team-dashboard/utils', '@team-dashboard/types'],
  experimental: {
    optimizePackageImports: ['@team-dashboard/ui'],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
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