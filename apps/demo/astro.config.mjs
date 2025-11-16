// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind({
      applyBaseStyles: true,
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
      // Note: HMR may not work perfectly in SSR mode with Docker
      // File changes will still trigger page reloads
      hmr: {
        clientPort: 25271, // External port for HMR client
      },
      watch: {
        // Use polling for file watching in Docker
        usePolling: true,
        interval: 1000,
      },
    },
  },
});

