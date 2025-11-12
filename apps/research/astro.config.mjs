// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

// https://astro.build/config
export default defineConfig({
  integrations: [
    mdx({
      remarkPlugins: [remarkMath, remarkGfm],
      rehypePlugins: [rehypeKatex],
    }),
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
  ],
  output: 'static',
  server: {
    host: true,
    port: 4321,
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
