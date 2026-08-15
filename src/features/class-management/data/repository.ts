import { where } from "firebase/firestore";
import { createFirestoreRepository } from "../../../lib/repository";
import { COLLECTIONS } from "../../../lib/model/collections";
import {
  classConverter,
  classEnrollmentConverter,
  type Class,
  type ClassEnrollment,
} from "../model/types";

export const classesRepo = createFirestoreRepository<Class>(
  COLLECTIONS.classes,
  classConverter,
);

export const classEnrollmentsRepo = createFirestoreRepository<ClassEnrollment>(
  COLLECTIONS.classEnrollments,
  classEnrollmentConverter,
);

/** Active classes of a school. */
export function listActiveClasses(schoolId: string): Promise<Class[]> {
  return classesRepo.list(
    where("schoolId", "==", schoolId),
    where("status", "==", "active"),
  );
}

/** Enrollment join docs for a class (its roster). */
export function listEnrollmentsByClass(classId: string): Promise<ClassEnrollment[]> {
  return classEnrollmentsRepo.list(where("classId", "==", classId));
}
