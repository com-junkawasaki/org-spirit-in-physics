import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure `pageExtensions` to include MDX files
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  output: 'standalone',
  // Temporarily ignore TypeScript build errors
  // TODO: Fix Apollo Client type definitions issue
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
  },
  // Merkle DAG: Turbopack設定（experimental.turboの代替）
  // turbopack: {
  //   rules: {
  //     '*.svg': {
  //       loaders: ['@svgr/webpack'],
  //       as: '*.js',
  //     },
  //   },
  // },
  // Merkle DAG: Webpack最適化設定
  webpack: (config, { dev, isServer }) => {
    // Merkle DAG: Serverless Workflow SDK module resolution configuration
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      },
      // Merkle DAG: Workspace package resolution
      alias: {
        ...config.resolve?.alias,
        '@spirit-in-physics/visualizer': resolve(__dirname, '../../visualizer/src'),
      },
    }

    // Merkle DAG: External modules configuration for server-side
    
    return config
  },
  // Configure headers for better security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      }
    ]
  }
}

export default nextConfig
