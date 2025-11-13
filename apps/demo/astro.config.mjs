// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind({
      applyBaseStyles: false,
      configFile: resolve(__dirname, 'tailwind.config.mjs'),
    }),
    react(),
  ],
  output: 'server',
  server: {
    host: true,
    port: 4322,
  },
  vite: {
    resolve: {
      alias: {
        '@spirit-in-physics/visualization-components': resolve(__dirname, '../../packages/visualization-components/src/index.ts'),
      },
    },
  },
});

