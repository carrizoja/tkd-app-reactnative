import { doc, where, writeBatch } from "firebase/firestore";
import { getDb } from "../../../lib/firebase";
import { createFirestoreRepository } from "../../../lib/repository";
import { COLLECTIONS } from "../../../lib/model/collections";
import { classService } from "../../class-management/data/repository";
import { toIsoDate } from "../../student-management/ui/dates";
import { attendanceConverter, type Attendance } from "../model/types";
import { createAttendanceService, type AttendanceStore } from "./attendance-service";

export const attendanceRepo = createFirestoreRepository<Attendance>(
  COLLECTIONS.attendance,
  attendanceConverter,
);

// The rules decide attendance reads by `schoolId`, so every query filters on
// it. Equality-only filters need no composite index.
export const firestoreAttendanceStore: AttendanceStore = {
  listByClassAndDate: (schoolId, classId, date) =>
    attendanceRepo.list(
      where("schoolId", "==", schoolId),
      where("classId", "==", classId),
      where("date", "==", date),
    ),
  // One batch: a day's attendance either fully saves or changes nothing.
  async saveAll(records) {
    const batch = writeBatch(getDb());
    for (const record of records) {
      const ref = doc(getDb(), COLLECTIONS.attendance, record.id).withConverter(attendanceConverter);
      batch.set(ref, record);
    }
    await batch.commit();
  },
};

/** The app's attendance service, backed by Firestore. */
export const attendanceService = createAttendanceService(firestoreAttendanceStore, {
  listEnrolledStudentIds: (klass) => classService.listEnrolledStudentIds(klass),
  today: () => toIsoDate(new Date()),
});
