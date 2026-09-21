export const CLAIM_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'CLOSED',
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
};

/**
 * Independent oracle for the claim workflow (deliberately not imported from the
 * app). Derived from the current behaviour and the API contract; confirm with the
 * product owner, in particular UNDER_REVIEW -> SUBMITTED (a backward move).
 */
export const ALLOWED_TRANSITIONS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'SUBMITTED'],
  APPROVED: ['CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
};

/** Shortest legal path from a freshly submitted claim to each status. */
export const PATH_TO_STATUS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  SUBMITTED: [],
  UNDER_REVIEW: ['UNDER_REVIEW'],
  APPROVED: ['UNDER_REVIEW', 'APPROVED'],
  REJECTED: ['REJECTED'],
  CLOSED: ['REJECTED', 'CLOSED'],
};

export interface StatusPair {
  readonly from: ClaimStatus;
  readonly to: ClaimStatus;
}

/** Every (from, to) pair whose legality equals `allowed`. */
export function transitionPairs(allowed: boolean): StatusPair[] {
  return CLAIM_STATUSES.flatMap((from) =>
    CLAIM_STATUSES.filter((to) => ALLOWED_TRANSITIONS[from].includes(to) === allowed).map(
      (to) => ({ from, to }),
    ),
  );
}
