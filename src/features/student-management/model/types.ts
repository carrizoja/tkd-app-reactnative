import { makeConverter, type Entity } from "../../../lib/model/converter";

export interface Student extends Entity {
  schoolId: string;
  /** Denormalized for rules/queries. */
  associationId: string;
  firstName: string;
  lastName: string;
  /** Lower-cased surname for case-insensitive prefix search. */
  lastNameLower: string;
  photoUrl?: string;
  /** Free-text belt/grade in the MVP (ITF Dan/Gup normalizable later). */
  beltGrade?: string;
  /** ISO `YYYY-MM-DD`. */
  birthDate?: string;
}

export interface StudentGroup extends Entity {
  schoolId: string;
  name: string;
  /** Membership as an array — intended for small groups. */
  memberIds: string[];
}

export const studentConverter = makeConverter<Student>();
export const studentGroupConverter = makeConverter<StudentGroup>();
