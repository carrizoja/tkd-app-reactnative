/**
 * Security Rules for the school hierarchy (OpenSpec 4.1, odd/tasks/school-management.md
 * S1–S9). Uses its own tenant ids so it never collides with the documents
 * seeded by `tenant-isolation.test.ts` in the same emulator run.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const PROJECT_ID = "demo-tkd";

// Two tenants:
//  - hAssocA owns hSchoolA1 (with sede hSedeA1, which has a class) and hSchoolA2
//  - hAssocB owns hSchoolB1 (with an empty sede hSedeB1)
const ASSOC_A = "hAssocA";
const ASSOC_B = "hAssocB";
const SCHOOL_A1 = "hSchoolA1";
const SCHOOL_A2 = "hSchoolA2";
const SCHOOL_B1 = "hSchoolB1";
const SEDE_A1 = "hSedeA1";
const SEDE_B1 = "hSedeB1";

// presidentA: association scope over hAssocA. instructorB: school scope over hSchoolB1.
const PRESIDENT_A = "hPresidentA";
const INSTRUCTOR_B = "hInstructorB";

let testEnv: RulesTestEnvironment;

function parseHostPort(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const [host, port] = raw.split(":");
  return { host, port: Number(port) };
}

const asPresidentA = () => testEnv.authenticatedContext(PRESIDENT_A).firestore();
const asInstructorB = () => testEnv.authenticatedContext(INSTRUCTOR_B).firestore();

beforeAll(async () => {
  const { host, port } = parseHostPort();
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host,
      port,
      rules: readFileSync(resolve(__dirname, "..", "firestore.rules"), "utf8"),
    },
  });
});

// Every test starts from the same seed, so writes in one test never leak into another.
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "memberships", PRESIDENT_A), {
      scope: "association",
      associationId: ASSOC_A,
    });
    await setDoc(doc(db, "memberships", INSTRUCTOR_B), {
      scope: "school",
      schoolIds: [SCHOOL_B1],
    });
    await setDoc(doc(db, "schools", SCHOOL_A1), { associationId: ASSOC_A, name: "Escuela A1" });
    await setDoc(doc(db, "schools", SCHOOL_A2), { associationId: ASSOC_A, name: "Escuela A2" });
    await setDoc(doc(db, "schools", SCHOOL_B1), { associationId: ASSOC_B, name: "Escuela B1" });
    await setDoc(doc(db, "sedes", SEDE_A1), {
      schoolId: SCHOOL_A1,
      associationId: ASSOC_A,
      name: "Sede Centro",
      address: "Calle 1",
    });
    await setDoc(doc(db, "sedes", SEDE_B1), {
      schoolId: SCHOOL_B1,
      associationId: ASSOC_B,
      name: "Sede Norte",
      address: "Calle 2",
    });
    await setDoc(doc(db, "classes", "hClassA1"), {
      sedeId: SEDE_A1,
      schoolId: SCHOOL_A1,
      associationId: ASSOC_A,
      name: "Infantiles",
      schedule: { days: [1, 3], start: "18:00", end: "19:00" },
      status: "active",
    });
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("schools", () => {
  it("S1: a president can create a school in its association", async () => {
    await assertSucceeds(
      setDoc(doc(asPresidentA(), "schools", "hNewA"), { associationId: ASSOC_A, name: "Nueva" }),
    );
  });

  it("S7: a president cannot create a school in another association", async () => {
    await assertFails(
      setDoc(doc(asPresidentA(), "schools", "hCrossA"), { associationId: ASSOC_B, name: "X" }),
    );
  });

  it("S6: a president can list its association's schools", async () => {
    const snap = await assertSucceeds(
      getDocs(query(collection(asPresidentA(), "schools"), where("associationId", "==", ASSOC_A))),
    );
    expect(snap.docs.map((d) => d.id).sort()).toEqual([SCHOOL_A1, SCHOOL_A2]);
  });

  it("S7: a president cannot list another association's schools", async () => {
    await assertFails(
      getDocs(query(collection(asPresidentA(), "schools"), where("associationId", "==", ASSOC_B))),
    );
  });

  it("S8: an instructor can read its own school but not another one", async () => {
    await assertSucceeds(getDoc(doc(asInstructorB(), "schools", SCHOOL_B1)));
    await assertFails(getDoc(doc(asInstructorB(), "schools", SCHOOL_A1)));
  });

  it("S8: reading an assigned school that no longer exists returns nothing instead of failing", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await deleteDoc(doc(context.firestore(), "schools", SCHOOL_B1));
    });
    const snap = await assertSucceeds(getDoc(doc(asInstructorB(), "schools", SCHOOL_B1)));
    expect(snap.exists()).toBe(false);
  });

  it("S4: an instructor can rename its own school", async () => {
    await assertSucceeds(updateDoc(doc(asInstructorB(), "schools", SCHOOL_B1), { name: "Renombrada" }));
  });

  it("S9: an instructor cannot move its school into another association", async () => {
    await assertFails(
      updateDoc(doc(asInstructorB(), "schools", SCHOOL_B1), { associationId: ASSOC_A }),
    );
  });

  it("S9: a president cannot move a school out of its association", async () => {
    await assertFails(
      updateDoc(doc(asPresidentA(), "schools", SCHOOL_A2), { associationId: ASSOC_B }),
    );
  });

  it("S9: an instructor cannot move its school by overwriting it", async () => {
    await assertFails(
      setDoc(doc(asInstructorB(), "schools", SCHOOL_B1), { associationId: ASSOC_A, name: "Escuela B1" }),
    );
  });

  it("S9: an instructor cannot strip its school's association", async () => {
    await assertFails(
      updateDoc(doc(asInstructorB(), "schools", SCHOOL_B1), { associationId: deleteField() }),
    );
  });

  it("S5: a president can delete a school in its association", async () => {
    await assertSucceeds(deleteDoc(doc(asPresidentA(), "schools", SCHOOL_A2)));
  });

  // L6: schools belong to an association, so only association scope creates or
  // deletes them. Otherwise an instructor could delete its school and recreate
  // it under another association, getting around the S9 update lock.
  it("S9: an instructor cannot delete its own school", async () => {
    await assertFails(deleteDoc(doc(asInstructorB(), "schools", SCHOOL_B1)));
  });

  it("S9: an instructor cannot create a school, even under an id it is assigned", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await deleteDoc(doc(context.firestore(), "schools", SCHOOL_B1));
    });
    await assertFails(
      setDoc(doc(asInstructorB(), "schools", SCHOOL_B1), { associationId: ASSOC_A, name: "Escuela B1" }),
    );
  });
});

describe("sedes", () => {
  it("S2: a president can create a sede under one of its schools", async () => {
    await assertSucceeds(
      setDoc(doc(asPresidentA(), "sedes", "hNewSede"), {
        schoolId: SCHOOL_A1,
        associationId: ASSOC_A,
        name: "Sede Sur",
        address: "Calle 3",
      }),
    );
  });

  it("S7: an instructor cannot create a sede under another school", async () => {
    await assertFails(
      setDoc(doc(asInstructorB(), "sedes", "hCrossSede"), {
        schoolId: SCHOOL_A1,
        associationId: ASSOC_A,
        name: "X",
        address: "Y",
      }),
    );
  });

  it("S2: a sede's associationId must match its school's association", async () => {
    await assertFails(
      setDoc(doc(asInstructorB(), "sedes", "hMislabeled"), {
        schoolId: SCHOOL_B1,
        associationId: ASSOC_A,
        name: "X",
        address: "Y",
      }),
    );
  });

  it("S4: a sede's name and address can be edited in scope", async () => {
    await assertSucceeds(
      updateDoc(doc(asPresidentA(), "sedes", SEDE_A1), { name: "Sede Centro 2", address: "Calle 10" }),
    );
    await assertSucceeds(updateDoc(doc(asInstructorB(), "sedes", SEDE_B1), { name: "Sede Norte 2" }));
  });

  it("S2: a sede's associationId cannot be relabeled on update", async () => {
    await assertFails(updateDoc(doc(asPresidentA(), "sedes", SEDE_A1), { associationId: ASSOC_B }));
  });

  it("S4: a school's sedes can be listed by its own users only", async () => {
    const sedesOf = (db: ReturnType<typeof asPresidentA>, schoolId: string) =>
      getDocs(query(collection(db, "sedes"), where("schoolId", "==", schoolId)));

    const snap = await assertSucceeds(sedesOf(asPresidentA(), SCHOOL_A1));
    expect(snap.docs.map((d) => d.id)).toEqual([SEDE_A1]);
    await assertSucceeds(sedesOf(asInstructorB(), SCHOOL_B1));
    await assertFails(sedesOf(asInstructorB(), SCHOOL_A1));
  });

  it("S3: a sede's classes can be looked up before deleting it", async () => {
    const snap = await assertSucceeds(
      getDocs(
        query(
          collection(asPresidentA(), "classes"),
          where("schoolId", "==", SCHOOL_A1),
          where("sedeId", "==", SEDE_A1),
        ),
      ),
    );
    expect(snap.size).toBe(1);
  });

  it("S3: an instructor can delete a sede of its school but not of another one", async () => {
    await assertSucceeds(deleteDoc(doc(asInstructorB(), "sedes", SEDE_B1)));
    await assertFails(deleteDoc(doc(asInstructorB(), "sedes", SEDE_A1)));
  });
});
