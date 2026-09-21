import { expect, test } from '../support/fixtures';
import { REALTIME_TIMEOUT_MS } from '../support/config/env';
import { AdminClaimsPage } from '../support/pages/admin-claims.page';
import { AppShell, HOME_PAGE } from '../support/pages/app-shell.page';
import { LoginPage } from '../support/pages/login.page';
import { MyClaimsPage } from '../support/pages/my-claims.page';

const CLAIM_ID_PREFIX_LENGTH = 8;

// These tests cover the Kafka -> BFF -> WebSocket -> browser chain. The action that
// triggers the event is done through the API so the UI flows are not tested twice.
test.describe('Real-time updates (UI)', () => {
  test('shows a status change to the claim owner without a reload', { tag: '@smoke' }, async ({ claimantPage, seeder, adminApi }) => {
    const claim = await seeder.claimInStatus('SUBMITTED');
    const myClaims = new MyClaimsPage(claimantPage);
    await myClaims.goto();
    await new AppShell(claimantPage).waitUntilLive();
    const row = myClaims.rowContaining(claim.claimId.slice(0, CLAIM_ID_PREFIX_LENGTH));
    await expect(row.statusBadge('SUBMITTED')).toBeVisible();

    await adminApi.updateClaimStatus(claim.claimId, 'UNDER_REVIEW');

    await expect(row.statusBadge('UNDER_REVIEW')).toBeVisible({ timeout: REALTIME_TIMEOUT_MS });
  });

  test('shows a newly submitted claim to an admin without a reload', async ({ adminPage, claimantApi }) => {
    const adminClaims = new AdminClaimsPage(adminPage);
    await adminClaims.goto();
    await new AppShell(adminPage).waitUntilLive();

    const claim = await claimantApi.createClaim();

    await expect(adminClaims.rowFor(claim.claimId).root).toBeVisible({ timeout: REALTIME_TIMEOUT_MS });
  });

  test("does not deliver one claimant's claim events to another claimant", async ({
    openPage,
    otherClaimant,
    claimantApi,
    adminApi,
  }) => {
    const otherPage = await openPage();
    const receivedFrames: string[] = [];
    otherPage.on('websocket', (socket) =>
      socket.on('framereceived', (frame) => receivedFrames.push(String(frame.payload))),
    );
    const framesMentioning = (claimId: string): number =>
      receivedFrames.filter((frame) => frame.includes(claimId)).length;

    const loginPage = new LoginPage(otherPage);
    await loginPage.goto();
    await loginPage.logIn(otherClaimant.credentials);
    await expect(otherPage).toHaveURL(HOME_PAGE.claimant.path);
    await new AppShell(otherPage).waitUntilLive();

    const strangersClaim = await claimantApi.createClaim();
    const ownClaim = await otherClaimant.api.createClaim();
    await adminApi.updateClaimStatus(strangersClaim.claimId, 'UNDER_REVIEW');
    await adminApi.updateClaimStatus(ownClaim.claimId, 'UNDER_REVIEW');

    // Control: the other user's socket is alive and receives events about its own claim...
    await expect.poll(() => framesMentioning(ownClaim.claimId), { timeout: REALTIME_TIMEOUT_MS }).toBeGreaterThan(0);
    // ...and, by then, it must not have received anything about the stranger's claim.
    expect(framesMentioning(strangersClaim.claimId)).toBe(0);
  });
});
