import { randomUUID } from 'node:crypto';
import { expect, test } from '../support/fixtures';
import { expectJson, type Claim } from '../support/api/bff-api';
import { HTTP } from '../support/api/http-status';

const claimIds = (claims: Claim[]): string[] => claims.map((claim) => claim.claimId);

test.describe('Claim access API', () => {
  test('lists a claim for its owner and for nobody else', { tag: '@smoke' }, async ({ claimantApi, otherClaimant }) => {
    const claim = await claimantApi.createClaim();

    const ownerClaims = await expectJson<Claim[]>(await claimantApi.listClaims());
    const strangerClaims = await expectJson<Claim[]>(await otherClaimant.api.listClaims());

    expect(claimIds(ownerClaims)).toContain(claim.claimId);
    expect(claimIds(strangerClaims)).not.toContain(claim.claimId);
  });

  test('returns a claim to its owner by id', async ({ claimantApi }) => {
    const claim = await claimantApi.createClaim();

    const fetched = await expectJson<Claim>(await claimantApi.getClaim(claim.claimId));

    expect(fetched).toMatchObject({
      claimId: claim.claimId,
      userId: claimantApi.user.userId,
      status: 'SUBMITTED',
    });
  });

  test(
    'refuses to show a claim to a different claimant with 403',
    { tag: '@defect', annotation: { type: 'suspected defect', description: 'S-04: BFF may return 500 for a downstream 403' } },
    async ({ claimantApi, otherClaimant }) => {
      const claim = await claimantApi.createClaim();

      const response = await otherClaimant.api.getClaim(claim.claimId);

      expect(response.status()).toBe(HTTP.FORBIDDEN);
    },
  );

  test(
    'returns 404 for a claim id that does not exist',
    { tag: '@defect', annotation: { type: 'suspected defect', description: 'S-04: BFF may return 500 for a downstream 404' } },
    async ({ claimantApi }) => {
      const response = await claimantApi.getClaim(randomUUID());

      expect(response.status()).toBe(HTTP.NOT_FOUND);
    },
  );
});
