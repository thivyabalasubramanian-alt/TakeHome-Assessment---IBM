import { PATH_TO_STATUS, type ClaimStatus } from '../data/claim-status';
import type { ClaimRequest } from '../data/claim-builder';
import { expectJson, type BffApi, type Claim } from './bff-api';

/** Creates test data through the API so UI tests do not repeat setup journeys. */
export class ClaimSeeder {
  constructor(
    private readonly claimant: BffApi,
    private readonly admin: BffApi,
  ) {}

  /** A new claim, walked through the shortest legal path to `status`. */
  async claimInStatus(status: ClaimStatus, overrides: Partial<ClaimRequest> = {}): Promise<Claim> {
    const claim = await this.claimant.createClaim(overrides);
    for (const step of PATH_TO_STATUS[status]) {
      await expectJson<Claim>(await this.admin.updateClaimStatus(claim.claimId, step));
    }
    return expectJson<Claim>(await this.claimant.getClaim(claim.claimId));
  }
}
