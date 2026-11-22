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

/** The ISO weekday (1 = Monday … 7 = Sunday) of a `YYYY-MM-DD` calendar day. */
function weekdayOf(isoDate: string): Weekday {
  const [year, month, day] = isoDate.split("-").map(Number);
  // UTC keeps the calendar day fixed whatever the device's time zone.
  return ((new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7 + 1) as Weekday;
}

/** Whether the class meets on a `YYYY-MM-DD` calendar day. */
export function meetsOn(schedule: ClassSchedule, isoDate: string): boolean {
  return schedule.days.includes(weekdayOf(isoDate));
}

/** The most recent `YYYY-MM-DD` day, `today` included, on which the class meets. */
export function lastClassDay(schedule: ClassSchedule, today: string): string {
  const [year, month, day] = today.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  // A valid schedule has at least one day, so a match is at most 6 days back.
  for (let back = 0; back < 7; back++) {
    const iso = cursor.toISOString().slice(0, 10);
    if (meetsOn(schedule, iso)) return iso;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return today;
}

/** Classes split by status (S3); each part keeps the given order. */
export function splitByStatus(classes: Class[]): { active: Class[]; inactive: Class[] } {
  return {
    active: classes.filter((c) => c.status === "active"),
    inactive: classes.filter((c) => c.status === "inactive"),
  };
}
