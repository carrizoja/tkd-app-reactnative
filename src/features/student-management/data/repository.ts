import { orderBy, where } from "firebase/firestore";
import { createFirestoreRepository } from "../../../lib/repository";
import { COLLECTIONS } from "../../../lib/model/collections";
import { toLastNameLower } from "../../../lib/model/ids";
import {
  studentConverter,
  studentGroupConverter,
  type Student,
  type StudentGroup,
} from "../model/types";

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
