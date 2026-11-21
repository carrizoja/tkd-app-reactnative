import type { School, Sede } from "../../school-management/model/types";
import type { Student } from "../../student-management/model/types";
import { ClassError, type Class, type ClassEnrollment, type ClassInput } from "../model/types";
import { createClassService, type ClassStore } from "./class-service";

// `./repository` pulls in the Firebase SDK, which the jest-expo preset cannot
// transform. Every test injects an in-memory store instead.
jest.mock("./repository", () => ({}));

const SCHOOL: School = { id: "a1", associationId: "assocA", name: "Escuela Centro" };
const CENTRO: Sede = { id: "sede-centro", schoolId: "a1", associationId: "assocA", name: "Centro", address: "" };
const NORTE: Sede = { ...CENTRO, id: "sede-norte", name: "Norte" };
const FOREIGN_SEDE: Sede = { ...CENTRO, id: "sede-x", schoolId: "b1", associationId: "assocB" };

const student = (id: string, schoolId = "a1"): Student => ({
  id,
  schoolId,
  associationId: schoolId === "a1" ? "assocA" : "assocB",
  firstName: id,
  lastName: id,
  lastNameLower: id,
});
const ANA = student("stu-ana");
const BETO = student("stu-beto");
const FOREIGN = student("stu-x", "b1");

const INPUT: ClassInput = { name: " Infantiles ", schedule: { days: [5, 1, 3, 1], start: "18:00", end: "19:30" } };

function memory(seed: { classes?: Class[]; enrollments?: ClassEnrollment[] } = {}) {
  const classes = new Map((seed.classes ?? []).map((c) => [c.id, c]));
  const enrollments = new Map((seed.enrollments ?? []).map((e) => [e.id, e]));
  const failures = { removeEnrollment: false };
  let next = 0;

  const store: ClassStore = {
    listClassesBySchool: async (schoolId) => [...classes.values()].filter((c) => c.schoolId === schoolId),
    getClass: async (id) => classes.get(id) ?? null,
    createClass: async (data) => {
      const created = { id: `cls-${++next}`, ...data };
      classes.set(created.id, created);
      return created;
    },
    updateClass: async (id, patch) => {
      const current = classes.get(id);
      if (!current) throw new Error(`no class ${id}`);
      classes.set(id, { ...current, ...patch });
    },
    removeClass: async (id) => {
      classes.delete(id);
    },
    listEnrollments: async (schoolId, classId) =>
      [...enrollments.values()].filter((e) => e.schoolId === schoolId && e.classId === classId),
    addEnrollments: async (list) => {
      for (const e of list) enrollments.set(e.id, e);
    },
    removeEnrollment: async (id) => {
      if (failures.removeEnrollment) throw new Error("offline");
      enrollments.delete(id);
    },
  };
  return { store, classes, enrollments, failures };
}

const existing = (over: Partial<Class> = {}): Class => ({
  id: "cls-a",
  sedeId: CENTRO.id,
  schoolId: "a1",
  associationId: "assocA",
  name: "Adultos",
  schedule: { days: [2, 4], start: "20:00", end: "21:30" },
  status: "active",
  ...over,
});

