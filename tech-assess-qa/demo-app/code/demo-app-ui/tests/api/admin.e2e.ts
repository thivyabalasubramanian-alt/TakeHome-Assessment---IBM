import { randomUUID } from 'node:crypto';
import { expect, test } from '../support/fixtures';
import { expectJson, type Claim, type DashboardStats } from '../support/api/bff-api';
import { HTTP } from '../support/api/http-status';

interface AdminEndpoint {
  name: string;
  method: 'GET' | 'PATCH';
  path: string;
  data?: unknown;
}

const ADMIN_ENDPOINTS: AdminEndpoint[] = [
  { name: 'list all claims', method: 'GET', path: '/api/admin/claims' },
  { name: 'list users', method: 'GET', path: '/api/admin/users' },
  { name: 'read dashboard stats', method: 'GET', path: '/api/admin/dashboard/stats' },
  {
    name: 'change a claim status',
    method: 'PATCH',
    path: `/api/admin/claims/${randomUUID()}/status`,
    data: { newStatus: 'UNDER_REVIEW' },
  },
];

test.describe('Admin API', () => {
  for (const endpoint of ADMIN_ENDPOINTS) {
    test(`forbids a claimant from trying to ${endpoint.name} with 403`, async ({ claimantApi }) => {
      const response = await claimantApi.send(endpoint.method, endpoint.path, endpoint.data);

      expect(response.status()).toBe(HTTP.FORBIDDEN);
    });
  }

  test('lets an admin list claims from every claimant', async ({ adminApi, claimantApi, otherClaimant }) => {
    const [first, second] = await Promise.all([claimantApi.createClaim(), otherClaimant.api.createClaim()]);

    const allClaims = await expectJson<Claim[]>(await adminApi.listAllClaims());

    const ids = allClaims.map((claim) => claim.claimId);
    expect(ids).toEqual(expect.arrayContaining([first.claimId, second.claimId]));
  });

  test('includes new claims in the dashboard totals when the cache is bypassed', async ({ adminApi, claimantApi }) => {
    const before = await expectJson<DashboardStats>(await adminApi.getDashboardStats(true));

    await claimantApi.createClaim();

    const after = await expectJson<DashboardStats>(await adminApi.getDashboardStats(true));
    expect(after.totalClaims).toBeGreaterThanOrEqual(before.totalClaims + 1);
  });
});
