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

// Check if we're in dev mode BEFORE any adapter imports
const isDev = process.argv.includes('dev') || process.argv.includes('--dev') || 
              process.env.NODE_ENV !== 'production';

// https://astro.build/config
export default defineConfig(async () => {
  // Only try to load adapter if we're NOT in dev mode
  let vercelAdapter = undefined;
  if (!isDev) {
    try {
      const basePath = '@astrojs';
      const adapterPath = basePath + '/vercel/server';
      const vercelModule = await import(adapterPath);
      vercelAdapter = vercelModule.default({
        webStaticCacheHeader: 'Cache-Control: public, max-age=31536000, immutable',
        functionPerRoute: true,
      });
    } catch (error) {
      // Silently ignore if adapter is not available (common in Docker dev environments)
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
    output: 'hybrid', // Hybrid output: static pages + SSR for API routes
    ...(vercelAdapter && { adapter: vercelAdapter }),
    server: {
      host: true,
      port: 3000,
      allowedHosts: [
        'unified.spirit-in-physics.orb.local',
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
          '@': resolve(__dirname, './src'),
          '@spirit-in-physics/jung-voice-assessment': jungVoiceAssessmentPath,
          '@spirit-in-physics/visualization-components': visualizationComponentsPath,
        },
      },
      optimizeDeps: {
        exclude: [
          '@spirit-in-physics/jung-voice-assessment',
          '@spirit-in-physics/visualization-components',
        ],
      },
      ssr: {
        noExternal: [
          '@spirit-in-physics/jung-voice-assessment',
          '@spirit-in-physics/visualization-components',
        ],
      },
      server: {
        host: '0.0.0.0',
        port: 3000,
        allowedHosts: isDev
          ? (host) => true
          : [
              'unified.spirit-in-physics.orb.local',
              'localhost',
              '.orb.local',
              '127.0.0.1',
            ],
        strictPort: false,
        hmr: {
          protocol: 'ws',
          host: 'localhost',
          port: 3000,
          clientPort: 3000,
        },
        watch: {
          usePolling: true,
          interval: 1000,
        },
      },
    },
  };
});

