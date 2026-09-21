import { expect, type Locator, type Page } from '@playwright/test';
import { STATUS_LABEL, type ClaimStatus } from '../data/claim-status';
import { ClaimRow } from './claim-row';

export const STATUS_SELECT_PLACEHOLDER = 'Update Status';
const CLAIM_ID_PREFIX_LENGTH = 8;

export class AdminClaimsPage {
  private readonly statusFilter: Locator;
  readonly confirmDialog: Locator;

  constructor(private readonly page: Page) {
    this.statusFilter = page.getByRole('combobox', { name: 'Filter claims by status' });
    this.confirmDialog = page.getByRole('dialog', { name: 'Confirm Status Change' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/claims');
    await expect(this.page.getByRole('heading', { name: 'Claims Management' })).toBeVisible();
  }

  /** The table shows only the first 8 characters of the claim id. */
  rowFor(claimId: string): ClaimRow {
    return new ClaimRow(
      this.page.getByRole('row').filter({ hasText: claimId.slice(0, CLAIM_ID_PREFIX_LENGTH) }),
    );
  }

  async filterByStatus(status: ClaimStatus): Promise<void> {
    await this.statusFilter.selectOption({ label: STATUS_LABEL[status] });
  }

  /** Picks the new status and waits for the confirmation dialog. */
  async startStatusChange(claimId: string, target: ClaimStatus): Promise<void> {
    await this.rowFor(claimId).statusSelect.selectOption({ label: STATUS_LABEL[target] });
    await expect(this.confirmDialog).toContainText(`Change status to ${STATUS_LABEL[target]}?`);
  }

  async confirmStatusChange(): Promise<void> {
    await this.confirmDialog.getByRole('button', { name: 'Confirm', exact: true }).click();
  }

  async cancelStatusChange(): Promise<void> {
    await this.confirmDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
}
