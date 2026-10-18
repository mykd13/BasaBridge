import { defineConfig, devices } from '@playwright/test';

import { baseURL, parentPort, parentURL, port } from './e2e/ports';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // One worker: parallel browsers make the dev server reload pages mid test.
  workers: 1,
  // The dev server compiles each route on first visit, so allow more than the default 5 s.
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /layout-360/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: /layout-360/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: /layout-360/ },
    {
      // A low-cost phone: 360 x 740, touch, Chromium.
      name: 'mobile-360',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 360, height: 740 },
        screen: { width: 360, height: 740 },
      },
    },
  ],
  webServer: [
    {
      // The dev server honours BB_DEV_ROLE, which a production build ignores on purpose.
      // Replace with real accounts when BB-7 lands.
      command: `pnpm exec next dev -p ${port}`,
      url: `${baseURL}/api/health`,
      env: { BB_DEV_ROLE: 'student' },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `pnpm exec next dev -p ${parentPort}`,
      url: `${parentURL}/api/health`,
      env: { BB_DEV_ROLE: 'parent', NEXT_DIST_DIR: '.next-parent' },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
