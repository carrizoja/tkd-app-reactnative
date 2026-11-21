import { makeConverter, type Entity } from "../../../lib/model/converter";

export type ClassStatus = "active" | "inactive";

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** When a class meets: the same start and end time on every chosen day (A1). */
export interface ClassSchedule {
  /** Sorted, without repeats; at least one day. */
  days: Weekday[];
  /** 24-hour `HH:MM`. */
  start: string;
  /** 24-hour `HH:MM`, after `start`. */
  end: string;
}

export interface Class extends Entity {
  sedeId: string;
  schoolId: string;
  /** Denormalized for rules/queries. */
  associationId: string;
  name: string;
  schedule: ClassSchedule;
  /** Inactive classes keep their roster and history but leave active lists (S3). */
  status: ClassStatus;
}

/** Join document for the N—M student↔class relationship. */
export interface ClassEnrollment extends Entity {
  classId: string;
  studentId: string;
  /** Denormalized; enforces same-school enrollment in the rules. */
  schoolId: string;
}

export const classConverter = makeConverter<Class>();
export const classEnrollmentConverter = makeConverter<ClassEnrollment>();

/** What a user enters for a class; its school is fixed, its sede is picked. */
export interface ClassInput {
  name: string;
  schedule: ClassSchedule;
}

export type ClassErrorCode =
  /** A required field is blank or the schedule is malformed. */
  | "invalid-input"
  /** A class's sede, and its students, must belong to the class's school (S5). */
  | "not-same-school";

export class ClassError extends Error {
  readonly code: ClassErrorCode;

  constructor(code: ClassErrorCode, message: string) {
    super(message);
    this.name = "ClassError";
    this.code = code;
  }
}

/** Deterministic id, so enrolling a student twice rewrites one document (A3). */
export function enrollmentId(classId: string, studentId: string): string {
  return `${classId}_${studentId}`;
}
