/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  webpack: (config, { isServer }) => {
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
      // Supabaseはwebpackバンドルに含めるため、外部設定は不要
    }

    return config;
  },
};

module.exports = nextConfig;
