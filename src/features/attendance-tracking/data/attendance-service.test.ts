import type { Class } from "../../class-management/model/types";
import { AttendanceError, type Attendance } from "../model/types";
import { createAttendanceService, type AttendanceStore } from "./attendance-service";

// `./repository` pulls in the Firebase SDK, which the jest-expo preset cannot
// transform. Every test injects an in-memory store instead.
jest.mock("./repository", () => ({}));

const TODAY = "2026-11-21";

const klass = (overrides: Partial<Class> = {}): Class => ({
  id: "cls-1",
  sedeId: "sede-centro",
  schoolId: "a1",
  associationId: "assocA",
  name: "Infantiles",
  schedule: { days: [1, 3, 5], start: "18:00", end: "19:30" },
  status: "active",
  ...overrides,
});

const record = (studentId: string, date: string, present: boolean, classId = "cls-1", schoolId = "a1"): Attendance => ({
  id: `${classId}_${studentId}_${date}`,
  classId,
  studentId,
  date,
  present,
  schoolId,
});

function setup(seed: { records?: Attendance[]; enrolled?: string[] } = {}) {
  const records = new Map((seed.records ?? []).map((r) => [r.id, r]));
  const saves: Attendance[][] = [];
  const store: AttendanceStore = {
    listByClassAndDate: async (schoolId, classId, date) =>
      [...records.values()].filter((r) => r.schoolId === schoolId && r.classId === classId && r.date === date),
    saveAll: async (list) => {
      saves.push(list);
      for (const r of list) records.set(r.id, r);
    },
  };
  const enrolled = seed.enrolled ?? ["stu-ana", "stu-beto"];
  const service = createAttendanceService(store, {
    listEnrolledStudentIds: async () => enrolled,
    today: () => TODAY,
  });
  return { service, records, saves };
}

describe("takeAttendance", () => {
  it("S1: stores one record per marked student for the class and date", async () => {
    const { service, records, saves } = setup();

    await service.takeAttendance(klass(), TODAY, { "stu-ana": true, "stu-beto": false });

    expect(saves).toHaveLength(1);
    expect([...records.values()]).toEqual([
      record("stu-ana", TODAY, true),
      record("stu-beto", TODAY, false),
    ]);
  });

  it("S2: re-marking a recorded day updates the existing records instead of adding new ones", async () => {
    const { service, records } = setup({ records: [record("stu-ana", TODAY, true), record("stu-beto", TODAY, true)] });

    await service.takeAttendance(klass(), TODAY, { "stu-ana": true, "stu-beto": false });

    expect(records.size).toBe(2);
    expect(records.get(`cls-1_stu-beto_${TODAY}`)?.present).toBe(false);
  });

  it("S3: rejects a mark for a student who is not enrolled in the class, saving nothing", async () => {
    const { service, saves } = setup({ enrolled: ["stu-ana"] });

    await expect(service.takeAttendance(klass(), TODAY, { "stu-ana": true, "stu-x": true })).rejects.toMatchObject({
      code: "not-enrolled",
    });
    expect(saves).toHaveLength(0);
  });

  it("A2: rejects a malformed or future date and an inactive class, saving nothing", async () => {
    const { service, saves } = setup();
    const marks = { "stu-ana": true };

    await expect(service.takeAttendance(klass(), "21/11/2026", marks)).rejects.toMatchObject({ code: "invalid-date" });
    await expect(service.takeAttendance(klass(), "2026-11-22", marks)).rejects.toMatchObject({ code: "future-date" });
    await expect(service.takeAttendance(klass({ status: "inactive" }), TODAY, marks)).rejects.toMatchObject({
      code: "class-inactive",
    });
    expect(saves).toHaveLength(0);
  });

  it("rejects saving with no marks", async () => {
    const { service, saves } = setup();

    await expect(service.takeAttendance(klass(), TODAY, {})).rejects.toBeInstanceOf(AttendanceError);
    expect(saves).toHaveLength(0);
  });
});

describe("getDay", () => {
  it("S4: returns each student's record for the chosen date only", async () => {
    const { service } = setup({
      records: [
        record("stu-ana", "2026-11-20", true),
        record("stu-beto", "2026-11-20", false),
        record("stu-ana", TODAY, false),
        record("stu-ana", "2026-11-20", true, "cls-2"),
      ],
    });

    const day = await service.getDay(klass(), "2026-11-20");

    expect(day.recorded).toBe(true);
    expect(day.marks).toEqual({ "stu-ana": true, "stu-beto": false });
  });

  it("S5: says nothing was recorded for a date without attendance", async () => {
    const { service } = setup({ records: [record("stu-ana", "2026-11-20", true)] });

    const day = await service.getDay(klass(), "2026-11-19");

    expect(day).toEqual({ recorded: false, marks: {} });
  });

  it("A4: keeps the records of students who are no longer enrolled", async () => {
    const { service } = setup({ enrolled: ["stu-ana"], records: [record("stu-gone", "2026-11-20", true)] });

    const day = await service.getDay(klass(), "2026-11-20");

    expect(day.marks).toEqual({ "stu-gone": true });
  });

  it("rejects a malformed date", async () => {
    const { service } = setup();

    await expect(service.getDay(klass(), "2026-11")).rejects.toMatchObject({ code: "invalid-date" });
  });
});
