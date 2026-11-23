import { orderBy, where } from "firebase/firestore";
import { createFirestoreRepository } from "../../../lib/repository";
import { COLLECTIONS } from "../../../lib/model/collections";
import { eventConverter, type CalendarEvent } from "../model/types";
import { createEventService, type EventStore } from "./event-service";

export const eventsRepo = createFirestoreRepository<CalendarEvent>(
  COLLECTIONS.events,
  eventConverter,
);

// The rules decide event reads by `schoolId`, so every query filters on it
// (the `schoolId + date` and `schoolId + type + date` indexes are in
// firestore.indexes.json).
export const firestoreEventStore: EventStore = {
  listFrom: (schoolId, from, type) =>
    type
      ? eventsRepo.list(where("schoolId", "==", schoolId), where("type", "==", type), where("date", ">=", from), orderBy("date"))
      : eventsRepo.list(where("schoolId", "==", schoolId), where("date", ">=", from), orderBy("date")),
  create: (value) => eventsRepo.create(value),
};

/** The app's event service, backed by Firestore. */
export const eventService = createEventService(firestoreEventStore, { now: () => new Date() });
