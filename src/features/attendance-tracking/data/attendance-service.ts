/**
 * Attendance use cases (OpenSpec 7.2, odd/tasks/attendance-tracking.md).
 * Security Rules enforce tenancy, the deterministic id and a same-school
 * class; this service validates the date, keeps to the enrolled students
 * (S3) and saves a whole day at once (A1).
 */
import type { Class } from "../../class-management/model/types";
import { attendanceId, type DateString } from "../../../lib/model/ids";
import { AttendanceError, type Attendance, type AttendanceMarks } from "../model/types";

/** Persistence port; the Firestore implementation lives in `./repository`. */
export interface AttendanceStore {
  /** `schoolId` is required because the rules scope reads by it. */
  listByClassAndDate(schoolId: string, classId: string, date: DateString): Promise<Attendance[]>;
  /** Writes the records under their deterministic ids, all or none. */
  saveAll(records: Attendance[]): Promise<void>;
}

export interface AttendanceDeps {
  /** The class's enrolled student ids (the class service's roster). */
  listEnrolledStudentIds(klass: Class): Promise<string[]>;
  /** The device's local calendar day, `YYYY-MM-DD`. */
  today(): DateString;
}

/** A class's attendance on one date. */
export interface AttendanceDay {
  /** False when no attendance was taken that date (S5). */
  recorded: boolean;
  /** Saved marks by student id, including students no longer enrolled (A4). */
  marks: AttendanceMarks;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function requireDate(date: string): void {
  if (!DATE_RE.test(date)) {
    throw new AttendanceError("invalid-date", `Invalid date "${date}": expected YYYY-MM-DD.`);
  }
}

export function createAttendanceService(store: AttendanceStore, deps: AttendanceDeps) {
  return {
    /** S4/S5: the saved marks of a class on a date. */
    async getDay(klass: Class, date: DateString): Promise<AttendanceDay> {
      requireDate(date);
      const records = await store.listByClassAndDate(klass.schoolId, klass.id, date);
      const marks: AttendanceMarks = {};
      for (const r of records) marks[r.studentId] = r.present;
      return { recorded: records.length > 0, marks };
    },

    /**
     * S1–S3: saves one record per marked student, all at once. Re-marking a
     * day rewrites the same records (deterministic ids). Every marked student
     * must be enrolled in the class; otherwise nothing is saved.
     */
    async takeAttendance(klass: Class, date: DateString, marks: AttendanceMarks): Promise<void> {
      requireDate(date);
      // `YYYY-MM-DD` strings compare in calendar order.
      if (date > deps.today()) {
        throw new AttendanceError("future-date", `Attendance cannot be taken for ${date} yet.`);
      }
      if (klass.status !== "active") {
        throw new AttendanceError("class-inactive", `Class ${klass.id} is inactive.`);
      }
      const studentIds = Object.keys(marks);
      if (studentIds.length === 0) {
        throw new AttendanceError("no-marks", "There are no students to mark.");
      }
      const enrolled = new Set(await deps.listEnrolledStudentIds(klass));
      const outsider = studentIds.find((id) => !enrolled.has(id));
      if (outsider) {
        throw new AttendanceError("not-enrolled", `Student ${outsider} is not enrolled in class ${klass.id}.`);
      }
      await store.saveAll(
        studentIds.map((studentId) => ({
          id: attendanceId(klass.id, studentId, date),
          classId: klass.id,
          studentId,
          date,
          present: marks[studentId],
          schoolId: klass.schoolId,
        })),
      );
    },
  };
}

export type AttendanceService = ReturnType<typeof createAttendanceService>;
