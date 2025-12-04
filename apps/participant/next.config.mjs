/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure `pageExtensions` to include MDX files
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // Transpile Apollo Client packages
  transpilePackages: ['@apollo/client'],
  // TypeScript strict mode: fail build on type errors
  typescript: {
    ignoreBuildErrors: false,
  },
  // ESLint strict mode: fail build on lint errors
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config, { isServer, dev }) => {
    // Enable symlinks resolution for pnpm
    config.resolve.symlinks = true;
    
    // Ensure @apollo/client subpaths are resolved correctly
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    };
    
    // Node.js ポリフィルの追加（Inngestで必要）
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "async_hooks": false,
        "fs": false,
        "path": false,
        "crypto": false,
        "stream": false,
        "util": false,
        "url": false,
        "http": false,
        "https": false,
        "zlib": false,
        "querystring": false,
      };
    }

    // サーバーサイドでの外部モジュール設定
    if (isServer) {
      config.externals = config.externals || [];
      // GraphQLサービスはwebpackバンドルに含めるため、外部設定は不要
    }

    // HMR設定（Docker環境でのファイル監視を改善）
    if (dev) {
      config.watchOptions = {
        poll: 1000, // 1秒ごとにポーリング
        aggregateTimeout: 300, // 変更後の待機時間
        ignored: ['**/node_modules', '**/.git', '**/.next'],
      };
    }

    return config;
  },
}

export default nextConfig 