import { expect, test } from '../support/fixtures';
import { expectJson, type Claim } from '../support/api/bff-api';
import {
  ALLOWED_TRANSITIONS,
  CLAIM_STATUSES,
  STATUS_LABEL,
  type ClaimStatus,
} from '../support/data/claim-status';
import { AdminClaimsPage, STATUS_SELECT_PLACEHOLDER } from '../support/pages/admin-claims.page';

const hasNextStatuses = (status: ClaimStatus): boolean => ALLOWED_TRANSITIONS[status].length > 0;

test.describe('Admin claims management (UI)', () => {
  test('changes a claim status after the admin confirms', { tag: '@smoke' }, async ({ adminPage, seeder, claimantApi }) => {
    const claim = await seeder.claimInStatus('SUBMITTED');
    const adminClaims = new AdminClaimsPage(adminPage);

    await adminClaims.goto();
    await adminClaims.startStatusChange(claim.claimId, 'UNDER_REVIEW');
    await adminClaims.confirmStatusChange();

    await expect(adminPage.getByText('Claim status updated to Under Review')).toBeVisible();
    await expect(adminClaims.rowFor(claim.claimId).statusBadge('UNDER_REVIEW')).toBeVisible();
    // The change reached the backend, not just the screen.
    const persisted = await expectJson<Claim>(await claimantApi.getClaim(claim.claimId));
    expect(persisted.status).toBe('UNDER_REVIEW');
  });

  test('leaves the status unchanged when the admin cancels the confirmation', async ({ adminPage, seeder }) => {
    const claim = await seeder.claimInStatus('SUBMITTED');
    const adminClaims = new AdminClaimsPage(adminPage);

    await adminClaims.goto();
    await adminClaims.startStatusChange(claim.claimId, 'REJECTED');
    await adminClaims.cancelStatusChange();

    await expect(adminClaims.confirmDialog).toBeHidden();
    await expect(adminClaims.rowFor(claim.claimId).statusBadge('SUBMITTED')).toBeVisible();
  });

  test('offers only the valid next statuses for each current status', async ({ adminPage, seeder }) => {
    const claims = await Promise.all(CLAIM_STATUSES.map((status) => seeder.claimInStatus(status)));
    const adminClaims = new AdminClaimsPage(adminPage);

    await adminClaims.goto();

    for (const claim of claims.filter((seeded) => hasNextStatuses(seeded.status))) {
      const expectedLabels = ALLOWED_TRANSITIONS[claim.status].map((next) => STATUS_LABEL[next]);
      const offered = await adminClaims.rowFor(claim.claimId).statusSelect.locator('option').allTextContents();

      const nextStatusOptions = offered.filter((label) => label !== STATUS_SELECT_PLACEHOLDER);
      expect.soft([...nextStatusOptions].sort(), `options for a ${claim.status} claim`).toEqual([...expectedLabels].sort());
    }
    for (const claim of claims.filter((seeded) => !hasNextStatuses(seeded.status))) {
      await expect.soft(adminClaims.rowFor(claim.claimId).noTransitionsMarker).toBeVisible();
    }
  });

  test('filters the claim list by status', async ({ adminPage, seeder }) => {
    const [submitted, rejected] = await Promise.all([
      seeder.claimInStatus('SUBMITTED'),
      seeder.claimInStatus('REJECTED'),
    ]);
    const adminClaims = new AdminClaimsPage(adminPage);

    await adminClaims.goto();
    await adminClaims.filterByStatus('REJECTED');

    await expect(adminClaims.rowFor(rejected.claimId).root).toBeVisible();
    await expect(adminClaims.rowFor(submitted.claimId).root).toHaveCount(0);
  });
});
