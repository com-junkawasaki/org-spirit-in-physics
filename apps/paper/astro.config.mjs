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

// https://astro.build/config
export default defineConfig({
  integrations: [
    mdx({
      remarkPlugins: [remarkMath, remarkGfm],
      rehypePlugins: [rehypeKatex],
    }),
    tailwind({
      applyBaseStyles: false,
      configFile: './tailwind.config.mjs',
    }),
    react(),
  ],
  output: 'static', // Static site generation for research paper pages
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
});
