import { limit, orderBy, where } from "firebase/firestore";
import { createFirestoreRepository } from "../../../lib/repository";
import { COLLECTIONS } from "../../../lib/model/collections";
import { classConverter, type Class } from "../../class-management/model/types";
import {
  associationConverter,
  schoolConverter,
  sedeConverter,
  type Association,
  type School,
  type Sede,
} from "../model/types";
import { createSchoolService, type SchoolStore } from "./school-service";

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

const classesRepo = createFirestoreRepository<Class>(COLLECTIONS.classes, classConverter);

/** Schools within an association (association-scope users). */
export function listSchoolsByAssociation(associationId: string): Promise<School[]> {
  return schoolsRepo.list(where("associationId", "==", associationId), orderBy("name"));
}

/** Sedes (branches) of a school. */
export function listSedesBySchool(schoolId: string): Promise<Sede[]> {
  return sedesRepo.list(where("schoolId", "==", schoolId), orderBy("name"));
}

/**
 * Whether any class still belongs to the sede. Filters on `schoolId` too:
 * the rules decide class reads by `schoolId`, so a query without it is denied.
 */
async function sedeHasClasses(sede: Pick<Sede, "id" | "schoolId">): Promise<boolean> {
  const classes = await classesRepo.list(
    where("schoolId", "==", sede.schoolId),
    where("sedeId", "==", sede.id),
    limit(1),
  );
  return classes.length > 0;
}

export const firestoreSchoolStore: SchoolStore = {
  getSchool: (id) => schoolsRepo.getById(id),
  listSchoolsByAssociation,
  createSchool: (data) => schoolsRepo.create(data),
  updateSchool: (id, patch) => schoolsRepo.update(id, patch),
  removeSchool: (id) => schoolsRepo.remove(id),
  listSedesBySchool,
  createSede: (data) => sedesRepo.create(data),
  updateSede: (id, patch) => sedesRepo.update(id, patch),
  removeSede: (id) => sedesRepo.remove(id),
  sedeHasClasses,
};

/** The app's school service, backed by Firestore. */
export const schoolService = createSchoolService(firestoreSchoolStore);
