import { defineConfig, devices } from '@playwright/test';

/**
 * Merkle DAG: e2e.config
 * Playwright configuration for E2E tests
 * RDF: https://spirit-in-physics.gftd.ai/e2e/config
 */

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 120000, // 2 minutes timeout for performance tests
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://researcher.spirit-in-physics.orb.local',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 30000, // 30 seconds for actions
    navigationTimeout: 60000, // 60 seconds for navigation
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // webServer disabled - using Docker Compose service instead
  // webServer: {
  //   command: 'pnpm dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});

