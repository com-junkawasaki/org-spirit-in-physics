// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Resolve package paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const jungVoiceAssessmentPath = resolve(
  __dirname,
  '../../packages/jung-voice-assessment/src/index.ts'
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
      const adapterPath = basePath + '/vercel';
      const vercelModule = await import(adapterPath);
      vercelAdapter = vercelModule.default();
    } catch (error) {
      // Silently ignore if adapter is not available (common in Docker dev environments)
    }
  }
  
  return {
    integrations: [
      tailwind({
        applyBaseStyles: true,
        configFile: './tailwind.config.mjs',
      }),
      react(),
    ],
    output: 'static', // Static output with SSR for API routes
    ...(vercelAdapter && { adapter: vercelAdapter }),
    server: {
      host: true,
      port: 25250,
      allowedHosts: [
        'participant.spirit-in-physics.orb.local',
        'localhost',
        '.orb.local',
      ],
    },
    vite: {
      resolve: {
        alias: {
          '@': resolve(__dirname, './src'),
          '@spirit-in-physics/jung-voice-assessment': jungVoiceAssessmentPath,
        },
      },
      optimizeDeps: {
        exclude: ['@spirit-in-physics/jung-voice-assessment'],
      },
      ssr: {
        noExternal: ['@spirit-in-physics/jung-voice-assessment'],
      },
      server: {
        host: '0.0.0.0',
        port: 25250,
        allowedHosts: isDev
          ? (host) => true
          : [
              'participant.spirit-in-physics.orb.local',
              'localhost',
              '.orb.local',
              '127.0.0.1',
            ],
        strictPort: false,
        hmr: {
          protocol: 'ws',
          host: 'localhost',
          port: 25250,
          clientPort: 25250,
        },
        watch: {
          usePolling: true,
          interval: 1000,
        },
      },
    },
  };
});

