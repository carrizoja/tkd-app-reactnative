import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PROJECT_ID = "demo-tkd";

// Two tenants:
//  - assocA owns schoolA1
//  - assocB owns schoolB1
const ASSOC_A = "assocA";
const ASSOC_B = "assocB";
const SCHOOL_A1 = "schoolA1";
const SCHOOL_B1 = "schoolB1";

// Three users:
//  - presidentA: association scope over assocA (sees every school in assocA)
//  - instructorB: school scope limited to schoolB1
//  - noMembership: authenticated but has no membership document
const PRESIDENT_A = "presidentA";
const INSTRUCTOR_B = "instructorB";
const NO_MEMBERSHIP = "noMembership";

let testEnv: RulesTestEnvironment;

function parseHostPort(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  const [host, port] = raw.split(":");
  return { host, port: Number(port) };
}

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

  // Seed baseline data with rules disabled (admin context).
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
    await setDoc(doc(db, "schools", SCHOOL_A1), {
      associationId: ASSOC_A,
      name: "School A1",
    });
    await setDoc(doc(db, "schools", SCHOOL_B1), {
      associationId: ASSOC_B,
      name: "School B1",
    });
    await setDoc(doc(db, "students", "studentA"), {
      schoolId: SCHOOL_A1,
      associationId: ASSOC_A,
      firstName: "Ana",
      lastName: "Alvarez",
      lastNameLower: "alvarez",
    });
    await setDoc(doc(db, "students", "studentB"), {
      schoolId: SCHOOL_B1,
      associationId: ASSOC_B,
      firstName: "Beto",
      lastName: "Bravo",
      lastNameLower: "bravo",
    });
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("association-scope user (president of assocA)", () => {
  it("can READ a school within its association", async () => {
    const db = testEnv.authenticatedContext(PRESIDENT_A).firestore();
    await assertSucceeds(getDoc(doc(db, "schools", SCHOOL_A1)));
  });

  it("can READ a student within its association", async () => {
    const db = testEnv.authenticatedContext(PRESIDENT_A).firestore();
    await assertSucceeds(getDoc(doc(db, "students", "studentA")));
  });

  it("can WRITE a student within its association", async () => {
    const db = testEnv.authenticatedContext(PRESIDENT_A).firestore();
    await assertSucceeds(
      setDoc(doc(db, "students", "newA"), {
        schoolId: SCHOOL_A1,
        associationId: ASSOC_A,
        firstName: "Carla",
        lastName: "Costa",
        lastNameLower: "costa",
      }),
    );
  });

  it("cannot READ a school in a different association", async () => {
    const db = testEnv.authenticatedContext(PRESIDENT_A).firestore();
    await assertFails(getDoc(doc(db, "schools", SCHOOL_B1)));
  });

  it("cannot WRITE a student in a different association", async () => {
    const db = testEnv.authenticatedContext(PRESIDENT_A).firestore();
    await assertFails(
      setDoc(doc(db, "students", "crossA"), {
        schoolId: SCHOOL_B1,
        associationId: ASSOC_B,
        firstName: "X",
        lastName: "Y",
        lastNameLower: "y",
      }),
    );
  });
});

describe("school-scope user (instructor of schoolB1)", () => {
  it("can READ a student in its own school", async () => {
    const db = testEnv.authenticatedContext(INSTRUCTOR_B).firestore();
    await assertSucceeds(getDoc(doc(db, "students", "studentB")));
  });

  it("can WRITE a student in its own school", async () => {
    const db = testEnv.authenticatedContext(INSTRUCTOR_B).firestore();
    await assertSucceeds(
      setDoc(doc(db, "students", "newB"), {
        schoolId: SCHOOL_B1,
        associationId: ASSOC_B,
        firstName: "Dora",
        lastName: "Diaz",
        lastNameLower: "diaz",
      }),
    );
  });

  it("cannot READ a student in another school", async () => {
    const db = testEnv.authenticatedContext(INSTRUCTOR_B).firestore();
    await assertFails(getDoc(doc(db, "students", "studentA")));
  });

  it("cannot WRITE a student in another school", async () => {
    const db = testEnv.authenticatedContext(INSTRUCTOR_B).firestore();
    await assertFails(
      setDoc(doc(db, "students", "crossB"), {
        schoolId: SCHOOL_A1,
        associationId: ASSOC_A,
        firstName: "X",
        lastName: "Y",
        lastNameLower: "y",
      }),
    );
  });
});

describe("user without a membership", () => {
  it("cannot read any tenant data", async () => {
    const db = testEnv.authenticatedContext(NO_MEMBERSHIP).firestore();
    await assertFails(getDoc(doc(db, "students", "studentA")));
  });

  it("can read its own (absent) membership document without error", async () => {
    const db = testEnv.authenticatedContext(NO_MEMBERSHIP).firestore();
    await assertSucceeds(getDoc(doc(db, "memberships", NO_MEMBERSHIP)));
  });
});
