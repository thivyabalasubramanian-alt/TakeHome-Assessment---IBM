import { expect, test as setup } from '@playwright/test';
import { AUTH_STATE_FILE, SEEDED_USERS, type Role } from '../support/config/env';
import { HOME_PAGE } from '../support/pages/app-shell.page';
import { LoginPage } from '../support/pages/login.page';

const ROLES: Role[] = ['claimant', 'admin'];

// Log in once per role through the real UI and store the session for the ui project.
for (const role of ROLES) {
  setup(`stores a signed-in session for the ${role}`, { tag: '@setup' }, async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.logIn(SEEDED_USERS[role]);
    await expect(page).toHaveURL(HOME_PAGE[role].path);
    await page.context().storageState({ path: AUTH_STATE_FILE[role] });
  });
}
