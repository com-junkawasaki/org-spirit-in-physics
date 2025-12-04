import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, resolve } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure `pageExtensions` to include MDX files
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // Only use standalone output in production builds
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
  // Transpile monorepo packages
  transpilePackages: ['@spirit-in-physics/visualization-components'],
  // Enable experimental features for better performance
  experimental: {
    // optimizeCss: true, // Disabled: requires critters module which has issues in Docker
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
      symlinks: dev !== false, // Enable symlink resolution in development, disable in production
      alias: {
        ...config.resolve.alias,
        '@spirit-in-physics/visualization-components': resolve(__dirname, '../../packages/visualization-components/src/index.ts'),
      },
      modules: [
        resolve(__dirname, 'node_modules'),
        resolve(__dirname, '../../node_modules'), // Root node_modules for monorepo
        'node_modules', // Default node_modules resolution
        ...(config.resolve?.modules || []),
      ],
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      },
    }

    // Merkle DAG: External modules configuration for server-side
    // Ensure react-plotly.js is resolved correctly (check both local and root node_modules)
    const reactPlotlyPath = resolve(__dirname, 'node_modules/react-plotly.js')
    const rootReactPlotlyPath = resolve(__dirname, '../../node_modules/react-plotly.js')
    // Try to resolve from local node_modules first, then root
    // Always set alias to help webpack resolve the module
    if (existsSync(reactPlotlyPath)) {
      config.resolve.alias['react-plotly.js'] = reactPlotlyPath
    } else if (existsSync(rootReactPlotlyPath)) {
      config.resolve.alias['react-plotly.js'] = rootReactPlotlyPath
    } else {
      // If not found, still set alias to local path (will fail at runtime if not installed)
      // This allows webpack to build successfully
      config.resolve.alias['react-plotly.js'] = reactPlotlyPath
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
