import { expect, type Locator, type Page } from '@playwright/test';
import type { Role } from '../config/env';

/** Where each role lands after signing in. */
export const HOME_PAGE: Record<Role, { path: string; heading: string }> = {
  claimant: { path: '/claims', heading: 'My Claims' },
  admin: { path: '/admin/dashboard', heading: 'Admin Dashboard' },
};

/** Header shared by every authenticated page. */
export class AppShell {
  readonly logoutButton: Locator;
  readonly liveIndicator: Locator;

  constructor(private readonly page: Page) {
    this.logoutButton = page.getByRole('button', { name: 'Logout', exact: true });
    this.liveIndicator = page.getByRole('status', { name: 'Connection status: Live' });
  }

  async logOut(): Promise<void> {
    await this.logoutButton.click();
  }

  /** Real-time tests must not act before the WebSocket is connected. */
  async waitUntilLive(): Promise<void> {
    await expect(this.liveIndicator).toBeVisible();
  }
}
