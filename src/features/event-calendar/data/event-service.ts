/**
 * Event use cases (OpenSpec 9.1, 9.2, odd/tasks/event-calendar.md). Security
 * Rules enforce tenancy and the event shape; this service validates the type,
 * the title and the day before writing (S2, A3), and lists a school's
 * upcoming events by date, optionally of one type (S3, S4, A2).
 */
import type { School } from "../../school-management/model/types";
import {
  EVENT_TITLE_MAX,
  EventError,
  isEventType,
  type CalendarEvent,
  type EventType,
} from "../model/types";

/** Persistence port; the Firestore implementation lives in `./repository`. */
export interface EventStore {
  /** The school's events on or after `from` (`YYYY-MM-DD`), optionally of one type. */
  listFrom(schoolId: string, from: string, type?: EventType): Promise<CalendarEvent[]>;
  /** Stores a new event under a generated id (A4) and returns it. */
  create(value: Omit<CalendarEvent, "id">): Promise<CalendarEvent>;
}

export interface EventDeps {
  now(): Date;
}

/** What a user types to create an event; `type` is unchecked input. */
export interface EventInput {
  type: string;
  title: string;
  date: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The local calendar day of `date`, as `YYYY-MM-DD`. */
function dayOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** True for an existing calendar day written as `YYYY-MM-DD`. */
function isCalendarDay(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

const byDate = (a: CalendarEvent, b: CalendarEvent) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

export function createEventService(store: EventStore, deps: EventDeps) {
  const today = (): string => dayOf(deps.now());

  return {
    /** The device's current day, `YYYY-MM-DD`. */
    today,

    /** S3/S4/A2: the school's events from today on, ordered by date. */
    async listUpcoming(schoolId: string, type?: EventType): Promise<CalendarEvent[]> {
      const events = await store.listFrom(schoolId, today(), type);
      // `YYYY-MM-DD` strings compare in calendar order.
      return [...events].sort(byDate);
    },

    /** S1/S2/A3: creates an event in the school; invalid input stores nothing. */
    async createEvent(school: School, input: EventInput): Promise<CalendarEvent> {
      if (!isEventType(input.type)) {
        throw new EventError("invalid-type", `Invalid event type "${input.type}".`);
      }
      const title = input.title.trim();
      if (title.length === 0 || title.length > EVENT_TITLE_MAX) {
        throw new EventError("invalid-title", `The title must have 1 to ${EVENT_TITLE_MAX} characters.`);
      }
      if (!isCalendarDay(input.date)) {
        throw new EventError("invalid-date", `Invalid date "${input.date}": expected YYYY-MM-DD.`);
      }
      if (input.date < today()) {
        throw new EventError("past-date", `The date ${input.date} has already passed.`);
      }
      return store.create({
        schoolId: school.id,
        associationId: school.associationId,
        type: input.type,
        title,
        date: input.date,
      });
    },
  };
}

export type EventService = ReturnType<typeof createEventService>;
