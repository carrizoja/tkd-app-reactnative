/**
 * Firestore Security Rules for attendance records (OpenSpec 7.1,
 * odd/tasks/attendance-tracking.md S2, S6, A3). Uses its own tenant ids and
 * wipes the emulator before each test so suites never interfere.
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
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

const PROJECT_ID = "demo-tkd";

// aAssocA owns aSchoolA1 and aSchoolA2; aAssocB owns aSchoolB1.
const ASSOC_A = "aAssocA";
const ASSOC_B = "aAssocB";
const SCHOOL_A1 = "aSchoolA1";
const SCHOOL_A2 = "aSchoolA2";
const SCHOOL_B1 = "aSchoolB1";
const PRESIDENT_A = "aPresidentA";
const INSTRUCTOR_B = "aInstructorB";
/** A school-scope user of two schools of the same association. */
const INSTRUCTOR_A12 = "aInstructorA12";
const DATE = "2026-11-20";

let testEnv: RulesTestEnvironment;

function parseHostPort(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const [host, port] = raw.split(":");
  return { host, port: Number(port) };
}

const asPresidentA = () => testEnv.authenticatedContext(PRESIDENT_A).firestore();
const asInstructorB = () => testEnv.authenticatedContext(INSTRUCTOR_B).firestore();
const asInstructorA12 = () => testEnv.authenticatedContext(INSTRUCTOR_A12).firestore();

const record = (classId: string, studentId: string, schoolId: string, date = DATE, present = true) => ({
  classId,
  studentId,
  date,
  present,
  schoolId,
});

const idOf = (r: { classId: string; studentId: string; date: string }) => `${r.classId}_${r.studentId}_${r.date}`;

type Db = ReturnType<typeof asPresidentA>;

