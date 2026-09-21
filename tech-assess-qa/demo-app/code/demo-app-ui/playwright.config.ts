import { defineConfig, devices } from '@playwright/test';
import { env } from './tests/support/config/env';

/**
 * Three projects:
 *  - setup : logs in once per seeded role through the UI and stores the session
 *  - api   : HTTP-only tests against the BFF (no browser needed)
 *  - ui    : browser tests that reuse the stored sessions
 *
 * Tags: @smoke = critical path, @defect = asserts the documented contract and is
 * expected to expose a suspected bug (see tests/README.md).
 */
export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results',
  // One worker keeps runs deterministic: real-time events (toasts, WebSocket
  // broadcasts) are global side effects shared by every logged-in browser.
  // API-only runs can override this: npm run e2e:api -- --workers=4
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testDir: './tests/setup',
      testMatch: '**/*.setup.ts',
      use: { ...devices['Desktop Chrome'], baseURL: env.uiUrl },
    },
    {
      name: 'api',
      testDir: './tests/api',
      testMatch: '**/*.e2e.ts',
      use: { baseURL: env.bffUrl },
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      testMatch: '**/*.e2e.ts',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], baseURL: env.uiUrl },
    },
  ],
});
