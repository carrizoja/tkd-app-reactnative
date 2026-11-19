/**
 * Scope resolution (design D3). Turns the raw `memberships/{uid}` document into
 * the tenancy scope the app reasons about, so screens never branch on the
 * membership's optional fields themselves.
 *
 * This mirrors — it does not replace — the Firestore Security Rules. The rules
 * are the enforcement boundary; this model exists so the UI can hide what the
 * server would deny anyway, and so a missing/!malformed membership fails closed.
 */
import type { Membership } from "./membership";

export type UserScope =
  /** Sees every school in `associationId` (association president). */
  | { kind: "association"; associationId: string }
  /** Sees only the schools in `schoolIds` (single-school instructor). */
  | { kind: "school"; schoolIds: string[] }
  /**
   * Authenticated but not yet granted any tenancy: no membership document, or
   * one that is missing the fields its scope requires. Grants nothing. The
   * user must wait for an administrator to assign them — retrying is pointless.
   */
  | { kind: "unassigned" }
  /**
   * The membership could not be read (offline, denied, backend error). Grants
   * nothing either, but is deliberately distinct from `unassigned`: the user
   * may well have a valid membership, so the UI should offer a retry rather
   * than tell them to contact an administrator.
   */
  | { kind: "unavailable" };

/** Grants nothing; the user is waiting on an administrator. */
export const SCOPE_UNASSIGNED: UserScope = { kind: "unassigned" };

/** Grants nothing; the read failed and is worth retrying. */
export const SCOPE_UNAVAILABLE: UserScope = { kind: "unavailable" };

const UNASSIGNED = SCOPE_UNASSIGNED;

/** Resolve a user's scope from their membership document, failing closed. */
export function resolveScope(membership: Membership | null): UserScope {
  if (membership === null) {
    return UNASSIGNED;
  }

  switch (membership.scope) {
    case "association":
      return membership.associationId
        ? { kind: "association", associationId: membership.associationId }
        : UNASSIGNED;
    case "school": {
      const schoolIds = membership.schoolIds ?? [];
      return schoolIds.length > 0 ? { kind: "school", schoolIds } : UNASSIGNED;
    }
    default:
      return UNASSIGNED;
  }
}

/** The tenancy coordinates every scoped document carries (see design D2). */
export interface SchoolRef {
  schoolId: string;
  associationId: string;
}

/** Whether `scope` may read a school's data. */
export function canAccessSchool(scope: UserScope, target: SchoolRef): boolean {
  switch (scope.kind) {
    case "association":
      return scope.associationId === target.associationId;
    case "school":
      return scope.schoolIds.includes(target.schoolId);
    case "unassigned":
    case "unavailable":
      return false;
  }
}

/**
 * Whether the scope grants access to any tenant data at all. Authenticated is
 * not the same as authorized: a signed-in user with no usable membership must
 * be kept out of the capability screens.
 */
export function hasTenancy(scope: UserScope): boolean {
  return scope.kind === "association" || scope.kind === "school";
}
