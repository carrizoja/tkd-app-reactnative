/**
 * Firestore Security Rules for classes and class enrollments (OpenSpec 6.1,
 * odd/tasks/class-management.md S1–S7, A3). Uses its own tenant ids and wipes
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
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const PROJECT_ID = "demo-tkd";

// cAssocA owns cSchoolA1 and cSchoolA2; cAssocB owns cSchoolB1.
const ASSOC_A = "cAssocA";
const ASSOC_B = "cAssocB";
const SCHOOL_A1 = "cSchoolA1";
const SCHOOL_A2 = "cSchoolA2";
const SCHOOL_B1 = "cSchoolB1";
const PRESIDENT_A = "cPresidentA";
const INSTRUCTOR_B = "cInstructorB";
/** A school-scope user of two schools of the same association. */
const INSTRUCTOR_A12 = "cInstructorA12";

let testEnv: RulesTestEnvironment;

function parseHostPort(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const [host, port] = raw.split(":");
  return { host, port: Number(port) };
}

const asPresidentA = () => testEnv.authenticatedContext(PRESIDENT_A).firestore();
const asInstructorB = () => testEnv.authenticatedContext(INSTRUCTOR_B).firestore();
const asInstructorA12 = () => testEnv.authenticatedContext(INSTRUCTOR_A12).firestore();

const schedule = { days: [1, 3, 5], start: "18:00", end: "19:30" };

const klass = (schoolId: string, associationId: string, sedeId: string, name = "Infantiles") => ({
  schoolId,
  associationId,
  sedeId,
  name,
  schedule,
  status: "active",
});

const enrollment = (classId: string, studentId: string, schoolId: string) => ({
  id: `${classId}_${studentId}`,
  classId,
  studentId,
  schoolId,
});

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
    await setDoc(doc(db, "sedes", "sedeA1"), { schoolId: SCHOOL_A1, associationId: ASSOC_A, name: "Centro" });
    await setDoc(doc(db, "sedes", "sedeA1b"), { schoolId: SCHOOL_A1, associationId: ASSOC_A, name: "Norte" });
    await setDoc(doc(db, "sedes", "sedeA2"), { schoolId: SCHOOL_A2, associationId: ASSOC_A, name: "Sur" });
    await setDoc(doc(db, "sedes", "sedeB1"), { schoolId: SCHOOL_B1, associationId: ASSOC_B, name: "Oeste" });
    await setDoc(doc(db, "students", "stuA1"), { schoolId: SCHOOL_A1, associationId: ASSOC_A, firstName: "Ana" });
    await setDoc(doc(db, "students", "stuA1b"), { schoolId: SCHOOL_A1, associationId: ASSOC_A, firstName: "Bea" });
    await setDoc(doc(db, "students", "stuA2"), { schoolId: SCHOOL_A2, associationId: ASSOC_A, firstName: "Abel" });
    await setDoc(doc(db, "classes", "clsA1"), klass(SCHOOL_A1, ASSOC_A, "sedeA1"));
    await setDoc(doc(db, "classEnrollments", "clsA1_stuA1"), enrollment("clsA1", "stuA1", SCHOOL_A1));
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("classes", () => {
  it("S1: a president can create a class under a sede of its school", async () => {
    await assertSucceeds(setDoc(doc(asPresidentA(), "classes", "new"), klass(SCHOOL_A1, ASSOC_A, "sedeA1")));
  });

  it("S1: an instructor can create a class in its own school", async () => {
    await assertSucceeds(setDoc(doc(asInstructorB(), "classes", "newB"), klass(SCHOOL_B1, ASSOC_B, "sedeB1")));
  });

  it("A3: a class's sede must belong to the class's school", async () => {
    await assertFails(setDoc(doc(asPresidentA(), "classes", "bad"), klass(SCHOOL_A1, ASSOC_A, "sedeA2")));
    await assertFails(setDoc(doc(asPresidentA(), "classes", "none"), klass(SCHOOL_A1, ASSOC_A, "missing")));
  });

  it("A3: a class's associationId must match its school's", async () => {
    await assertFails(setDoc(doc(asInstructorB(), "classes", "mislabeled"), klass(SCHOOL_B1, ASSOC_A, "sedeB1")));
  });

  it("S3: a class can be set inactive and edited in scope", async () => {
    await assertSucceeds(updateDoc(doc(asPresidentA(), "classes", "clsA1"), { status: "inactive" }));
    await assertSucceeds(updateDoc(doc(asPresidentA(), "classes", "clsA1"), { name: "Avanzados", sedeId: "sedeA1b" }));
  });

  it("A3: a class cannot move to another school or to a sede outside its school", async () => {
    await assertFails(updateDoc(doc(asPresidentA(), "classes", "clsA1"), { schoolId: SCHOOL_A2, sedeId: "sedeA2" }));
    await assertFails(updateDoc(doc(asPresidentA(), "classes", "clsA1"), { sedeId: "sedeA2" }));
  });

  it("A3: a user of two schools cannot hang a class from the other school's sede", async () => {
    await assertFails(setDoc(doc(asInstructorA12(), "classes", "bad"), klass(SCHOOL_A1, ASSOC_A, "sedeA2")));
    await assertFails(updateDoc(doc(asInstructorA12(), "classes", "clsA1"), { schoolId: SCHOOL_A2, sedeId: "sedeA2" }));
  });

  it("S3: a class whose sede was removed can still be deactivated, but not moved to a missing sede", async () => {
    await testEnv.withSecurityRulesDisabled((context) => deleteDoc(doc(context.firestore(), "sedes", "sedeA1")));

    await assertSucceeds(updateDoc(doc(asPresidentA(), "classes", "clsA1"), { status: "inactive" }));
    await assertFails(updateDoc(doc(asPresidentA(), "classes", "clsA1"), { sedeId: "missing" }));
  });

  it("S2: a class can be deleted in scope", async () => {
    await assertSucceeds(deleteDoc(doc(asPresidentA(), "classes", "clsA1")));
  });

  it("S7: an instructor cannot read, change or delete another school's class", async () => {
    await assertFails(getDoc(doc(asInstructorB(), "classes", "clsA1")));
    await assertFails(updateDoc(doc(asInstructorB(), "classes", "clsA1"), { status: "inactive" }));
    await assertFails(deleteDoc(doc(asInstructorB(), "classes", "clsA1")));
  });

  it("S1/S7: a school's classes can be listed by sede by its own users only", async () => {
    const classesOf = (db: ReturnType<typeof asPresidentA>, schoolId: string) =>
      getDocs(query(collection(db, "classes"), where("schoolId", "==", schoolId), where("sedeId", "==", "sedeA1")));

    const snap = await assertSucceeds(classesOf(asPresidentA(), SCHOOL_A1));
    expect(snap.docs.map((d) => d.id)).toEqual(["clsA1"]);
    await assertFails(classesOf(asInstructorB(), SCHOOL_A1));
  });
});

