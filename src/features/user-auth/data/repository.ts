import { createFirestoreRepository } from "../../../lib/repository";
import { COLLECTIONS } from "../../../lib/model/collections";
import { membershipConverter, type Membership } from "../model/membership";

export const membershipsRepo = createFirestoreRepository<Membership>(
  COLLECTIONS.memberships,
  membershipConverter,
);

/** Load the current user's tenancy scope after login. */
export function getMembership(uid: string): Promise<Membership | null> {
  return membershipsRepo.getById(uid);
}
