/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure `pageExtensions` to include MDX files
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // Transpile Apollo Client packages
  transpilePackages: ['@apollo/client'],
  webpack: (config, { isServer, dev }) => {
    // Enable symlinks resolution for pnpm
    config.resolve.symlinks = true;
    
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
      // Neo4jはwebpackバンドルに含めるため、外部設定は不要
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