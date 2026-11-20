/**
 * Firestore Security Rules for students and student groups (OpenSpec 5.1,
 * odd/tasks/student-management.md S1, S3, S8–S10, A6). Uses its own tenant ids
 * and wipes the emulator before each test so suites never interfere.
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

// sAssocA owns sSchoolA1; sAssocB owns sSchoolB1.
const ASSOC_A = "sAssocA";
const ASSOC_B = "sAssocB";
const SCHOOL_A1 = "sSchoolA1";
const SCHOOL_B1 = "sSchoolB1";
const PRESIDENT_A = "sPresidentA";
const INSTRUCTOR_B = "sInstructorB";

let testEnv: RulesTestEnvironment;

function parseHostPort(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const [host, port] = raw.split(":");
  return { host, port: Number(port) };
}

const asPresidentA = () => testEnv.authenticatedContext(PRESIDENT_A).firestore();
const asInstructorB = () => testEnv.authenticatedContext(INSTRUCTOR_B).firestore();

const student = (schoolId: string, associationId: string, lastName: string) => ({
  schoolId,
  associationId,
  firstName: "Ana",
  lastName,
  lastNameLower: lastName.toLowerCase(),
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
    await setDoc(doc(db, "schools", SCHOOL_A1), { associationId: ASSOC_A, name: "Escuela A1" });
    await setDoc(doc(db, "schools", SCHOOL_B1), { associationId: ASSOC_B, name: "Escuela B1" });
    await setDoc(doc(db, "students", "stuA"), student(SCHOOL_A1, ASSOC_A, "Alvarez"));
    await setDoc(doc(db, "students", "stuB"), student(SCHOOL_B1, ASSOC_B, "Bravo"));
    await setDoc(doc(db, "studentGroups", "grpA"), { schoolId: SCHOOL_A1, name: "Competidores", memberIds: ["stuA"] });
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("students", () => {
  it("S1: an instructor can create a student in its school", async () => {
    await assertSucceeds(setDoc(doc(asInstructorB(), "students", "new"), student(SCHOOL_B1, ASSOC_B, "Costa")));
  });

  it("A6: a student's associationId must match its school's association", async () => {
    await assertFails(setDoc(doc(asInstructorB(), "students", "mislabeled"), student(SCHOOL_B1, ASSOC_A, "X")));
  });

  it("A6: a student's associationId cannot be relabeled on update", async () => {
    await assertFails(updateDoc(doc(asInstructorB(), "students", "stuB"), { associationId: ASSOC_A }));
  });

  it("S3: a student's belt/grade can be edited in scope", async () => {
    await assertSucceeds(updateDoc(doc(asInstructorB(), "students", "stuB"), { beltGrade: "6° Gup" }));
  });

  it("S1: a school's students can be listed by surname by its own users only", async () => {
    const bySurname = (db: ReturnType<typeof asPresidentA>, schoolId: string) =>
      getDocs(query(collection(db, "students"), where("schoolId", "==", schoolId), orderBy("lastNameLower")));

    const snap = await assertSucceeds(bySurname(asInstructorB(), SCHOOL_B1));
    expect(snap.docs.map((d) => d.id)).toEqual(["stuB"]);
    await assertFails(bySurname(asInstructorB(), SCHOOL_A1));
  });
});

describe("student groups", () => {
  it("S8: a president can create a group in its association's school", async () => {
    await assertSucceeds(
      setDoc(doc(asPresidentA(), "studentGroups", "grpNew"), { schoolId: SCHOOL_A1, name: "Infantiles", memberIds: [] }),
    );
  });

  it("S9: a group's members can be changed in scope", async () => {
    await assertSucceeds(updateDoc(doc(asPresidentA(), "studentGroups", "grpA"), { memberIds: [] }));
  });

  it("S10: an instructor cannot read or change another school's group", async () => {
    await assertFails(getDoc(doc(asInstructorB(), "studentGroups", "grpA")));
    await assertFails(updateDoc(doc(asInstructorB(), "studentGroups", "grpA"), { memberIds: ["stuB"] }));
  });

  it("S8: a school's groups can be listed by its own users only", async () => {
    const groupsOf = (db: ReturnType<typeof asPresidentA>, schoolId: string) =>
      getDocs(query(collection(db, "studentGroups"), where("schoolId", "==", schoolId)));

    await assertSucceeds(groupsOf(asPresidentA(), SCHOOL_A1));
    await assertFails(groupsOf(asInstructorB(), SCHOOL_A1));
  });
});
