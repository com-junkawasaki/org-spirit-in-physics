/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: false,
  },
  transpilePackages: ['@apollo/client'],
}

module.exports = nextConfig
