import type { Locator, Page } from '@playwright/test';
import type { Credentials } from '../config/env';

export class LoginPage {
  private readonly email: Locator;
  private readonly password: Locator;
  private readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Log In', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async logIn({ email, password }: Credentials): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submitButton.click();
  }

  errorMessage(text: string): Locator {
    return this.page.getByRole('alert').filter({ hasText: text });
  }
}
