/**
 * Loads the signed-in user's tenancy scope (task 3.5, design D3).
 *
 * Kept separate from `auth-service.ts` because scope lives in Firestore, not in
 * Firebase Auth: it must be re-read whenever a session starts, including the
 * session restored from storage on app launch — not only after an explicit
 * login.
 */
import { resolveScope, SCOPE_UNAVAILABLE, type UserScope } from "../model/scope";
import type { Membership } from "../model/membership";
import { getMembership } from "./repository";

/** Injectable for tests; defaults to the Firestore-backed read. */
export type FetchMembership = (uid: string) => Promise<Membership | null>;

/**
 * Resolve `uid`'s scope. Fails closed and never rejects, so callers cannot
 * accidentally stay permissive by forgetting a `catch`:
 *  - no/!malformed membership document -> `unassigned` (wait for an admin)
 *  - failed or denied read             -> `unavailable` (worth retrying)
 */
export async function loadUserScope(
  uid: string,
  fetchMembership: FetchMembership = getMembership,
): Promise<UserScope> {
  try {
    return resolveScope(await fetchMembership(uid));
  } catch (error) {
    // Fail closed, but never silently: both outcomes render an empty app, and
    // without this line a broken read is invisible in the field.
    console.warn(`Could not read membership for ${uid}; scope unavailable.`, error);
    return SCOPE_UNAVAILABLE;
  }
}
