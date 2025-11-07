/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@apollo/client'],
  experimental: {
    esmExternals: 'loose',
  },
  reactStrictMode: false,
  swcMinify: true,
}

module.exports = nextConfig
