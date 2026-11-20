/**
 * Storage Security Rules for student photos (OpenSpec 5.1,
 * odd/tasks/student-management.md S2, S10, A5). The Storage rules resolve the
 * caller's membership through Firestore, so this suite needs both emulators
 * (`npm run test:rules` starts them).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";

const PROJECT_ID = "demo-tkd";

const ASSOC_A = "pAssocA";
const ASSOC_B = "pAssocB";
const SCHOOL_A1 = "pSchoolA1";
const SCHOOL_B1 = "pSchoolB1";
const PRESIDENT_A = "pPresidentA";
const INSTRUCTOR_B = "pInstructorB";

const PHOTO_A = `students/${SCHOOL_A1}/stuA/photo.jpg`;
const PHOTO_B = `students/${SCHOOL_B1}/stuB/photo.jpg`;
const IMAGE = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const MB = 1024 * 1024;

let testEnv: RulesTestEnvironment;

function hostPort(variable: string, fallback: string): { host: string; port: number } {
  const [host, port] = (process.env[variable] ?? fallback).split(":");
  return { host, port: Number(port) };
}

const storageAs = (uid: string) => testEnv.authenticatedContext(uid).storage();
// `put` returns an UploadTask, which is thenable but not a Promise; wrapping it
// lets assertSucceeds/assertFails type-check.
const upload = (uid: string, path: string, bytes: Uint8Array, contentType: string) =>
  Promise.resolve(storageAs(uid).ref(path).put(bytes, { contentType }));

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      ...hostPort("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080"),
      rules: readFileSync(resolve(__dirname, "..", "firestore.rules"), "utf8"),
    },
    storage: {
      ...hostPort("FIREBASE_STORAGE_EMULATOR_HOST", "127.0.0.1:9199"),
      rules: readFileSync(resolve(__dirname, "..", "storage.rules"), "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.clearStorage();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "memberships", PRESIDENT_A), { scope: "association", associationId: ASSOC_A });
    await setDoc(doc(db, "memberships", INSTRUCTOR_B), { scope: "school", schoolIds: [SCHOOL_B1] });
    await setDoc(doc(db, "schools", SCHOOL_A1), { associationId: ASSOC_A, name: "Escuela A1" });
    await setDoc(doc(db, "schools", SCHOOL_B1), { associationId: ASSOC_B, name: "Escuela B1" });
    await context.storage().ref(PHOTO_A).put(IMAGE, { contentType: "image/jpeg" });
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe("student photos", () => {
  it("S2: a user can upload a photo for a student of its school", async () => {
    await assertSucceeds(upload(INSTRUCTOR_B, PHOTO_B, IMAGE, "image/jpeg"));
    await assertSucceeds(upload(PRESIDENT_A, `students/${SCHOOL_A1}/stuA/photo.png`, IMAGE, "image/png"));
  });

  it("S2: a user can view and delete a photo of its school", async () => {
    await assertSucceeds(storageAs(PRESIDENT_A).ref(PHOTO_A).getDownloadURL());
    await assertSucceeds(storageAs(PRESIDENT_A).ref(PHOTO_A).delete());
  });

  it("S10: a user cannot upload, view or delete another school's photos", async () => {
    await assertFails(upload(INSTRUCTOR_B, `students/${SCHOOL_A1}/stuA/photo.jpg`, IMAGE, "image/jpeg"));
    await assertFails(storageAs(INSTRUCTOR_B).ref(PHOTO_A).getDownloadURL());
    await assertFails(storageAs(INSTRUCTOR_B).ref(PHOTO_A).delete());
  });

  it("A5: only images can be uploaded", async () => {
    await assertFails(upload(INSTRUCTOR_B, PHOTO_B, IMAGE, "application/pdf"));
  });

  it("A5: SVG is refused because it can carry scripts", async () => {
    await assertFails(upload(INSTRUCTOR_B, PHOTO_B, IMAGE, "image/svg+xml"));
  });

  it("A5: common photo formats are accepted", async () => {
    for (const type of ["image/png", "image/webp", "image/heic", "image/heif"]) {
      await assertSucceeds(upload(INSTRUCTOR_B, PHOTO_B, IMAGE, type));
    }
  });

  it("A5: images must be smaller than 5 MB", async () => {
    await assertFails(upload(INSTRUCTOR_B, PHOTO_B, new Uint8Array(5 * MB), "image/jpeg"));
  });
});
