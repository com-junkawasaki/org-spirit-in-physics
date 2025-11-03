/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure `pageExtensions` to include MDX files
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
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
      // Neo4jはwebpackバンドルに含めるため、外部設定は不要
      
      // apps/researcher へのパスを外部として扱う（ビルド時に解決しない）
      const originalExternal = config.externals;
      config.externals = [
        ...(Array.isArray(originalExternal) ? originalExternal : [originalExternal]),
        ({ request }, callback) => {
          if (request && request.includes('apps/researcher')) {
            return callback(null, `commonjs ${request}`);
          }
          if (typeof originalExternal === 'function') {
            return originalExternal({ request }, callback);
          }
          callback();
        },
      ].filter(Boolean);
    }

    return config;
  },
};

module.exports = nextConfig;
