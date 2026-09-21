import {
  test as base,
  expect,
  type APIRequestContext,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
} from '@playwright/test';
import { BffApi, registerUser } from './api/bff-api';
import { ClaimSeeder } from './api/claim-seeder';
import { HTTP } from './api/http-status';
import { AUTH_STATE_FILE, env, SEEDED_USERS, type Role } from './config/env';
import { buildNewUser, type NewUser } from './data/user-builder';

interface WorkerFixtures {
  /** Signed-in API clients, one login per worker. */
  claimantApi: BffApi;
  adminApi: BffApi;
  seeder: ClaimSeeder;
}

interface TestFixtures {
  anonymousApi: APIRequestContext;
  /** A brand-new claimant, for tests that need a second, unrelated user. */
  otherClaimant: { api: BffApi; credentials: NewUser };
  /** Opens a page in its own browser context, signed in as `as` (anonymous if omitted). */
  openPage: (as?: Role, contextOptions?: BrowserContextOptions) => Promise<Page>;
  claimantPage: Page;
  adminPage: Page;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  claimantApi: [
    async ({ playwright }, use) => {
      const api = await BffApi.signIn(playwright, SEEDED_USERS.claimant);
      await use(api);
      await api.dispose();
    },
    { scope: 'worker' },
  ],
  adminApi: [
    async ({ playwright }, use) => {
      const api = await BffApi.signIn(playwright, SEEDED_USERS.admin);
      await use(api);
      await api.dispose();
    },
    { scope: 'worker' },
  ],
  seeder: [
    async ({ claimantApi, adminApi }, use) => {
      await use(new ClaimSeeder(claimantApi, adminApi));
    },
    { scope: 'worker' },
  ],

  anonymousApi: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({ baseURL: env.bffUrl });
    await use(context);
    await context.dispose();
  },

  otherClaimant: async ({ playwright, anonymousApi }, use) => {
    const credentials = buildNewUser();
    const registration = await registerUser(anonymousApi, credentials);
    expect(registration.status(), 'registering the second claimant').toBe(HTTP.CREATED);
    const api = await BffApi.signIn(playwright, credentials);
    await use({ api, credentials });
    await api.dispose();
  },

  // Manually created contexts do not get the config's trace/screenshot settings,
  // so tracing is started here and attached to the report when the test fails.
  openPage: async ({ browser }, use, testInfo) => {
    const contexts: BrowserContext[] = [];
    await use(async (as, contextOptions = {}) => {
      const context = await browser.newContext({
        baseURL: env.uiUrl,
        ...(as ? { storageState: AUTH_STATE_FILE[as] } : {}),
        ...contextOptions,
      });
      await context.tracing.start({ screenshots: true, snapshots: true });
      contexts.push(context);
      return context.newPage();
    });

    const failed = testInfo.status !== testInfo.expectedStatus;
    for (const [index, context] of contexts.entries()) {
      if (failed) {
        const tracePath = testInfo.outputPath(`trace-${index + 1}.zip`);
        await context.tracing.stop({ path: tracePath });
        await testInfo.attach(`trace-${index + 1}`, { path: tracePath, contentType: 'application/zip' });
      } else {
        await context.tracing.stop();
      }
      await context.close();
    }
  },

  claimantPage: async ({ openPage }, use) => {
    await use(await openPage('claimant'));
  },
  adminPage: async ({ openPage }, use) => {
    await use(await openPage('admin'));
  },
});

export { expect };
