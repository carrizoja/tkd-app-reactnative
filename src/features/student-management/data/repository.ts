import {
  arrayRemove,
  arrayUnion,
  deleteField,
  doc,
  orderBy,
  updateDoc,
  where,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getDb, getFirebaseStorage } from "../../../lib/firebase";
import { createFirestoreRepository } from "../../../lib/repository";
import { COLLECTIONS } from "../../../lib/model/collections";
import { toLastNameLower } from "../../../lib/model/ids";
import {
  studentConverter,
  studentGroupConverter,
  type Student,
  type StudentGroup,
} from "../model/types";
import {
  createStudentService,
  type PhotoStore,
  type StudentPatch,
  type StudentStore,
} from "./student-service";

export const studentsRepo = createFirestoreRepository<Student>(
  COLLECTIONS.students,
  studentConverter,
);

export const studentGroupsRepo = createFirestoreRepository<StudentGroup>(
  COLLECTIONS.studentGroups,
  studentGroupConverter,
);

/** High Unicode sentinel used as the exclusive upper bound of a prefix range. */
const HIGH_SENTINEL = String.fromCharCode(0xf8ff);

/** All students of a school, ordered by surname. */
export function listStudentsBySchool(schoolId: string): Promise<Student[]> {
  return studentsRepo.list(
    where("schoolId", "==", schoolId),
    orderBy("lastNameLower"),
  );
}

/**
 * Case-insensitive surname prefix search. Firestore has no LIKE, so we use a
 * range over `lastNameLower`: `>= prefix` and `< prefix + <high sentinel>`, so
 * every surname starting with `prefix` falls inside the range.
 *
 * Not used by the screens: they filter the loaded list on the device so a
 * fragment can match anywhere in the name (odd/tasks/student-management.md A2).
 */
export function searchStudentsBySurname(
  schoolId: string,
  term: string,
): Promise<Student[]> {
  const prefix = toLastNameLower(term);
  return studentsRepo.list(
    where("schoolId", "==", schoolId),
    where("lastNameLower", ">=", prefix),
    where("lastNameLower", "<", prefix + HIGH_SENTINEL),
    orderBy("lastNameLower"),
  );
}

/** Turns `null` ("clear this field") into a Firestore field deletion. */
function toFirestorePatch(patch: StudentPatch) {
  return Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [key, value === null ? deleteField() : value]),
  );
}

const groupDoc = (id: string) => doc(getDb(), COLLECTIONS.studentGroups, id);

export const firestoreStudentStore: StudentStore = {
  listStudentsBySchool,
  getStudent: (id) => studentsRepo.getById(id),
  createStudent: (data) => studentsRepo.create(data),
  updateStudent: (id, patch) =>
    updateDoc(doc(getDb(), COLLECTIONS.students, id), toFirestorePatch(patch)),
  removeStudent: (id) => studentsRepo.remove(id),
  // The rules decide group reads by `schoolId`, so the query must filter on it.
  // Sorted here rather than with orderBy: a school has few groups, and this
  // needs no composite index.
  listGroupsBySchool: async (schoolId) =>
    (await studentGroupsRepo.list(where("schoolId", "==", schoolId))).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  createGroup: (data) => studentGroupsRepo.create(data),
  renameGroup: (id, name) => studentGroupsRepo.update(id, { name }),
  // arrayUnion/arrayRemove apply on the server, so two people editing the same
  // group at once never overwrite each other's member changes.
  addGroupMembers: (id, studentIds) => updateDoc(groupDoc(id), { memberIds: arrayUnion(...studentIds) }),
  removeGroupMember: (id, studentId) => updateDoc(groupDoc(id), { memberIds: arrayRemove(studentId) }),
  removeGroup: (id) => studentGroupsRepo.remove(id),
};

function storageErrorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
}

export const firebasePhotoStore: PhotoStore = {
  async upload(path, uri, contentType) {
    // React Native has no File API; `fetch` turns the picker's local URI into a Blob.
    const blob = await (await fetch(uri)).blob();
    const target = ref(getFirebaseStorage(), path);
    await uploadBytes(target, blob, { contentType });
    return getDownloadURL(target);
  },
  async remove(path) {
    try {
      await deleteObject(ref(getFirebaseStorage(), path));
    } catch (error) {
      if (storageErrorCode(error) !== "storage/object-not-found") {
        throw error;
      }
    }
  },
};

/** The app's student service, backed by Firestore and Firebase Storage. */
export const studentService = createStudentService(firestoreStudentStore, firebasePhotoStore);
