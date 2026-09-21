import { expect, test } from '../support/fixtures';
import { SEEDED_USERS, type Role } from '../support/config/env';
import { buildNewUser } from '../support/data/user-builder';
import { AppShell, HOME_PAGE } from '../support/pages/app-shell.page';
import { LoginPage } from '../support/pages/login.page';
import { SignupPage } from '../support/pages/signup.page';

const SEEDED_ROLES: Role[] = ['claimant', 'admin'];

test.describe('Authentication and access (UI)', () => {
  test('sends an anonymous visitor from a protected page to the login page', { tag: '@smoke' }, async ({ page }) => {
    await page.goto(HOME_PAGE.claimant.path);

    await expect(page).toHaveURL(/\/login/);
  });

  for (const role of SEEDED_ROLES) {
    test(`signs in as ${role} and lands on their home page`, { tag: '@smoke' }, async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.logIn(SEEDED_USERS[role]);

      await expect(page).toHaveURL(HOME_PAGE[role].path);
      await expect(page.getByRole('heading', { name: HOME_PAGE[role].heading })).toBeVisible();
    });
  }

  test('keeps the user on the login page with an error for a wrong password', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.logIn({ ...SEEDED_USERS.claimant, password: 'wrong-password' });

    await expect(loginPage.errorMessage('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('lets a new user sign up and then sign in', async ({ page }) => {
    const user = buildNewUser();
    const signupPage = new SignupPage(page);
    const loginPage = new LoginPage(page);

    await signupPage.goto();
    await signupPage.register(user);
    await expect(page).toHaveURL(/\/login/);
    await loginPage.logIn(user);

    await expect(page).toHaveURL(HOME_PAGE.claimant.path);
    await expect(page.getByText(`Welcome, ${user.name}`)).toBeVisible();
  });

  // Uses its own login: signing out ends the session, which must not affect the
  // shared sessions other tests reuse.
  test('signs out and blocks protected pages afterwards', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.logIn(SEEDED_USERS.claimant);
    await expect(page).toHaveURL(HOME_PAGE.claimant.path);
    await new AppShell(page).logOut();
    await expect(page).toHaveURL(/\/login/);

    await page.goto(HOME_PAGE.claimant.path);
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects a claimant away from admin pages with an access denied message', async ({ claimantPage }) => {
    await claimantPage.goto('/admin/claims');

    await expect(claimantPage.getByText('Access denied').first()).toBeVisible();
    await expect(claimantPage).toHaveURL(HOME_PAGE.claimant.path);
  });
});
