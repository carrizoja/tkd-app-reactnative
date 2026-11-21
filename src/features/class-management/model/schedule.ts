/**
 * Weekly class schedules (A1): weekdays plus one start and end time.
 */
import { ClassError, type ClassSchedule, type Class, type Weekday } from "./types";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A 24-hour `HH:MM` time. */
export function isTime(value: string): boolean {
  return TIME_RE.test(value);
}

function isWeekday(value: unknown): value is Weekday {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 7;
}

/** Sorts and de-duplicates the days; rejects an empty, malformed or backwards schedule. */
export function normalizeSchedule(schedule: ClassSchedule): ClassSchedule {
  if (!schedule.days.every(isWeekday)) {
    throw new ClassError("invalid-input", "Schedule days must be weekdays 1 (Monday) to 7 (Sunday).");
  }
  const days = [...new Set(schedule.days)].sort((a, b) => a - b);
  if (days.length === 0) {
    throw new ClassError("invalid-input", "Pick at least one day for the class.");
  }
  if (!isTime(schedule.start) || !isTime(schedule.end)) {
    throw new ClassError("invalid-input", "Start and end must be HH:MM times.");
  }
  // Zero-padded HH:MM strings compare in time order.
  if (schedule.start >= schedule.end) {
    throw new ClassError("invalid-input", "The class must end after it starts.");
  }
  return { days, start: schedule.start, end: schedule.end };
}

/** Classes split by status (S3); each part keeps the given order. */
export function splitByStatus(classes: Class[]): { active: Class[]; inactive: Class[] } {
  return {
    active: classes.filter((c) => c.status === "active"),
    inactive: classes.filter((c) => c.status === "inactive"),
  };
}