/** Writes a record under its deterministic id. */
const mark = (db: Db, r: ReturnType<typeof record>, id = idOf(r)) => setDoc(doc(db, "attendance", id), r);

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
    await setDoc(doc(db, "memberships", INSTRUCTOR_A12), { scope: "school", schoolIds: [SCHOOL_A1, SCHOOL_A2] });
    await setDoc(doc(db, "schools", SCHOOL_A1), { associationId: ASSOC_A, name: "Escuela A1" });
    await setDoc(doc(db, "schools", SCHOOL_A2), { associationId: ASSOC_A, name: "Escuela A2" });
    await setDoc(doc(db, "schools", SCHOOL_B1), { associationId: ASSOC_B, name: "Escuela B1" });
    await setDoc(doc(db, "classes", "clsA1"), { schoolId: SCHOOL_A1, associationId: ASSOC_A, sedeId: "sedeA1" });
    await setDoc(doc(db, "classes", "clsA2"), { schoolId: SCHOOL_A2, associationId: ASSOC_A, sedeId: "sedeA2" });
    await setDoc(doc(db, "classes", "clsB1"), { schoolId: SCHOOL_B1, associationId: ASSOC_B, sedeId: "sedeB1" });
    await mark(db, record("clsA1", "stuA1", SCHOOL_A1));
    await mark(db, record("clsB1", "stuB1", SCHOOL_B1));
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("attendance", () => {
  it("S1: a president can mark a student of a class of its school", async () => {
    await assertSucceeds(mark(asPresidentA(), record("clsA1", "stuA1b", SCHOOL_A1)));
  });

  it("S1: an instructor can mark a student of a class of its own school", async () => {
    await assertSucceeds(mark(asInstructorB(), record("clsB1", "stuB2", SCHOOL_B1, DATE, false)));
  });

  it("S2: re-marking the same class, student and date updates the record", async () => {
    await assertSucceeds(mark(asPresidentA(), record("clsA1", "stuA1", SCHOOL_A1, DATE, false)));
    await assertSucceeds(updateDoc(doc(asPresidentA(), "attendance", `clsA1_stuA1_${DATE}`), { present: true }));
  });

  it("S2/A3: a record must use the id `${classId}_${studentId}_${date}`", async () => {
    await assertFails(mark(asPresidentA(), record("clsA1", "stuA1", SCHOOL_A1), "random-id"));
    await assertFails(mark(asPresidentA(), record("clsA1", "stuA1", SCHOOL_A1), `clsA1_stuA1_2026-11-21`));
  });

  it("A3: the date must be YYYY-MM-DD and present a boolean", async () => {
    // No "/" in these dates: a slash would make the id a nested path that no rule matches.
    for (const date of ["2026-1-20", "20261120", "2026-11-20T00:00"]) {
      await assertFails(mark(asPresidentA(), record("clsA1", "stuA1", SCHOOL_A1, date)));
    }
    const notBoolean = { ...record("clsA1", "stuA1", SCHOOL_A1), present: "yes" };
    await assertFails(setDoc(doc(asPresidentA(), "attendance", idOf(notBoolean)), notBoolean));
  });

  it("A3: the class must exist and belong to the record's school", async () => {
    await assertFails(mark(asPresidentA(), record("clsA2", "stuA1", SCHOOL_A1)));
    await assertFails(mark(asPresidentA(), record("missing", "stuA1", SCHOOL_A1)));
  });

  it("A3: a user of two schools cannot file a record of one school's class under the other", async () => {
    await assertFails(mark(asInstructorA12(), record("clsA2", "stuA1", SCHOOL_A1)));
    await assertSucceeds(mark(asInstructorA12(), record("clsA2", "stuA2", SCHOOL_A2)));
  });

  it("A3: an update cannot change the class, student, date or school", async () => {
    const ref = doc(asInstructorA12(), "attendance", `clsA1_stuA1_${DATE}`);
    await assertFails(updateDoc(ref, { schoolId: SCHOOL_A2 }));
    await assertFails(updateDoc(ref, { classId: "clsA2" }));
    await assertFails(updateDoc(ref, { studentId: "stuA2" }));
    await assertFails(updateDoc(ref, { date: "2026-11-21" }));
    await assertFails(updateDoc(ref, { present: "no" }));
    await assertSucceeds(updateDoc(ref, { present: false }));
  });

  it("A1/A3: a whole class is saved in one batch without hitting the rules access-call limit", async () => {
    for (const asUser of [asPresidentA, asInstructorA12]) {
      const db = asUser();
      const batch = writeBatch(db);
      for (let i = 0; i < 40; i += 1) {
        const r = record("clsA1", `student${i}`, SCHOOL_A1, DATE, i % 3 !== 0);
        batch.set(doc(db, "attendance", idOf(r)), r);
      }
      await assertSucceeds(batch.commit());
    }
  });

  it("S4: a class's records for a date can be listed by school, class and date", async () => {
    const q = query(
      collection(asPresidentA(), "attendance"),
      where("schoolId", "==", SCHOOL_A1),
      where("classId", "==", "clsA1"),
      where("date", "==", DATE),
    );
    await assertSucceeds(getDocs(q));
  });

  it("S6: no user reads, writes or deletes another tenant's attendance", async () => {
    await assertFails(getDoc(doc(asPresidentA(), "attendance", `clsB1_stuB1_${DATE}`)));
    await assertFails(getDocs(query(collection(asPresidentA(), "attendance"), where("schoolId", "==", SCHOOL_B1))));
    await assertFails(mark(asPresidentA(), record("clsB1", "stuB3", SCHOOL_B1)));
    await assertFails(updateDoc(doc(asPresidentA(), "attendance", `clsB1_stuB1_${DATE}`), { present: false }));
    await assertFails(deleteDoc(doc(asPresidentA(), "attendance", `clsB1_stuB1_${DATE}`)));
    await assertFails(mark(asInstructorB(), record("clsA1", "stuA1b", SCHOOL_A1)));
    await assertFails(getDoc(doc(asInstructorB(), "attendance", `clsA1_stuA1_${DATE}`)));
  });

  it("S6: a signed-out user cannot read or write attendance", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, "attendance", `clsA1_stuA1_${DATE}`)));
    await assertFails(mark(anon, record("clsA1", "stuA1b", SCHOOL_A1)));
  });
});
