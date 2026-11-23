/**
 * Firestore Security Rules for calendar events (OpenSpec 9.1,
 * odd/tasks/event-calendar.md S2, S5, A5). Uses its own tenant ids and wipes
 * the emulator before each test so suites never interfere.
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
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const PROJECT_ID = "demo-tkd";

// eAssocA owns eSchoolA1; eAssocB owns eSchoolB1.
const ASSOC_A = "eAssocA";
const ASSOC_B = "eAssocB";
const SCHOOL_A1 = "eSchoolA1";
const SCHOOL_B1 = "eSchoolB1";
const PRESIDENT_A = "ePresidentA";
const INSTRUCTOR_B = "eInstructorB";

let testEnv: RulesTestEnvironment;

function parseHostPort(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const [host, port] = raw.split(":");
  return { host, port: Number(port) };
}

const asPresidentA = () => testEnv.authenticatedContext(PRESIDENT_A).firestore();
const asInstructorB = () => testEnv.authenticatedContext(INSTRUCTOR_B).firestore();

const event = (schoolId: string, associationId: string, overrides: Record<string, unknown> = {}) => ({
  schoolId,
  associationId,
  type: "tournament",
  title: "Torneo Apertura",
  date: "2026-12-05",
  ...overrides,
});

type Db = ReturnType<typeof asPresidentA>;
const put = (db: Db, id: string, data: Record<string, unknown>) => setDoc(doc(db, "events", id), data);

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

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "memberships", PRESIDENT_A), { scope: "association", associationId: ASSOC_A });
    await setDoc(doc(db, "memberships", INSTRUCTOR_B), { scope: "school", schoolIds: [SCHOOL_B1] });
    await setDoc(doc(db, "schools", SCHOOL_A1), { associationId: ASSOC_A, name: "Escuela A1" });
    await setDoc(doc(db, "schools", SCHOOL_B1), { associationId: ASSOC_B, name: "Escuela B1" });
    await put(db, "evA1", event(SCHOOL_A1, ASSOC_A));
    await put(db, "evB1", event(SCHOOL_B1, ASSOC_B, { type: "exam_board" }));
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("events", () => {
  it("S1: a president and an instructor create events of each allowed type in their school", async () => {
    await assertSucceeds(put(asPresidentA(), "new1", event(SCHOOL_A1, ASSOC_A)));
    await assertSucceeds(put(asPresidentA(), "new2", event(SCHOOL_A1, ASSOC_A, { type: "master_class" })));
    await assertSucceeds(put(asInstructorB(), "new3", event(SCHOOL_B1, ASSOC_B, { type: "exam_board" })));
  });

  it("S2: an event with a type outside the allowed set is rejected", async () => {
    for (const type of ["birthday", "Tournament", "", null]) {
      await assertFails(put(asPresidentA(), "bad", event(SCHOOL_A1, ASSOC_A, { type })));
    }
  });

  it("S2: an update cannot change the type to one outside the allowed set", async () => {
    await assertFails(updateDoc(doc(asPresidentA(), "events", "evA1"), { type: "birthday" }));
    await assertSucceeds(updateDoc(doc(asPresidentA(), "events", "evA1"), { type: "master_class" }));
  });

  it("A5: the title must be a non-empty string", async () => {
    for (const title of ["", 42, null, "x".repeat(101)]) {
      await assertFails(put(asPresidentA(), "bad", event(SCHOOL_A1, ASSOC_A, { title })));
    }
    await assertSucceeds(put(asPresidentA(), "max", event(SCHOOL_A1, ASSOC_A, { title: "x".repeat(100) })));
  });

  it("A5: the date must be YYYY-MM-DD", async () => {
    for (const date of ["2026-12", "05/12/2026", "2026-12-05T10:00", 20261205, "2026-13-01", "2026-00-10", "2026-12-32", "2026-12-00"]) {
      await assertFails(put(asPresidentA(), "bad", event(SCHOOL_A1, ASSOC_A, { date })));
    }
  });

  it("A5: the associationId must be the school's", async () => {
    await assertFails(put(asPresidentA(), "bad", event(SCHOOL_A1, ASSOC_B)));
    const { associationId: _a, ...noAssociation } = event(SCHOOL_A1, ASSOC_A);
    await assertFails(put(asPresidentA(), "bad", noAssociation));
    await assertFails(updateDoc(doc(asPresidentA(), "events", "evA1"), { associationId: ASSOC_B }));
  });

  it("A5: an update never moves an event to another school", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "schools", "eSchoolA2"), { associationId: ASSOC_A, name: "Escuela A2" });
    });
    await assertFails(updateDoc(doc(asPresidentA(), "events", "evA1"), { schoolId: "eSchoolA2" }));
  });

  it("S5: nobody creates, edits or deletes an event outside their scope", async () => {
    await assertFails(put(asInstructorB(), "x", event(SCHOOL_A1, ASSOC_A)));
    await assertFails(put(asPresidentA(), "x", event(SCHOOL_B1, ASSOC_B)));
    await assertFails(updateDoc(doc(asInstructorB(), "events", "evA1"), { title: "Otro" }));
    await assertFails(deleteDoc(doc(asInstructorB(), "events", "evA1")));
    await assertSucceeds(deleteDoc(doc(asPresidentA(), "events", "evA1")));
  });

  it("S3/S4/S5: a member queries upcoming events of its school by date and type, not another school's", async () => {
    await assertSucceeds(getDoc(doc(asPresidentA(), "events", "evA1")));
    await assertFails(getDoc(doc(asPresidentA(), "events", "evB1")));
    await assertSucceeds(
      getDocs(query(collection(asInstructorB(), "events"), where("schoolId", "==", SCHOOL_B1),
        where("date", ">=", "2026-11-23"), orderBy("date"))),
    );
    await assertSucceeds(
      getDocs(query(collection(asInstructorB(), "events"), where("schoolId", "==", SCHOOL_B1),
        where("type", "==", "exam_board"), where("date", ">=", "2026-11-23"), orderBy("date"))),
    );
    await assertFails(
      getDocs(query(collection(asInstructorB(), "events"), where("schoolId", "==", SCHOOL_A1), orderBy("date"))),
    );
  });
});
