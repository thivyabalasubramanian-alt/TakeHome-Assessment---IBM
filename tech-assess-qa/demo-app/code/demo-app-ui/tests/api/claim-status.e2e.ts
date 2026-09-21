import { randomUUID } from 'node:crypto';
import { expect, test } from '../support/fixtures';
import { expectJson, type Claim } from '../support/api/bff-api';
import { HTTP } from '../support/api/http-status';
import { transitionPairs } from '../support/data/claim-status';

test.describe('Claim status workflow API', () => {
  test.describe('allowed transitions', () => {
    for (const { from, to } of transitionPairs(true)) {
      test(`${from} -> ${to} succeeds`, async ({ seeder, adminApi }) => {
        const claim = await seeder.claimInStatus(from);

        const updated = await expectJson<Claim>(await adminApi.updateClaimStatus(claim.claimId, to));

        expect(updated).toMatchObject({ claimId: claim.claimId, status: to });
      });
    }
  });

  test.describe(
    'forbidden transitions',
    { tag: '@defect', annotation: { type: 'suspected defect', description: 'S-02: claims-service has no handler for InvalidStatusTransitionException, so 500 is likely' } },
    () => {
      for (const { from, to } of transitionPairs(false)) {
        test(`${from} -> ${to} is rejected with 400`, async ({ seeder, adminApi }) => {
          const claim = await seeder.claimInStatus(from);

          const response = await adminApi.updateClaimStatus(claim.claimId, to);

          expect(response.status()).toBe(HTTP.BAD_REQUEST);
        });
      }
    },
  );

  test('persists the new status so the claim owner sees it', async ({ seeder, adminApi, claimantApi }) => {
    const claim = await seeder.claimInStatus('SUBMITTED');

    await expectJson<Claim>(await adminApi.updateClaimStatus(claim.claimId, 'UNDER_REVIEW'));

    const reloaded = await expectJson<Claim>(await claimantApi.getClaim(claim.claimId));
    expect(reloaded.status).toBe('UNDER_REVIEW');
    expect(Date.parse(reloaded.updatedAt)).toBeGreaterThanOrEqual(Date.parse(claim.updatedAt));
  });

  test('returns 404 when the claim does not exist', async ({ adminApi }) => {
    const response = await adminApi.updateClaimStatus(randomUUID(), 'UNDER_REVIEW');

    expect(response.status()).toBe(HTTP.NOT_FOUND);
  });
});
