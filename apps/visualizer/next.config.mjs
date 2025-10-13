import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure `pageExtensions` to include MDX files
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
  },
  // Merkle DAG: Turbopack設定（experimental.turboの代替）
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  // Merkle DAG: Webpack最適化設定
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // 開発環境でのコンパイル時間短縮
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        compression: 'gzip',
      }
      
      // 不要なファイルの監視を無効化
      config.watchOptions = {
        ignored: /node_modules/,
        aggregateTimeout: 300,
        poll: false,
      }
    }

    // Merkle DAG: Temporal client module resolution fix
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      },
    }

    // Merkle DAG: External modules configuration for server-side
    if (isServer) {
      config.externals = [...(config.externals || []), '@temporalio/client']
    }
    
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
