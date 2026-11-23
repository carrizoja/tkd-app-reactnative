import type { School } from "../../school-management/model/types";
import { EventError, type CalendarEvent, type EventType } from "../model/types";
import { createEventService, type EventStore } from "./event-service";

// `./repository` pulls in the Firebase SDK, which the jest-expo preset cannot
// transform. Every test injects an in-memory store instead.
jest.mock("./repository", () => ({}));

const NOW = new Date(2026, 10, 23, 15, 0); // 23/11/2026, local time
const TODAY = "2026-11-23";

const SCHOOL_A: School = { id: "a1", associationId: "assocA", name: "Escuela A" };
const SCHOOL_B: School = { id: "b1", associationId: "assocB", name: "Escuela B" };

const ev = (id: string, date: string, type: EventType = "tournament", schoolId = "a1"): CalendarEvent => ({
  id,
  schoolId,
  associationId: schoolId === "a1" ? "assocA" : "assocB",
  type,
  title: id,
  date,
});

function setup(seed: CalendarEvent[] = []) {
  const events = [...seed];
  let next = 0;
  const calls: { schoolId: string; from: string; type?: EventType }[] = [];
  const store: EventStore = {
    // Unordered on purpose: the service owns the order.
    listFrom: async (schoolId, from, type) => {
      calls.push({ schoolId, from, type });
      return events.filter((e) => e.schoolId === schoolId && e.date >= from && (!type || e.type === type)).reverse();
    },
    create: async (value) => {
      const created = { id: `gen-${++next}`, ...value };
      events.push(created);
      return created;
    },
  };
  const service = createEventService(store, { now: () => NOW });
  return { service, events, calls };
}

describe("createEvent", () => {
  it("S1: stores a tournament under the school, with its association, and lists it", async () => {
    const { service, events } = setup();

    const created = await service.createEvent(SCHOOL_A, { type: "tournament", title: "  Torneo Apertura ", date: "2026-12-05" });

    expect(created).toEqual({
      id: "gen-1",
      schoolId: "a1",
      associationId: "assocA",
      type: "tournament",
      title: "Torneo Apertura",
      date: "2026-12-05",
    });
    expect(events).toEqual([created]);
    expect(await service.listUpcoming("a1")).toEqual([created]);
  });

  it("S1/A4: two events with the same title and day are both kept", async () => {
    const { service, events } = setup();
    const input = { type: "exam_board", title: "Mesa", date: "2026-12-05" };

    await service.createEvent(SCHOOL_A, input);
    await service.createEvent(SCHOOL_A, input);

    expect(events).toHaveLength(2);
  });

  it("accepts every allowed type and today's date", async () => {
    const { service, events } = setup();
    for (const type of ["exam_board", "tournament", "master_class"]) {
      await service.createEvent(SCHOOL_A, { type, title: "Evento", date: TODAY });
    }
    expect(events.map((e) => e.type)).toEqual(["exam_board", "tournament", "master_class"]);
  });

  it("S2: rejects a type outside the allowed set and stores nothing", async () => {
    const { service, events } = setup();
    for (const type of ["birthday", "Tournament", ""]) {
      await expect(service.createEvent(SCHOOL_A, { type, title: "X", date: "2026-12-05" })).rejects.toMatchObject({
        code: "invalid-type",
      });
    }
    expect(events).toEqual([]);
  });

  it("A3: rejects an empty or too long title", async () => {
    const { service, events } = setup();
    for (const title of ["", "   ", "x".repeat(101)]) {
      await expect(service.createEvent(SCHOOL_A, { type: "tournament", title, date: "2026-12-05" })).rejects.toMatchObject({
        code: "invalid-title",
      });
    }
    await service.createEvent(SCHOOL_A, { type: "tournament", title: "x".repeat(100), date: "2026-12-05" });
    expect(events).toHaveLength(1);
  });

  it("A3: rejects a malformed or impossible date", async () => {
    const { service } = setup();
    for (const date of ["", "05/12/2026", "2026-12", "2026-13-01", "2026-02-30"]) {
      const result = service.createEvent(SCHOOL_A, { type: "tournament", title: "X", date });
      await expect(result).rejects.toBeInstanceOf(EventError);
      await expect(result).rejects.toMatchObject({ code: "invalid-date" });
    }
  });

  it("A2/A3: rejects a day before today", async () => {
    const { service, events } = setup();
    await expect(service.createEvent(SCHOOL_A, { type: "tournament", title: "X", date: "2026-11-22" })).rejects.toMatchObject({
      code: "past-date",
    });
    expect(events).toEqual([]);
  });
});

describe("listUpcoming", () => {
  const seed = [
    ev("past", "2026-11-22"),
    ev("today", TODAY, "master_class"),
    ev("dec", "2026-12-20", "exam_board"),
    ev("dec-early", "2026-12-01"),
    ev("jan", "2027-01-10", "exam_board"),
    ev("other-school", "2026-12-02", "exam_board", "b1"),
  ];

  it("S3/A2: lists the school's events from today on, ordered by date", async () => {
    const { service, calls } = setup(seed);

    const list = await service.listUpcoming("a1");

    expect(list.map((e) => e.id)).toEqual(["today", "dec-early", "dec", "jan"]);
    expect(calls).toEqual([{ schoolId: "a1", from: TODAY, type: undefined }]);
  });

  it("S4: shows only events of the chosen type", async () => {
    const { service, calls } = setup(seed);

    const list = await service.listUpcoming("a1", "exam_board");

    expect(list.map((e) => e.id)).toEqual(["dec", "jan"]);
    expect(calls).toEqual([{ schoolId: "a1", from: TODAY, type: "exam_board" }]);
  });

  it("S5: never returns another school's events", async () => {
    const { service } = setup(seed);
    expect((await service.listUpcoming(SCHOOL_B.id)).map((e) => e.id)).toEqual(["other-school"]);
  });
});