describe("class enrollments", () => {
  it("S4: a student of the class's school can be enrolled", async () => {
    await assertSucceeds(
      setDoc(doc(asPresidentA(), "classEnrollments", "clsA1_stuA1b"), enrollment("clsA1", "stuA1b", SCHOOL_A1)),
    );
  });

  it("S4/A3: enrolling an already enrolled student rewrites the same enrollment", async () => {
    await assertSucceeds(
      setDoc(doc(asPresidentA(), "classEnrollments", "clsA1_stuA1"), enrollment("clsA1", "stuA1", SCHOOL_A1)),
    );
  });

  it("S5: a student from a different school cannot be enrolled", async () => {
    await assertFails(
      setDoc(doc(asPresidentA(), "classEnrollments", "clsA1_stuA2"), enrollment("clsA1", "stuA2", SCHOOL_A1)),
    );
    await assertFails(
      setDoc(doc(asPresidentA(), "classEnrollments", "clsA1_stuA2"), enrollment("clsA1", "stuA2", SCHOOL_A2)),
    );
  });

  it("S5: a user of two schools cannot enroll one school's student into the other's class", async () => {
    await assertFails(
      setDoc(doc(asInstructorA12(), "classEnrollments", "clsA1_stuA2"), enrollment("clsA1", "stuA2", SCHOOL_A1)),
    );
    await assertFails(
      setDoc(doc(asInstructorA12(), "classEnrollments", "clsA1_stuA2"), enrollment("clsA1", "stuA2", SCHOOL_A2)),
    );
    await assertSucceeds(
      setDoc(doc(asInstructorA12(), "classEnrollments", "clsA1_stuA1"), enrollment("clsA1", "stuA1", SCHOOL_A1)),
    );
  });

  it("S5: enrolling into a missing class or a missing student is rejected", async () => {
    await assertFails(
      setDoc(doc(asPresidentA(), "classEnrollments", "ghost_stuA1"), enrollment("ghost", "stuA1", SCHOOL_A1)),
    );
    await assertFails(
      setDoc(doc(asPresidentA(), "classEnrollments", "clsA1_ghost"), enrollment("clsA1", "ghost", SCHOOL_A1)),
    );
  });

  it("A3: an enrollment's id is `${classId}_${studentId}`", async () => {
    await assertFails(
      setDoc(doc(asPresidentA(), "classEnrollments", "random"), enrollment("clsA1", "stuA1", SCHOOL_A1)),
    );
  });

  it("A3: an enrollment cannot be pointed at another student", async () => {
    await assertFails(updateDoc(doc(asPresidentA(), "classEnrollments", "clsA1_stuA1"), { studentId: "stuA2" }));
  });

  it("S6: a student can be un-enrolled in scope", async () => {
    await assertSucceeds(deleteDoc(doc(asPresidentA(), "classEnrollments", "clsA1_stuA1")));
  });

  it("S7: another school's users cannot read, enroll into or un-enroll from a class", async () => {
    await assertFails(getDoc(doc(asInstructorB(), "classEnrollments", "clsA1_stuA1")));
    await assertFails(deleteDoc(doc(asInstructorB(), "classEnrollments", "clsA1_stuA1")));
    await assertFails(
      setDoc(doc(asInstructorB(), "classEnrollments", "clsA1_stuA1"), enrollment("clsA1", "stuA1", SCHOOL_A1)),
    );
  });

  it("S4/S7: a class roster can be listed by its school's users only", async () => {
    const rosterOf = (db: ReturnType<typeof asPresidentA>) =>
      getDocs(
        query(collection(db, "classEnrollments"), where("schoolId", "==", SCHOOL_A1), where("classId", "==", "clsA1")),
      );

    const snap = await assertSucceeds(rosterOf(asPresidentA()));
    expect(snap.docs.map((d) => d.id)).toEqual(["clsA1_stuA1"]);
    await assertFails(rosterOf(asInstructorB()));
  });
});
