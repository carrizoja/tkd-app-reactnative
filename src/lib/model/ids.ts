/**
 * Deterministic document-id builders. Using a derived id gives Firestore
 * create-or-update (upsert) semantics without a read-modify-write race:
 *  - attendance: one record per class/student/date (re-marking updates it)
 *  - payments:   one cuota per student/period (no duplicate month payments)
 */

/** A calendar date in `YYYY-MM-DD` form (used by attendance). */
export type DateString = string;

/** A billing period in `YYYY-MM` form (used by payments). */
export type PeriodString = string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_RE = /^\d{4}-\d{2}$/;

export function assertDateString(date: string): asserts date is DateString {
  if (!DATE_RE.test(date)) {
    throw new Error(`Invalid date "${date}": expected YYYY-MM-DD`);
  }
}

export function assertPeriodString(period: string): asserts period is PeriodString {
  if (!PERIOD_RE.test(period)) {
    throw new Error(`Invalid period "${period}": expected YYYY-MM`);
  }
}

/** `${classId}_${studentId}_${date}` */
export function attendanceId(
  classId: string,
  studentId: string,
  date: DateString,
): string {
  assertDateString(date);
  return `${classId}_${studentId}_${date}`;
}

/** `${studentId}_${period}` */
export function paymentId(studentId: string, period: PeriodString): string {
  assertPeriodString(period);
  return `${studentId}_${period}`;
}

/** Lower-cased surname used for case-insensitive prefix search. */
export function toLastNameLower(lastName: string): string {
  return lastName.trim().toLowerCase();
}
