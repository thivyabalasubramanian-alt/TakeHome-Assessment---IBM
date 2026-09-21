import { expect, test } from '../support/fixtures';
import { BffApi, expectJson, registerUser, type UserProfile } from '../support/api/bff-api';
import { HTTP } from '../support/api/http-status';
import { SEEDED_USERS, type Role } from '../support/config/env';
import { buildNewUser } from '../support/data/user-builder';

const EXPECTED_ROLE: Record<Role, UserProfile['role']> = { claimant: 'CLAIMANT', admin: 'ADMIN' };
const SEEDED_ROLES: Role[] = ['claimant', 'admin'];

test.describe('Authentication API', () => {
  for (const role of SEEDED_ROLES) {
    test(`signs in the seeded ${role} and returns their profile`, { tag: '@smoke' }, async ({ anonymousApi }) => {
      const response = await anonymousApi.post('/api/auth/login', { data: SEEDED_USERS[role] });

      const profile = await expectJson<UserProfile>(response);

      expect(profile).toMatchObject({ email: SEEDED_USERS[role].email, role: EXPECTED_ROLE[role] });
    });
  }

  test('rejects a wrong password with 401', async ({ anonymousApi }) => {
    const response = await anonymousApi.post('/api/auth/login', {
      data: { ...SEEDED_USERS.claimant, password: 'not-the-password' },
    });

    expect(response.status()).toBe(HTTP.UNAUTHORIZED);
  });

  const unauthenticatedRequests: { name: string; headers: Record<string, string> }[] = [
    { name: 'no token', headers: {} },
    { name: 'a malformed token', headers: { Authorization: 'Bearer not.a.jwt' } },
  ];
  for (const { name, headers } of unauthenticatedRequests) {
    test(`rejects a protected request that carries ${name} with 401`, async ({ anonymousApi }) => {
      const response = await anonymousApi.get('/api/claims', { headers });

      expect(response.status()).toBe(HTTP.UNAUTHORIZED);
    });
  }

  test('registers a new user who can then sign in as a claimant', async ({ playwright, anonymousApi }) => {
    const user = buildNewUser();

    const registration = await registerUser(anonymousApi, user);
    expect(registration.status()).toBe(HTTP.CREATED);

    const api = await BffApi.signIn(playwright, user);
    expect(api.user).toMatchObject({ email: user.email, role: 'CLAIMANT' });
    await api.dispose();
  });

  test('rejects registering an email address that already exists with 409', async ({ anonymousApi }) => {
    const duplicate = { ...buildNewUser(), email: SEEDED_USERS.claimant.email };

    const response = await registerUser(anonymousApi, duplicate);

    expect(response.status()).toBe(HTTP.CONFLICT);
  });
});
