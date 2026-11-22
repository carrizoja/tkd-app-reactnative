import { makeConverter, type Entity } from "../../../lib/model/converter";
import type { DateString } from "../../../lib/model/ids";

/**
 * One record per class/student/date. The document id is deterministic
 * (`${classId}_${studentId}_${date}`, see `attendanceId`) so re-marking the
 * same day updates the record instead of duplicating it.
 */
export interface Attendance extends Entity {
  classId: string;
  studentId: string;
  /** `YYYY-MM-DD`. */
  date: DateString;
  present: boolean;
  /** Denormalized for rules/queries. */
  schoolId: string;
}

export const attendanceConverter = makeConverter<Attendance>();

/** A day's marks, by student id: `true` is present, `false` absent. */
export type AttendanceMarks = Record<string, boolean>;

export type AttendanceErrorCode =
  | "invalid-date"
  /** Attendance cannot be taken for a day that has not happened yet (A2). */
  | "future-date"
  /** Attendance is only taken on the class's scheduled weekdays. */
  | "not-class-day"
  /** Inactive classes keep their history but take no new attendance (A2). */
  | "class-inactive"
  /** Only students enrolled in the class can be marked (S3). */
  | "not-enrolled"
  | "no-marks";

export class AttendanceError extends Error {
  readonly code: AttendanceErrorCode;

  constructor(code: AttendanceErrorCode, message: string) {
    super(message);
    this.name = "AttendanceError";
    this.code = code;
  }
}
