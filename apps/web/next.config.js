/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@jarvis/shared'],
  experimental: {
    serverComponentsExternalPackages: ['@jarvis/shared'],
  },
};

module.exports = nextConfig;