describe("class service", () => {
  describe("S1: create a class", () => {
    it("stores an active class linked to the sede and lists it", async () => {
      const { store } = memory();
      const service = createClassService(store);

      const created = await service.createClass(SCHOOL, CENTRO, INPUT);

      expect(created).toEqual({
        id: "cls-1",
        sedeId: CENTRO.id,
        schoolId: "a1",
        associationId: "assocA",
        name: "Infantiles",
        schedule: { days: [1, 3, 5], start: "18:00", end: "19:30" },
        status: "active",
      });
      expect(await service.listClasses(SCHOOL)).toEqual([created]);
    });

    it.each([
      ["a blank name", { ...INPUT, name: "  " }],
      ["no days", { ...INPUT, schedule: { ...INPUT.schedule, days: [] } }],
      ["a day out of range", { ...INPUT, schedule: { ...INPUT.schedule, days: [0 as never] } }],
      ["a malformed time", { ...INPUT, schedule: { ...INPUT.schedule, start: "6:00" } }],
      ["an end before the start", { ...INPUT, schedule: { ...INPUT.schedule, start: "19:30", end: "18:00" } }],
      ["an end equal to the start", { ...INPUT, schedule: { ...INPUT.schedule, end: "18:00" } }],
    ])("rejects %s and stores nothing", async (_label, input) => {
      const { store, classes } = memory();
      const service = createClassService(store);

      await expect(service.createClass(SCHOOL, CENTRO, input)).rejects.toMatchObject({ code: "invalid-input" });
      expect(classes.size).toBe(0);
    });

    it("rejects a sede of another school", async () => {
      const { store, classes } = memory();
      const service = createClassService(store);

      const attempt = service.createClass(SCHOOL, FOREIGN_SEDE, INPUT);

      await expect(attempt).rejects.toBeInstanceOf(ClassError);
      await expect(attempt).rejects.toMatchObject({ code: "not-same-school" });
      expect(classes.size).toBe(0);
    });

    it("lists a school's classes by name, without other schools' classes", async () => {
      const { store } = memory({
        classes: [existing({ id: "z", name: "Veteranos" }), existing({ id: "y", name: "adultos" }), existing({ id: "x", schoolId: "b1" })],
      });
      const service = createClassService(store);

      expect((await service.listClasses(SCHOOL)).map((c) => c.id)).toEqual(["y", "z"]);
    });
  });

  describe("S2: edit and delete", () => {
    it("edits the name, schedule and sede", async () => {
      const { store, classes } = memory({ classes: [existing()] });
      const service = createClassService(store);

      await service.updateClass(existing(), NORTE, INPUT);

      expect(classes.get("cls-a")).toMatchObject({
        sedeId: NORTE.id,
        name: "Infantiles",
        schedule: { days: [1, 3, 5], start: "18:00", end: "19:30" },
        status: "active",
      });
    });

    it("rejects moving a class to a sede of another school", async () => {
      const { store, classes } = memory({ classes: [existing()] });
      const service = createClassService(store);

      await expect(service.updateClass(existing(), FOREIGN_SEDE, INPUT)).rejects.toMatchObject({
        code: "not-same-school",
      });
      expect(classes.get("cls-a")).toEqual(existing());
    });

    it("A4: deletes the class and its enrollments", async () => {
      const { store, classes, enrollments } = memory({
        classes: [existing(), existing({ id: "cls-b" })],
        enrollments: [
          { id: "cls-a_stu-ana", classId: "cls-a", studentId: "stu-ana", schoolId: "a1" },
          { id: "cls-b_stu-ana", classId: "cls-b", studentId: "stu-ana", schoolId: "a1" },
        ],
      });
      const service = createClassService(store);

      await service.deleteClass(existing());

      expect([...classes.keys()]).toEqual(["cls-b"]);
      expect([...enrollments.keys()]).toEqual(["cls-b_stu-ana"]);
    });

    it("A4: still deletes the class when removing its enrollments fails", async () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const { store, classes, failures } = memory({
        classes: [existing()],
        enrollments: [{ id: "cls-a_stu-ana", classId: "cls-a", studentId: "stu-ana", schoolId: "a1" }],
      });
      failures.removeEnrollment = true;
      const service = createClassService(store);

      await service.deleteClass(existing());

      expect(classes.size).toBe(0);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe("S3: deactivate a class", () => {
    it("keeps the class and its roster but leaves it out of active lists", async () => {
      const { store, classes } = memory({
        classes: [existing(), existing({ id: "cls-b", name: "Infantiles" })],
        enrollments: [{ id: "cls-a_stu-ana", classId: "cls-a", studentId: "stu-ana", schoolId: "a1" }],
      });
      const service = createClassService(store);

      await service.setStatus(existing(), "inactive");

      expect(classes.get("cls-a")?.status).toBe("inactive");
      expect((await service.listActiveClasses(SCHOOL)).map((c) => c.id)).toEqual(["cls-b"]);
      expect((await service.listClasses(SCHOOL)).map((c) => c.id)).toEqual(["cls-a", "cls-b"]);
      expect(await service.listEnrolledStudentIds(existing())).toEqual(["stu-ana"]);
    });

    it("reactivates an inactive class", async () => {
      const { store, classes } = memory({ classes: [existing({ status: "inactive" })] });
      const service = createClassService(store);

      await service.setStatus(existing({ status: "inactive" }), "active");

      expect(classes.get("cls-a")?.status).toBe("active");
    });
  });

  describe("S4–S6: enrollment", () => {
    it("S4: enrolls several students under deterministic ids and shows them on the roster", async () => {
      const { store, enrollments } = memory({ classes: [existing()] });
      const service = createClassService(store);

      await service.enroll(existing(), [ANA, BETO]);
      await service.enroll(existing(), [ANA]);

      expect([...enrollments.values()]).toEqual([
        { id: "cls-a_stu-ana", classId: "cls-a", studentId: "stu-ana", schoolId: "a1" },
        { id: "cls-a_stu-beto", classId: "cls-a", studentId: "stu-beto", schoolId: "a1" },
      ]);
      expect(await service.listEnrolledStudentIds(existing())).toEqual(["stu-ana", "stu-beto"]);
    });

    it("S5: rejects a student from a different school and enrolls nobody", async () => {
      const { store, enrollments } = memory({ classes: [existing()] });
      const service = createClassService(store);

      await expect(service.enroll(existing(), [ANA, FOREIGN])).rejects.toMatchObject({ code: "not-same-school" });
      expect(enrollments.size).toBe(0);
    });

    it("S6: un-enrolls a student, who leaves only that class's roster", async () => {
      const { store } = memory({
        classes: [existing(), existing({ id: "cls-b" })],
        enrollments: [
          { id: "cls-a_stu-ana", classId: "cls-a", studentId: "stu-ana", schoolId: "a1" },
          { id: "cls-a_stu-beto", classId: "cls-a", studentId: "stu-beto", schoolId: "a1" },
          { id: "cls-b_stu-ana", classId: "cls-b", studentId: "stu-ana", schoolId: "a1" },
        ],
      });
      const service = createClassService(store);

      await service.unenroll(existing(), ANA);

      expect(await service.listEnrolledStudentIds(existing())).toEqual(["stu-beto"]);
      expect(await service.listEnrolledStudentIds(existing({ id: "cls-b" }))).toEqual(["stu-ana"]);
    });
  });
});
