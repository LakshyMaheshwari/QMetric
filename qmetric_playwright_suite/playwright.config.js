const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.QMETRIC_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.QMETRIC_API_URL || 'http://localhost:5000';

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  globalSetup: './global-setup.js',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: true,
  },
  metadata: { qmetricApiUrl: API_URL },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      grep: /@smoke/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      grep: /@smoke/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
