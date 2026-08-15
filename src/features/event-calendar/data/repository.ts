import { orderBy, where } from "firebase/firestore";
import { createFirestoreRepository } from "../../../lib/repository";
import { COLLECTIONS } from "../../../lib/model/collections";
import {
  eventConverter,
  isEventType,
  type CalendarEvent,
  type EventType,
} from "../model/types";

export const eventsRepo = createFirestoreRepository<CalendarEvent>(
  COLLECTIONS.events,
  eventConverter,
);

/** Create an event, rejecting any type outside the allowed set. */
export function createEvent(input: {
  schoolId: string;
  associationId: string;
  type: string;
  title: string;
  date: string;
}): Promise<void> {
  if (!isEventType(input.type)) {
    throw new Error(`Invalid event type "${input.type}"`);
  }
  const value: Omit<CalendarEvent, "id"> = {
    schoolId: input.schoolId,
    associationId: input.associationId,
    type: input.type,
    title: input.title,
    date: input.date,
  };
  // Auto-id: derive a stable-enough id from school/date/title is not required
  // here, so callers use the repository's set with a generated id. For the
  // foundation we expose the typed create; screen code will generate the id.
  const id = `${input.schoolId}_${input.date}_${input.title}`;
  return eventsRepo.set(id, value);
}

/** Upcoming events in a school ordered by date, optionally filtered by type. */
export function listEventsBySchool(
  schoolId: string,
  type?: EventType,
): Promise<CalendarEvent[]> {
  if (type) {
    return eventsRepo.list(
      where("schoolId", "==", schoolId),
      where("type", "==", type),
      orderBy("date"),
    );
  }
  return eventsRepo.list(where("schoolId", "==", schoolId), orderBy("date"));
}
