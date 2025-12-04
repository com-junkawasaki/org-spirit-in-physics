import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

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

export default defineConfig({
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
      '@spirit-in-physics/grpc-client',
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    // Allow all hosts in development (Docker/OrbStack environment)
    allowedHosts: true, // Allow all hosts
  },
});

