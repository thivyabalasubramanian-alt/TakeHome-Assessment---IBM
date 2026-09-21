import path from 'node:path';

export type Role = 'claimant' | 'admin';

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

export const env = {
  uiUrl: process.env.UI_URL ?? 'http://localhost:3001',
  bffUrl: process.env.BFF_URL ?? 'http://localhost:8090',
} as const;

/** Accounts created by the Keycloak realm import (docker/compose/keycloak/demo-app-realm.json). */
export const SEEDED_USERS: Record<Role, Credentials> = {
  claimant: { email: 'claimant@demo.com', password: 'Claimant123!' },
  admin: { email: 'admin@demo.com', password: 'Admin123!' },
};

const AUTH_DIR = path.resolve(__dirname, '../../.auth');

/** Browser sessions written by tests/setup/auth.setup.ts (git-ignored: they contain tokens). */
export const AUTH_STATE_FILE: Record<Role, string> = {
  claimant: path.join(AUTH_DIR, 'claimant.json'),
  admin: path.join(AUTH_DIR, 'admin.json'),
};

/** How long to wait for an event to travel Kafka -> BFF -> WebSocket -> UI. */
export const REALTIME_TIMEOUT_MS = 15_000;
