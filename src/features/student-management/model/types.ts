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
  /** ITF grade from `ITF_BELTS` (e.g. "8° Gup"); older records may hold free text. */
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

/** What a user enters for a student; empty optional fields mean "not set". */
export interface StudentInput {
  firstName: string;
  lastName: string;
  beltGrade?: string;
  /** ISO `YYYY-MM-DD`, or empty. */
  birthDate?: string;
}

export type GroupInput = Pick<StudentGroup, "name">;

/** A picked image, as returned by the device's image picker. */
export interface PhotoFile {
  uri: string;
  mimeType: string;
  /** Size in bytes, when the picker reports it. */
  fileSize?: number;
}

export type StudentErrorCode =
  /** A required field is blank or a value is malformed. */
  | "invalid-input"
  /** The picked file is not a supported image (JPEG, PNG, WebP, HEIC). */
  | "invalid-photo"
  /** The picked image is 5 MB or larger. */
  | "photo-too-large"
  /** A group can only hold students of its own school. */
  | "not-same-school";

export class StudentError extends Error {
  readonly code: StudentErrorCode;

  constructor(code: StudentErrorCode, message: string) {
    super(message);
    this.name = "StudentError";
    this.code = code;
    // Keeps `instanceof StudentError` working when the class is transpiled down.
    Object.setPrototypeOf(this, StudentError.prototype);
  }
}
