/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // ESLintの古いオプションを無効化
        ignoreDuringBuilds: false,
    },
    output: 'standalone',
    // 完全に動的レンダリングを強制
    trailingSlash: true,
    experimental: {
        forceSwcTransforms: true,
        serverComponentsExternalPackages: [],
    },
    images: {
        unoptimized: true,
    },
    generateBuildId: async () => {
        return 'build-' + Date.now()
    },
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
    }

    return config;
  },
};

module.exports = nextConfig;
