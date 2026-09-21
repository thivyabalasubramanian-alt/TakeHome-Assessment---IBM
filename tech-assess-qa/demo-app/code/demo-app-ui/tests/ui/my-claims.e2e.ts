import { expect, test } from '../support/fixtures';
import { formatUsd } from '../support/data/claim-builder';
import { MyClaimsPage } from '../support/pages/my-claims.page';

const CLAIM_ID_PREFIX_LENGTH = 8;
// A fixed past date, far from any month or year boundary.
const FIXED_INCIDENT_DATE = '2026-03-15';
const FIXED_INCIDENT_DATE_AS_DISPLAYED = 'Mar 15, 2026';
const TIME_ZONE_BEHIND_UTC = 'America/Los_Angeles';

test.describe('My Claims (UI)', () => {
  test('shows the full claim in a dialog that closes with Escape', async ({ claimantPage, claimantApi }) => {
    const claim = await claimantApi.createClaim();
    const myClaims = new MyClaimsPage(claimantPage);

    await myClaims.goto();
    await myClaims.rowContaining(claim.claimId.slice(0, CLAIM_ID_PREFIX_LENGTH)).viewDetailsButton.click();

    await expect(myClaims.detailDialog).toContainText(claim.claimId);
    await expect(myClaims.detailDialog).toContainText(claim.incidentLocation);
    await expect(myClaims.detailDialog).toContainText(claim.description);
    await expect(myClaims.detailDialog).toContainText(formatUsd(claim.claimAmount));

    await claimantPage.keyboard.press('Escape');
    await expect(myClaims.detailDialog).toBeHidden();
  });

  test(
    'shows the incident date as entered for users in a time zone behind UTC',
    { tag: '@defect', annotation: { type: 'suspected defect', description: 'S-11: date-only values are formatted in local time and may show one day early' } },
    async ({ openPage, claimantApi }) => {
      const claim = await claimantApi.createClaim({ incidentDate: FIXED_INCIDENT_DATE });
      const page = await openPage('claimant', { timezoneId: TIME_ZONE_BEHIND_UTC });
      const myClaims = new MyClaimsPage(page);

      await myClaims.goto();

      await expect(myClaims.rowContaining(claim.claimId.slice(0, CLAIM_ID_PREFIX_LENGTH)).root).toContainText(
        FIXED_INCIDENT_DATE_AS_DISPLAYED,
      );
    },
  );
});
