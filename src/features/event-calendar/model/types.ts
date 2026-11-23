import { makeConverter, type Entity } from "../../../lib/model/converter";

/** Constrained set of event types (design D2). */
export const EVENT_TYPES = ["exam_board", "tournament", "master_class"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export function isEventType(value: string): value is EventType {
  return (EVENT_TYPES as readonly string[]).includes(value);
}

export interface CalendarEvent extends Entity {
  schoolId: string;
  /** Denormalized for rules/queries. */
  associationId: string;
  type: EventType;
  title: string;
  /** `YYYY-MM-DD`. */
  date: string;
}

export const eventConverter = makeConverter<CalendarEvent>();

export type EventErrorCode = "invalid-type" | "invalid-title" | "invalid-date" | "past-date";

/** A rejected event operation; `code` lets the UI show the right message. */
export class EventError extends Error {
  readonly code: EventErrorCode;

  constructor(code: EventErrorCode, message: string) {
    super(message);
    this.name = "EventError";
    this.code = code;
  }
}

/** Longest title the rules accept. */
export const EVENT_TITLE_MAX = 100;
