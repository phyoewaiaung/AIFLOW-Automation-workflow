/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@autoflow/ui', '@autoflow/types', '@autoflow/utils'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@autoflow/ui': require('path').resolve(__dirname, '../../packages/ui/src'),
      '@autoflow/types': require('path').resolve(__dirname, '../../packages/types/src'),
      '@autoflow/utils': require('path').resolve(__dirname, '../../packages/utils/src'),
    };
    return config;
  },
};

module.exports = nextConfig;