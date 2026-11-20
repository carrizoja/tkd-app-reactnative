import type { UserScope } from "../../user-auth/model/scope";
import { SchoolError, type School, type Sede } from "../model/types";
import { createSchoolService, type SchoolStore } from "./school-service";

// `./repository` pulls in the Firestore SDK, which the jest-expo preset cannot
// transform. Every test injects an in-memory store, so this stub only keeps the
// SDK out of the module graph.
jest.mock("./repository", () => ({ firestoreSchoolStore: {} }));

const ASSOC_A = "assocA";
const PRESIDENT_A: UserScope = { kind: "association", associationId: ASSOC_A };
const INSTRUCTOR_B1: UserScope = { kind: "school", schoolIds: ["b1"] };

/** Minimal in-memory `SchoolStore`; ids are sequential so tests stay deterministic. */
function memoryStore(seed: { schools?: School[]; sedes?: Sede[]; sedesWithClasses?: string[] } = {}) {
  const schools = new Map((seed.schools ?? []).map((s) => [s.id, s]));
  const sedes = new Map((seed.sedes ?? []).map((s) => [s.id, s]));
  const withClasses = new Set(seed.sedesWithClasses ?? []);
  let next = 0;
  const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

  const store: SchoolStore = {
    getSchool: async (id) => schools.get(id) ?? null,
    listSchoolsByAssociation: async (associationId) =>
      [...schools.values()].filter((s) => s.associationId === associationId).sort(byName),
    createSchool: async (data) => {
      const school = { id: `school-${++next}`, ...data };
      schools.set(school.id, school);
      return school;
    },
    updateSchool: async (id, patch) => {
      schools.set(id, { ...schools.get(id)!, ...patch });
    },
    removeSchool: async (id) => {
      schools.delete(id);
    },
    listSedesBySchool: async (schoolId) =>
      [...sedes.values()].filter((s) => s.schoolId === schoolId).sort(byName),
    createSede: async (data) => {
      const sede = { id: `sede-${++next}`, ...data };
      sedes.set(sede.id, sede);
      return sede;
    },
    updateSede: async (id, patch) => {
      sedes.set(id, { ...sedes.get(id)!, ...patch });
    },
    removeSede: async (id) => {
      sedes.delete(id);
    },
    sedeHasClasses: async (sede) => withClasses.has(sede.id),
  };
  return { store, schools, sedes };
}

const schoolA1: School = { id: "a1", associationId: ASSOC_A, name: "Escuela Centro" };
const schoolA2: School = { id: "a2", associationId: ASSOC_A, name: "Academia Sur" };
const schoolB1: School = { id: "b1", associationId: "assocB", name: "Escuela Norte" };
const sedeA1: Sede = { id: "s1", schoolId: "a1", associationId: ASSOC_A, name: "Sede 1", address: "Calle 1" };

async function expectSchoolError(promise: Promise<unknown>, code: SchoolError["code"]) {
  await expect(promise).rejects.toBeInstanceOf(SchoolError);
  await expect(promise).rejects.toMatchObject({ code });
}

describe("listSchools", () => {
  it("S6: returns every school of a president's association, by name", async () => {
    const { store } = memoryStore({ schools: [schoolA1, schoolA2, schoolB1] });
    const schools = await createSchoolService(store).listSchools(PRESIDENT_A);
    expect(schools.map((s) => s.id)).toEqual(["a2", "a1"]);
  });

  it("S8: returns only an instructor's own schools", async () => {
    const { store } = memoryStore({ schools: [schoolA1, schoolB1] });
    const schools = await createSchoolService(store).listSchools(INSTRUCTOR_B1);
    expect(schools).toEqual([schoolB1]);
  });

  it("S8: skips assigned schools that no longer exist", async () => {
    const { store } = memoryStore({ schools: [schoolB1] });
    const scope: UserScope = { kind: "school", schoolIds: ["b1", "gone"] };
    await expect(createSchoolService(store).listSchools(scope)).resolves.toEqual([schoolB1]);
  });

  it("returns nothing for a user without tenancy", async () => {
    const { store } = memoryStore({ schools: [schoolA1] });
    await expect(createSchoolService(store).listSchools({ kind: "unassigned" })).resolves.toEqual([]);
  });
});

describe("getSchool", () => {
  it("S4: returns a school by id, or null when it no longer exists", async () => {
    const { store } = memoryStore({ schools: [schoolA1] });
    const service = createSchoolService(store);
    await expect(service.getSchool("a1")).resolves.toEqual(schoolA1);
    await expect(service.getSchool("gone")).resolves.toBeNull();
  });
});

