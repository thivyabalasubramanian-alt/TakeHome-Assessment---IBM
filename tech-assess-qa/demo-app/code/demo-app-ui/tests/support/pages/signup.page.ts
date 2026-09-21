import type { Locator, Page } from '@playwright/test';
import type { NewUser } from '../data/user-builder';

export class SignupPage {
  private readonly name: Locator;
  private readonly email: Locator;
  private readonly password: Locator;
  private readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.name = page.getByLabel('Name', { exact: true });
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Sign Up', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/signup');
  }

  async register(user: NewUser): Promise<void> {
    await this.name.fill(user.name);
    await this.email.fill(user.email);
    await this.password.fill(user.password);
    await this.submitButton.click();
  }
}
