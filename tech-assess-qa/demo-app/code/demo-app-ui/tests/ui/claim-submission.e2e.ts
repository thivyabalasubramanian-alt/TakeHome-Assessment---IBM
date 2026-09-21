import { expect, test } from '../support/fixtures';
import {
  buildClaimRequest,
  claimMarker,
  formatUsd,
  isoDate,
  type ClaimRequest,
} from '../support/data/claim-builder';
import { HOME_PAGE } from '../support/pages/app-shell.page';
import { MyClaimsPage } from '../support/pages/my-claims.page';
import { NewClaimPage } from '../support/pages/new-claim.page';

const VALID_DETAILS: Pick<ClaimRequest, 'incidentDate' | 'incidentLocation' | 'claimAmount'> = {
  incidentDate: isoDate(-1),
  incidentLocation: '12 Harbour Road, Springfield',
  claimAmount: 2500.75,
};

test.describe('Claim submission wizard (UI)', () => {
  test('submits a claim through the three steps and shows it in My Claims', { tag: '@smoke' }, async ({ claimantPage }) => {
    const request = buildClaimRequest(VALID_DETAILS);
    const wizard = new NewClaimPage(claimantPage);

    await wizard.goto();
    await wizard.fillIncidentDetails(request);
    await wizard.next();
    await wizard.fillDescription(request.description);
    await wizard.next();

    await expect(wizard.reviewStep).toContainText(request.incidentLocation);
    await expect(wizard.reviewStep).toContainText(formatUsd(request.claimAmount));
    await expect(wizard.reviewStep).toContainText(request.description);

    await wizard.submit();

    await expect(claimantPage.getByText(/Claim submitted successfully/)).toBeVisible();
    await expect(claimantPage).toHaveURL(HOME_PAGE.claimant.path);
    const row = new MyClaimsPage(claimantPage).rowContaining(claimMarker(request));
    await expect(row.root).toContainText(formatUsd(request.claimAmount));
    await expect(row.statusBadge('SUBMITTED')).toBeVisible();
  });

  test('blocks each step until its fields are valid and explains why', async ({ claimantPage }) => {
    const wizard = new NewClaimPage(claimantPage);

    await wizard.goto();
    await wizard.fillIncidentDetails({ ...VALID_DETAILS, incidentLocation: 'abc', claimAmount: 0 });

    await expect(wizard.nextButton).toBeDisabled();
    await expect(wizard.error('Location must be at least 5 characters')).toBeVisible();
    await expect(wizard.error('Claim amount must be at least $0.01')).toBeVisible();

    await wizard.fillIncidentDetails(VALID_DETAILS);
    await wizard.next();
    await wizard.fillDescription('too short');

    await expect(wizard.nextButton).toBeDisabled();
    await expect(wizard.error('Description must be at least 10 characters')).toBeVisible();
  });

  test(
    'keeps the incident details when the user goes back from step 2',
    { tag: '@defect', annotation: { type: 'defect', description: 'DEF-01: the incident date is blank after going back' } },
    async ({ claimantPage }) => {
      const wizard = new NewClaimPage(claimantPage);

      await wizard.goto();
      await wizard.fillIncidentDetails(VALID_DETAILS);
      await wizard.next();
      await wizard.back();

      await expect.soft(wizard.dateInput).toHaveValue(VALID_DETAILS.incidentDate);
      await expect.soft(wizard.locationInput).toHaveValue(VALID_DETAILS.incidentLocation);
      await expect.soft(wizard.amountInput).toHaveValue(String(VALID_DETAILS.claimAmount));
    },
  );
});
