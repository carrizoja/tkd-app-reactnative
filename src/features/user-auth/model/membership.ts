import { makeConverter, type Entity } from "../../../lib/model/converter";

/**
 * Tenancy scope of a user (see design D3). Association-scope users see every
 * school in their association; school-scope users see only the schools listed
 * in `schoolIds`. The document id equals the Firebase Auth `uid`.
 */
export type MembershipScope = "association" | "school";

export interface Membership extends Entity {
  /** Equals the Firebase Auth uid. */
  id: string;
  scope: MembershipScope;
  /** Present when scope === "association". */
  associationId?: string;
  /** Present when scope === "school"; the schools this user may access. */
  schoolIds?: string[];
}

export const membershipConverter = makeConverter<Membership>();
