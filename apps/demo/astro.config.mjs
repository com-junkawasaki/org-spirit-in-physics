// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
  ],
  output: 'server',
  server: {
    host: true,
    port: 4322,
    allowedHosts: [
      'demo.spirit-in-physics.orb.local',
      'localhost',
      '.orb.local',
    ],
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
        port: 4322,
        clientPort: 25271, // External port for HMR
      },
      watch: {
        // Use polling for file watching in Docker
        usePolling: true,
        interval: 1000,
      },
    },
  },
});

