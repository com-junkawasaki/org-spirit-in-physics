// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import node from '@astrojs/node';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Resolve package paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const jungVoiceAssessmentPath = resolve(
  __dirname,
  '../../packages/jung-voice-assessment/src/index.ts'
);
const visualizationComponentsPath = resolve(
  __dirname,
  '../../packages/visualization-components/src/index.ts'
);
// Use source files for grpc-client to let Vite handle TypeScript compilation
const grpcClientPath = resolve(
  __dirname,
  '../../packages/grpc-client/src/index.ts'
);

// Check if we're in dev mode BEFORE any adapter imports
// For build command, always use adapter (even if NODE_ENV is not production)
const isDev = process.argv.includes('dev') || process.argv.includes('--dev');

// Check if we should allow all hosts (for Docker/OrbStack)
// Docker環境ではVITE_ALLOWED_HOSTS=trueが設定されているため、常にtrueを設定
const allowAllHosts = process.env.VITE_ALLOWED_HOSTS === 'true' || isDev;

// Get additional allowed hosts from environment variable (for OrbStack)
const additionalHosts = process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS
  ? process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS.split(',').map(h => h.trim())
  : [];

// Build allowedHosts configuration
// Vite 6ではallowedHostsは配列またはtrueを直接指定します
// 開発モードまたはVITE_ALLOWED_HOSTS=trueの場合はすべてのホストを許可
// それ以外の場合は、追加ホストを含む配列を指定
// Docker/OrbStack環境では常にtrueを設定してすべてのホストを許可
const viteAllowedHosts = allowAllHosts 
  ? true 
  : additionalHosts.length > 0
    ? ['localhost', '127.0.0.1', ...additionalHosts]
    : ['localhost', '127.0.0.1'];

// https://astro.build/config
export default defineConfig({
  // Use Node.js adapter for builds (Docker/Node.js environments)
  // In dev mode, Astro's built-in dev server handles SSR without an adapter
  // For 'hybrid' output mode, adapter is required for build
  // Always set adapter for hybrid output (required for SSR)
  adapter: node({
    mode: 'standalone',
  }),
  
  integrations: [
    mdx({
      remarkPlugins: [remarkMath, remarkGfm],
      rehypePlugins: [rehypeKatex],
    }),
    tailwind({
      applyBaseStyles: true,
      configFile: './tailwind.config.mjs',
    }),
    react(),
  ],
  output: 'server', // Server-side rendering for API routes and dynamic pages
  server: {
    host: true,
    port: 3000,
    // Allow all hosts in development (Docker/OrbStack environment)
    // Vite 6ではallowedHostsは配列またはtrueを直接指定します
    allowedHosts: true,
  },
  markdown: {
    remarkPlugins: [remarkMath, remarkGfm],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
      resolve: {
        alias: {
          '@': resolve(__dirname, './src'),
          '@/': resolve(__dirname, './src/'),
          '@spirit-in-physics/jung-voice-assessment': jungVoiceAssessmentPath,
          '@spirit-in-physics/visualization-components': visualizationComponentsPath,
          '@spirit-in-physics/grpc-client': grpcClientPath,
        },
      },
      optimizeDeps: {
        exclude: [
          '@spirit-in-physics/jung-voice-assessment',
          '@spirit-in-physics/visualization-components',
          '@spirit-in-physics/grpc-client',
        ],
      },
      ssr: {
        noExternal: [
          '@spirit-in-physics/jung-voice-assessment',
          '@spirit-in-physics/visualization-components',
          '@spirit-in-physics/grpc-client',
        ],
      },
      server: {
        host: '0.0.0.0',
        port: 3000,
        // Fix for Issue #13060: explicitly set allowedHosts in vite.server
        // Vite 6ではallowedHostsは配列またはtrueを直接指定します。関数形式は非対応です。
        // Docker/OrbStack環境では常にtrueを設定してすべてのホストを許可
        // docker-compose.ymlでVITE_ALLOWED_HOSTS=trueが設定されているため、常にtrueを設定
        // または、環境変数__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTSから追加ホストを読み込む
        // 開発モードでは常にtrueを設定（isDevまたはVITE_ALLOWED_HOSTS=trueの場合）
        allowedHosts: isDev || process.env.VITE_ALLOWED_HOSTS === 'true' ? true : viteAllowedHosts,
        strictPort: false,
        hmr: {
          protocol: 'ws',
          // HMR host: use environment variable or auto-detect
          // In Docker/OrbStack, the browser connects from outside the container,
          // so we need to use the actual hostname or let Vite auto-detect it
          host: process.env.VITE_HMR_HOST || undefined, // undefined = auto-detect
          port: 3000,
          clientPort: process.env.VITE_HMR_CLIENT_PORT ? parseInt(process.env.VITE_HMR_CLIENT_PORT) : undefined, // undefined = use same as port
        },
        watch: {
          usePolling: true,
          interval: 1000,
        },
    },
  },
});

