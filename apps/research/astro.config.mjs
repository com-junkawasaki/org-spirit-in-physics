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
      configFile: './tailwind.config.mjs',
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
