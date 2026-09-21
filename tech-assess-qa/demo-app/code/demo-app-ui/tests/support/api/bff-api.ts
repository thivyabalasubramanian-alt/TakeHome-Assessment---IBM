import { expect, type APIRequestContext, type APIResponse, type PlaywrightWorkerArgs } from '@playwright/test';
import { env, type Credentials } from '../config/env';
import { buildClaimRequest, type ClaimRequest } from '../data/claim-builder';
import type { ClaimStatus } from '../data/claim-status';
import type { NewUser } from '../data/user-builder';
import { HTTP } from './http-status';

type Playwright = PlaywrightWorkerArgs['playwright'];

const ACCESS_TOKEN_COOKIE = 'access_token';

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: 'CLAIMANT' | 'ADMIN';
}

export interface Claim {
  claimId: string;
  userId: string;
  incidentDate: string;
  incidentLocation: string;
  description: string;
  claimAmount: number;
  status: ClaimStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalClaims: number;
  claimsByStatus: Record<string, number>;
  cacheHit: boolean;
  queryTimeMs: number;
}

/** Asserts the status of a response and returns its parsed JSON body. */
export async function expectJson<T>(response: APIResponse, status: number = HTTP.OK): Promise<T> {
  const context = `${response.url()} -> ${response.status()} ${await response.text()}`;
  expect(response.status(), context).toBe(status);
  return (await response.json()) as T;
}

/** Registers a new account (no authentication needed). Returns the raw response. */
export function registerUser(anonymous: APIRequestContext, user: NewUser): Promise<APIResponse> {
  return anonymous.post('/api/auth/signup', {
    data: { name: user.name, email: user.email, password: user.password },
  });
}

/**
 * Authenticated client for the BFF. Signs in through the public login endpoint and
 * then sends the resulting access token as a Bearer header, which also keeps the
 * calls independent of the CSRF cookie the browser flow relies on.
 * Methods return the raw response so tests can assert status codes.
 */
export class BffApi {
  private constructor(
    private readonly http: APIRequestContext,
    readonly user: UserProfile,
  ) {}

  static async signIn(playwright: Playwright, credentials: Credentials): Promise<BffApi> {
    const anonymous = await playwright.request.newContext({ baseURL: env.bffUrl });
    try {
      const login = await anonymous.post('/api/auth/login', { data: credentials });
      const user = await expectJson<UserProfile>(login);
      const { cookies } = await anonymous.storageState();
      const token = cookies.find((cookie) => cookie.name === ACCESS_TOKEN_COOKIE)?.value;
      if (!token) {
        throw new Error(`Signing in as ${credentials.email} did not set the ${ACCESS_TOKEN_COOKIE} cookie`);
      }
      const http = await playwright.request.newContext({
        baseURL: env.bffUrl,
        extraHTTPHeaders: { Authorization: `Bearer ${token}` },
      });
      return new BffApi(http, user);
    } finally {
      await anonymous.dispose();
    }
  }

  submitClaim(request: ClaimRequest): Promise<APIResponse> {
    return this.http.post('/api/claims', { data: request });
  }

  /** Submits a valid generated claim and returns it; fails the test if not created. */
  async createClaim(overrides: Partial<ClaimRequest> = {}): Promise<Claim> {
    return expectJson<Claim>(await this.submitClaim(buildClaimRequest(overrides)), HTTP.CREATED);
  }

  listClaims(): Promise<APIResponse> {
    return this.http.get('/api/claims');
  }

  getClaim(claimId: string): Promise<APIResponse> {
    return this.http.get(`/api/claims/${claimId}`);
  }

  listAllClaims(): Promise<APIResponse> {
    return this.http.get('/api/admin/claims');
  }

  updateClaimStatus(claimId: string, newStatus: ClaimStatus): Promise<APIResponse> {
    return this.http.patch(`/api/admin/claims/${claimId}/status`, { data: { newStatus } });
  }

  getDashboardStats(bypassCache: boolean): Promise<APIResponse> {
    return this.http.get('/api/admin/dashboard/stats', { params: { bypassCache } });
  }

  /** Generic call, used to check the same rule across many endpoints. */
  send(method: 'GET' | 'PATCH' | 'POST', path: string, data?: unknown): Promise<APIResponse> {
    return this.http.fetch(path, { method, data });
  }

  dispose(): Promise<void> {
    return this.http.dispose();
  }
}
