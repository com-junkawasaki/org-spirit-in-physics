// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Resolve visualization-components path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const visualizationComponentsPath = resolve(
  __dirname,
  '../../packages/visualization-components/src/index.ts'
);

// Check if we're in dev mode BEFORE any adapter imports
// This prevents Vite from trying to resolve the adapter module during dev
const isDev = process.argv.includes('dev') || process.argv.includes('--dev') || 
              process.env.NODE_ENV !== 'production';

// https://astro.build/config
export default defineConfig(async () => {
  // Only try to load adapter if we're NOT in dev mode
  // Skip entirely in dev to avoid Vite trying to resolve the module
  let vercelAdapter = undefined;
  if (!isDev) {
    try {
      // Use dynamic import - the string concatenation helps avoid some static analysis
      // but Vite may still try to resolve it, so we wrap in try-catch
      const basePath = '@astrojs';
      const adapterPath = basePath + '/vercel/static';
      const vercelModule = await import(adapterPath);
      vercelAdapter = vercelModule.default();
    } catch (error) {
      // Silently ignore if adapter is not available (common in Docker dev environments)
      // This is expected and fine - adapter is only needed for production builds
    }
  }
  
  return {
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
    output: 'static', // Static site generation for research paper pages
    ...(vercelAdapter && { adapter: vercelAdapter }), // Vercel adapter for deployment (only when available)
    server: {
      host: true,
      port: 4321,
      allowedHosts: [
        'paper.spirit-in-physics.orb.local',
        'localhost',
        '.orb.local',
      ],
    },
    markdown: {
      remarkPlugins: [remarkMath, remarkGfm],
      rehypePlugins: [rehypeKatex],
    },
    vite: {
      resolve: {
        alias: {
          '@spirit-in-physics/visualization-components': visualizationComponentsPath,
        },
      },
      optimizeDeps: {
        exclude: ['@spirit-in-physics/visualization-components'],
      },
      ssr: {
        noExternal: ['@spirit-in-physics/visualization-components'],
      },
      server: {
        // Bind to all interfaces to allow external connections
        host: '0.0.0.0',
        port: 4321,
        // Allow requests from these hosts
        // Use a function to allow all hosts in dev mode (useful for Docker)
        allowedHosts: isDev
          ? (host) => {
              // In development, allow all hosts
              return true;
            }
          : [
              'paper.spirit-in-physics.orb.local',
              'localhost',
              '.orb.local',
              '127.0.0.1',
            ],
        // Disable strict host checking in development
        strictPort: false,
        // HMR settings for Docker
        hmr: {
          protocol: 'ws',
          host: 'localhost',
          port: 4321,
          clientPort: 25270, // External port for HMR
        },
        watch: {
          // Use polling for file watching in Docker
          usePolling: true,
          interval: 1000,
        },
      },
    },
  };
});
