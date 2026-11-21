import { doc, where, writeBatch } from "firebase/firestore";
import { getDb } from "../../../lib/firebase";
import { createFirestoreRepository } from "../../../lib/repository";
import { COLLECTIONS } from "../../../lib/model/collections";
import {
  classConverter,
  classEnrollmentConverter,
  type Class,
  type ClassEnrollment,
} from "../model/types";
import { createClassService, type ClassStore } from "./class-service";

export const classesRepo = createFirestoreRepository<Class>(
  COLLECTIONS.classes,
  classConverter,
);

export const classEnrollmentsRepo = createFirestoreRepository<ClassEnrollment>(
  COLLECTIONS.classEnrollments,
  classEnrollmentConverter,
);

// The rules decide class and enrollment reads by `schoolId`, so every query
// filters on it. Equality-only filters need no composite index.
export const firestoreClassStore: ClassStore = {
  listClassesBySchool: (schoolId) => classesRepo.list(where("schoolId", "==", schoolId)),
  getClass: (id) => classesRepo.getById(id),
  createClass: (data) => classesRepo.create(data),
  updateClass: (id, patch) => classesRepo.update(id, patch),
  removeClass: (id) => classesRepo.remove(id),
  listEnrollments: (schoolId, classId) =>
    classEnrollmentsRepo.list(where("schoolId", "==", schoolId), where("classId", "==", classId)),
  // One batch: enrolling several students either fully succeeds or changes nothing.
  async addEnrollments(enrollments) {
    const batch = writeBatch(getDb());
    for (const enrollment of enrollments) {
      const ref = doc(getDb(), COLLECTIONS.classEnrollments, enrollment.id).withConverter(classEnrollmentConverter);
      batch.set(ref, enrollment);
    }
    await batch.commit();
  },
  removeEnrollment: (id) => classEnrollmentsRepo.remove(id),
};

/** The app's class service, backed by Firestore. */
export const classService = createClassService(firestoreClassStore);
