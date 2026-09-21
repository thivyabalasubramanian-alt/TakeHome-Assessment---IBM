import { faker } from '@faker-js/faker';
import type { Credentials } from '../config/env';

export interface NewUser extends Credentials {
  readonly name: string;
}

/** A unique, policy-compliant account (8+ chars, an uppercase letter and a digit). */
export function buildNewUser(): NewUser {
  const suffix = faker.string.alphanumeric({ length: 10, casing: 'lower' });
  return {
    name: `Playwright ${suffix}`,
    email: `pw.${suffix}@example.com`,
    password: `Passw0rd-${suffix}`,
  };
}
