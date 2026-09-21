import { expect, test } from '../support/fixtures';
import { expectJson, type Claim } from '../support/api/bff-api';
import { HTTP } from '../support/api/http-status';
import {
  buildClaimRequest,
  CLAIM_LIMITS,
  isoDate,
  textOfLength,
  type ClaimRequest,
} from '../support/data/claim-builder';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ClaimCase {
  name: string;
  overrides: Partial<ClaimRequest>;
  /** Set when the case is expected to expose a suspected defect (see tests/README.md). */
  suspectedDefect?: string;
}

const ACCEPTED_AT_THE_LIMIT: ClaimCase[] = [
  { name: 'the minimum amount', overrides: { claimAmount: CLAIM_LIMITS.amount.min } },
  { name: 'the maximum amount', overrides: { claimAmount: CLAIM_LIMITS.amount.max } },
  { name: "today's incident date", overrides: { incidentDate: isoDate(0) } },
  { name: 'the shortest description', overrides: { description: textOfLength(CLAIM_LIMITS.description.min) } },
  { name: 'the shortest location', overrides: { incidentLocation: textOfLength(CLAIM_LIMITS.location.min) } },
];

const REJECTED_JUST_OUTSIDE: ClaimCase[] = [
  { name: 'a zero amount', overrides: { claimAmount: 0 } },
  { name: 'a negative amount', overrides: { claimAmount: -5 } },
  { name: 'an amount above the maximum', overrides: { claimAmount: CLAIM_LIMITS.amount.max + 0.01 } },
  { name: 'a description one character too short', overrides: { description: textOfLength(CLAIM_LIMITS.description.min - 1) } },
  { name: 'a location one character too short', overrides: { incidentLocation: textOfLength(CLAIM_LIMITS.location.min - 1) } },
  {
    name: 'an incident date in the future',
    overrides: { incidentDate: isoDate(1) },
    suspectedDefect: 'S-03: business-rule failure may surface as 500 instead of 400',
  },
  {
    name: 'a description that is too short once trimmed',
    overrides: { description: `${' '.repeat(CLAIM_LIMITS.description.min)}abc` },
    suspectedDefect: 'S-03: passes the API length check, fails the domain check after trimming',
  },
  {
    // Assumption: the UI declares step="0.01", so amounts are meant to be whole cents.
    // Confirm the rule with the product owner.
    name: 'an amount with fractions of a cent',
    overrides: { claimAmount: 10.555 },
    suspectedDefect: 'S-01: accepted and silently rounded by DECIMAL(12,2)',
  },
];

test.describe('Claim submission API', () => {
  test('creates a claim in SUBMITTED status owned by the caller', { tag: '@smoke' }, async ({ claimantApi }) => {
    const request = buildClaimRequest();

    const claim = await expectJson<Claim>(await claimantApi.submitClaim(request), HTTP.CREATED);

    expect(claim).toMatchObject({ ...request, status: 'SUBMITTED', userId: claimantApi.user.userId });
    expect(claim.claimId).toMatch(UUID_PATTERN);
  });

  test.describe('accepts values at the limits', () => {
    for (const { name, overrides } of ACCEPTED_AT_THE_LIMIT) {
      test(`accepts ${name}`, async ({ claimantApi }) => {
        const response = await claimantApi.submitClaim(buildClaimRequest(overrides));

        expect(response.status()).toBe(HTTP.CREATED);
      });
    }
  });

  test.describe('rejects values just outside the limits', () => {
    for (const { name, overrides, suspectedDefect } of REJECTED_JUST_OUTSIDE) {
      test(
        `rejects ${name} with 400`,
        { tag: suspectedDefect ? '@defect' : [], annotation: suspectedDefect ? { type: 'suspected defect', description: suspectedDefect } : [] },
        async ({ claimantApi }) => {
          const response = await claimantApi.submitClaim(buildClaimRequest(overrides));

          expect(response.status()).toBe(HTTP.BAD_REQUEST);
        },
      );
    }
  });
});
