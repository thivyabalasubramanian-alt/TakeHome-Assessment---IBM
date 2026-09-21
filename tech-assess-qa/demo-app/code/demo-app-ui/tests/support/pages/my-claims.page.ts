import type { Locator, Page } from '@playwright/test';
import { ClaimRow } from './claim-row';

export class MyClaimsPage {
  readonly detailDialog: Locator;

  constructor(private readonly page: Page) {
    this.detailDialog = page.getByRole('dialog', { name: 'Claim Details' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/claims');
  }

  /** Table rows only: the mobile card layout is hidden at desktop width. */
  rowContaining(text: string): ClaimRow {
    return new ClaimRow(this.page.getByRole('row').filter({ hasText: text }));
  }
}
