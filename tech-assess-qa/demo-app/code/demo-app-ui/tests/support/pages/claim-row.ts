import type { Locator } from '@playwright/test';
import { STATUS_LABEL, type ClaimStatus } from '../data/claim-status';

/** One row of a claims table (claimant or admin view). */
export class ClaimRow {
  constructor(readonly root: Locator) {}

  statusBadge(status: ClaimStatus): Locator {
    return this.root.getByRole('status', { name: `Claim status: ${STATUS_LABEL[status]}` });
  }

  get viewDetailsButton(): Locator {
    return this.root.getByRole('button', { name: 'View Details' });
  }

  /** Admin only: the "Update Status" dropdown. */
  get statusSelect(): Locator {
    return this.root.getByRole('combobox', { name: /update status for claim/i });
  }

  /** Admin only: shown instead of the dropdown when no transition is possible. */
  get noTransitionsMarker(): Locator {
    return this.root.getByLabel('No status transitions available');
  }
}
