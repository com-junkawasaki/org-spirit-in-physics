// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://astro.build/config
export default defineConfig({
  integrations: [
    mdx({
      remarkPlugins: [remarkMath, remarkGfm],
      rehypePlugins: [rehypeKatex],
    }),
    tailwind({
      applyBaseStyles: false,
      configFile: resolve(__dirname, 'tailwind.config.mjs'),
    }),
    react(),
  ],
  output: 'server', // Enable SSR for API routes and pages
  server: {
    host: true,
    port: 4321,
    allowedHosts: [
      'research.spirit-in-physics.orb.local',
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
        '@spirit-in-physics/visualization-components': '/app/packages/visualization-components/src/index.ts',
      },
    },
  },
});
