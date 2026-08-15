import { orderBy, where } from "firebase/firestore";
import { createFirestoreRepository } from "../../../lib/repository";
import { COLLECTIONS } from "../../../lib/model/collections";
import {
  associationConverter,
  schoolConverter,
  sedeConverter,
  type Association,
  type School,
  type Sede,
} from "../model/types";

export const associationsRepo = createFirestoreRepository<Association>(
  COLLECTIONS.associations,
  associationConverter,
);

export const schoolsRepo = createFirestoreRepository<School>(
  COLLECTIONS.schools,
  schoolConverter,
);

export const sedesRepo = createFirestoreRepository<Sede>(
  COLLECTIONS.sedes,
  sedeConverter,
);

/** Schools within an association (association-scope users). */
export function listSchoolsByAssociation(associationId: string): Promise<School[]> {
  return schoolsRepo.list(where("associationId", "==", associationId), orderBy("name"));
}

/** Sedes (branches) of a school. */
export function listSedesBySchool(schoolId: string): Promise<Sede[]> {
  return sedesRepo.list(where("schoolId", "==", schoolId), orderBy("name"));
}
