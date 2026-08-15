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
