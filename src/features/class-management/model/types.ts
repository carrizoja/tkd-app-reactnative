import { makeConverter, type Entity } from "../../../lib/model/converter";

export type ClassStatus = "active" | "inactive";

export interface Class extends Entity {
  sedeId: string;
  schoolId: string;
  /** Denormalized for rules/queries. */
  associationId: string;
  name: string;
  /** Free-text schedule (e.g. "Mon/Wed 18:00"). */
  schedule: string;
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
