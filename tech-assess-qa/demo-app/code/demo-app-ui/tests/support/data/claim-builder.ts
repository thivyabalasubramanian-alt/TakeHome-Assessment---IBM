import { faker } from '@faker-js/faker';

export interface ClaimRequest {
  incidentDate: string;
  incidentLocation: string;
  description: string;
  claimAmount: number;
}

/** Business limits from the API contract (bff-api.yml / claims-api.yml). */
export const CLAIM_LIMITS = {
  amount: { min: 0.01, max: 1_000_000 },
  description: { min: 10, max: 1_000 },
  location: { min: 5, max: 200 },
} as const;

const MS_PER_DAY = 86_400_000;

/** ISO date (UTC, like the backend containers) offset from today: -1 = yesterday, +1 = tomorrow. */
export function isoDate(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * MS_PER_DAY).toISOString().slice(0, 10);
}

export function textOfLength(length: number): string {
  return 'a'.repeat(length);
}

/** Every generated description starts with a unique, searchable marker. */
export function buildClaimRequest(overrides: Partial<ClaimRequest> = {}): ClaimRequest {
  const marker = `PW-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`;
  return {
    incidentDate: isoDate(-1),
    incidentLocation: `${faker.location.streetAddress()}, ${faker.location.city()}`,
    description: `${marker} ${faker.lorem.sentence()}`,
    claimAmount: faker.number.float({ min: 100, max: 5_000, fractionDigits: 2 }),
    ...overrides,
  };
}

/** The unique marker at the start of a generated description (visible in list rows). */
export function claimMarker(claim: Pick<ClaimRequest, 'description'>): string {
  return claim.description.split(' ', 1)[0];
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
