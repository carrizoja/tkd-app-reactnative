/**
 * Firestore Security Rules for payment records (OpenSpec 8.1,
 * odd/tasks/fee-management.md S2, S3, S6, A3). Uses its own tenant ids and
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
} from "firebase/firestore";

const PROJECT_ID = "demo-tkd";

// pAssocA owns pSchoolA1 and pSchoolA2; pAssocB owns pSchoolB1.
const ASSOC_A = "pAssocA";
const ASSOC_B = "pAssocB";
const SCHOOL_A1 = "pSchoolA1";
const SCHOOL_A2 = "pSchoolA2";
const SCHOOL_B1 = "pSchoolB1";
const PRESIDENT_A = "pPresidentA";
const INSTRUCTOR_B = "pInstructorB";
const PERIOD = "2026-11";

let testEnv: RulesTestEnvironment;

function parseHostPort(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const [host, port] = raw.split(":");
  return { host, port: Number(port) };
}

const asPresidentA = () => testEnv.authenticatedContext(PRESIDENT_A).firestore();
const asInstructorB = () => testEnv.authenticatedContext(INSTRUCTOR_B).firestore();

const payment = (studentId: string, schoolId: string, period = PERIOD, amount: unknown = 15000) => ({
  studentId,
  schoolId,
  period,
  amount,
  status: "paid",
  method: "cash",
  paidAt: "2026-11-23T15:00:00.000Z",
});

type Payment = ReturnType<typeof payment>;
type Db = ReturnType<typeof asPresidentA>;

const idOf = (p: { studentId: string; period: string }) => `${p.studentId}_${p.period}`;

/** Writes a payment under its deterministic id. */
const pay = (db: Db, p: Payment | Record<string, unknown>, id = idOf(p as Payment)) =>
  setDoc(doc(db, "payments", id), p);

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
    await setDoc(doc(db, "schools", SCHOOL_A2), { associationId: ASSOC_A, name: "Escuela A2" });
    await setDoc(doc(db, "schools", SCHOOL_B1), { associationId: ASSOC_B, name: "Escuela B1" });
    await setDoc(doc(db, "students", "stuA1"), { schoolId: SCHOOL_A1, associationId: ASSOC_A });
    await setDoc(doc(db, "students", "stuA1b"), { schoolId: SCHOOL_A1, associationId: ASSOC_A });
    await setDoc(doc(db, "students", "stuA2"), { schoolId: SCHOOL_A2, associationId: ASSOC_A });
    await setDoc(doc(db, "students", "stuB1"), { schoolId: SCHOOL_B1, associationId: ASSOC_B });
    await setDoc(doc(db, "students", "stuB2"), { schoolId: SCHOOL_B1, associationId: ASSOC_B });
    await pay(db, payment("stuA1", SCHOOL_A1));
    await pay(db, payment("stuB1", SCHOOL_B1));
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("payments", () => {
  it("S1: a president can register a payment for a student of its school", async () => {
    await assertSucceeds(pay(asPresidentA(), payment("stuA1b", SCHOOL_A1)));
  });

  it("S1: an instructor can register a payment for a student of its own school", async () => {
    await assertSucceeds(pay(asInstructorB(), payment("stuB2", SCHOOL_B1)));
  });

  it("S1: a student can pay another period", async () => {
    await assertSucceeds(pay(asPresidentA(), payment("stuA1", SCHOOL_A1, "2026-10")));
  });

  it("S2: a paid period cannot be paid again or overwritten", async () => {
    await assertFails(pay(asPresidentA(), payment("stuA1", SCHOOL_A1, PERIOD, 20000)));
    await assertFails(updateDoc(doc(asPresidentA(), "payments", `stuA1_${PERIOD}`), { amount: 1 }));
  });

  it("S2/A3: a payment must use the id `${studentId}_${period}`", async () => {
    await assertFails(pay(asPresidentA(), payment("stuA1b", SCHOOL_A1), "random-id"));
    await assertFails(pay(asPresidentA(), payment("stuA1b", SCHOOL_A1), "stuA1b_2026-10"));
  });

  it("A3: the period must be YYYY-MM", async () => {
    for (const period of ["2026-1", "202611", "2026-11-01"]) {
      await assertFails(pay(asPresidentA(), payment("stuA1b", SCHOOL_A1, period)));
    }
  });

  it("A1/A3: the amount must be a number greater than 0", async () => {
    for (const amount of [0, -100, "15000", null]) {
      await assertFails(pay(asPresidentA(), payment("stuA1b", SCHOOL_A1, PERIOD, amount)));
    }
    await assertSucceeds(pay(asPresidentA(), payment("stuA1b", SCHOOL_A1, PERIOD, 12500.5)));
  });

  it("S1/S3: a payment must be marked paid and cash", async () => {
    await assertFails(pay(asPresidentA(), { ...payment("stuA1b", SCHOOL_A1), status: "pending" }));
    await assertFails(pay(asPresidentA(), { ...payment("stuA1b", SCHOOL_A1), method: "card" }));
    const { method: _method, ...noMethod } = payment("stuA1b", SCHOOL_A1);
    await assertFails(pay(asPresidentA(), noMethod, idOf(noMethod)));
  });

  it("A3: the student must belong to the payment's school", async () => {
    // stuA2 is in pSchoolA2, which the president also reaches.
    await assertFails(pay(asPresidentA(), payment("stuA2", SCHOOL_A1)));
    await assertFails(pay(asPresidentA(), payment("stuMissing", SCHOOL_A1)));
  });

  it("S6: nobody registers a payment in a school outside their scope", async () => {
    await assertFails(pay(asInstructorB(), payment("stuA1b", SCHOOL_A1)));
    await assertFails(pay(asPresidentA(), payment("stuB2", SCHOOL_B1)));
  });

  it("S6: a member reads payments of its school and not of another", async () => {
    await assertSucceeds(getDoc(doc(asPresidentA(), "payments", `stuA1_${PERIOD}`)));
    await assertFails(getDoc(doc(asPresidentA(), "payments", `stuB1_${PERIOD}`)));
    await assertSucceeds(
      getDocs(query(collection(asInstructorB(), "payments"), where("schoolId", "==", SCHOOL_B1), where("period", "==", PERIOD))),
    );
    await assertFails(
      getDocs(query(collection(asInstructorB(), "payments"), where("schoolId", "==", SCHOOL_A1), where("period", "==", PERIOD))),
    );
  });

  it("A3: a member can delete a payment of its school and not of another", async () => {
    await assertFails(deleteDoc(doc(asInstructorB(), "payments", `stuA1_${PERIOD}`)));
    await assertSucceeds(deleteDoc(doc(asPresidentA(), "payments", `stuA1_${PERIOD}`)));
  });
});
