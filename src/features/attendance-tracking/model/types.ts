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