describe("createSchool", () => {
  it("S1: stores the school under the president's association and lists it", async () => {
    const { store } = memoryStore();
    const service = createSchoolService(store);

    const created = await service.createSchool(PRESIDENT_A, { name: "  Dojang Oeste  " });

    expect(created).toEqual({ id: "school-1", associationId: ASSOC_A, name: "Dojang Oeste" });
    await expect(service.listSchools(PRESIDENT_A)).resolves.toEqual([created]);
  });

  it("rejects a blank name without storing anything", async () => {
    const { store, schools } = memoryStore();
    await expectSchoolError(createSchoolService(store).createSchool(PRESIDENT_A, { name: "   " }), "invalid-input");
    expect(schools.size).toBe(0);
  });

  it("does not let an instructor create schools", async () => {
    const { store, schools } = memoryStore();
    await expectSchoolError(createSchoolService(store).createSchool(INSTRUCTOR_B1, { name: "Nueva" }), "forbidden");
    expect(schools.size).toBe(0);
  });
});

describe("renameSchool", () => {
  it("S4/S9: changes only the name, never the association", async () => {
    const { store, schools } = memoryStore({ schools: [schoolA1] });
    await createSchoolService(store).renameSchool(schoolA1, { name: " Escuela Central " });
    expect(schools.get("a1")).toEqual({ ...schoolA1, name: "Escuela Central" });
  });

  it("rejects a blank name", async () => {
    const { store, schools } = memoryStore({ schools: [schoolA1] });
    await expectSchoolError(createSchoolService(store).renameSchool(schoolA1, { name: "" }), "invalid-input");
    expect(schools.get("a1")).toEqual(schoolA1);
  });
});

describe("deleteSchool", () => {
  it("S5: removes a school that has no sedes", async () => {
    const { store, schools } = memoryStore({ schools: [schoolA2] });
    await createSchoolService(store).deleteSchool(PRESIDENT_A, schoolA2);
    expect(schools.has("a2")).toBe(false);
  });

  it("S5: refuses to delete a school that still has sedes", async () => {
    const { store, schools } = memoryStore({ schools: [schoolA1], sedes: [sedeA1] });
    await expectSchoolError(createSchoolService(store).deleteSchool(PRESIDENT_A, schoolA1), "has-sedes");
    expect(schools.has("a1")).toBe(true);
  });

  it("does not let an instructor delete schools", async () => {
    const { store, schools } = memoryStore({ schools: [schoolB1] });
    await expectSchoolError(createSchoolService(store).deleteSchool(INSTRUCTOR_B1, schoolB1), "forbidden");
    expect(schools.has("b1")).toBe(true);
  });
});

describe("sedes", () => {
  it("S2: stores a sede linked to its school and its school's association", async () => {
    const { store } = memoryStore({ schools: [schoolA1] });
    const service = createSchoolService(store);

    const created = await service.createSede(schoolA1, { name: " Sede Sur ", address: " Av. Siempre Viva 742 " });

    expect(created).toEqual({
      id: "sede-1",
      schoolId: "a1",
      associationId: ASSOC_A,
      name: "Sede Sur",
      address: "Av. Siempre Viva 742",
    });
    await expect(service.listSedes(schoolA1)).resolves.toEqual([created]);
  });

  it("S2: requires both a name and an address", async () => {
    const { store, sedes } = memoryStore({ schools: [schoolA1] });
    const service = createSchoolService(store);
    await expectSchoolError(service.createSede(schoolA1, { name: "Sede", address: " " }), "invalid-input");
    await expectSchoolError(service.createSede(schoolA1, { name: "", address: "Calle 1" }), "invalid-input");
    expect(sedes.size).toBe(0);
  });

  it("S4: edits a sede's name and address", async () => {
    const { store, sedes } = memoryStore({ sedes: [sedeA1] });
    await createSchoolService(store).updateSede(sedeA1, { name: "Sede Uno", address: "Calle 9" });
    expect(sedes.get("s1")).toEqual({ ...sedeA1, name: "Sede Uno", address: "Calle 9" });
  });

  it("S3: removes a sede that has no classes", async () => {
    const { store, sedes } = memoryStore({ sedes: [sedeA1] });
    await createSchoolService(store).deleteSede(sedeA1);
    expect(sedes.has("s1")).toBe(false);
  });

  it("S3: refuses to delete a sede that still has classes", async () => {
    const { store, sedes } = memoryStore({ sedes: [sedeA1], sedesWithClasses: ["s1"] });
    await expectSchoolError(createSchoolService(store).deleteSede(sedeA1), "has-classes");
    expect(sedes.has("s1")).toBe(true);
  });
});
