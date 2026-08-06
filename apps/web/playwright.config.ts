import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: 2,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'on',
    trace: 'on-first-retry',
    viewport: { width: 1600, height: 900 },
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['iPhone 15 Pro'],
      },
    },
  ],
});
