import { where } from "firebase/firestore";
import { createFirestoreRepository } from "../../../lib/repository";
import { COLLECTIONS } from "../../../lib/model/collections";
import { attendanceId, type DateString } from "../../../lib/model/ids";
import { attendanceConverter, type Attendance } from "../model/types";

export const attendanceRepo = createFirestoreRepository<Attendance>(
  COLLECTIONS.attendance,
  attendanceConverter,
);

/**
 * Upsert one student's mark for a class on a date. The deterministic id makes
 * re-marking the same day an update rather than a duplicate.
 */
export function markAttendance(input: {
  classId: string;
  studentId: string;
  date: DateString;
  present: boolean;
  schoolId: string;
}): Promise<void> {
  const id = attendanceId(input.classId, input.studentId, input.date);
  return attendanceRepo.set(id, input);
}

/** A class's attendance for a specific date. */
export function listAttendanceByDate(
  classId: string,
  date: DateString,
): Promise<Attendance[]> {
  return attendanceRepo.list(
    where("classId", "==", classId),
    where("date", "==", date),
  );
}
