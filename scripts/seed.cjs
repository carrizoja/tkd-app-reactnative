/**
 * Development seed for the Firebase emulator. Run with:
 *
 *   npm run seed
 *
 * which wraps this script in `firebase emulators:exec` so the Admin SDK picks
 * up the emulator via FIRESTORE_EMULATOR_HOST and writes with rules bypassed.
 * It creates one association, one school, one sede, a handful of students, and
 * example memberships (association-scope + school-scope) so the app has data to
 * render against the emulator.
 *
 * CommonJS (not TypeScript/ESM): `firebase emulators:exec` runs scripts with
 * Firebase's bundled Node runtime, which loads the script via require().
 */
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = process.env.GCLOUD_PROJECT || "demo-tkd";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "FIRESTORE_EMULATOR_HOST is not set. Run this via `npm run seed` so it " +
      "executes inside the Firebase emulator (never against real Firebase).",
  );
}

// Admin SDK needs no credentials when targeting the emulator.
initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

const ASSOCIATION_ID = "assoc-demo";
const SCHOOL_ID = "school-central";
const SEDE_ID = "sede-norte";

// Demo users (create matching accounts in the Auth emulator to sign in as
// them; the uid must equal the membership document id).
const PRESIDENT_UID = "demo-president";
const INSTRUCTOR_UID = "demo-instructor";

const STUDENTS = [
  { id: "student-1", firstName: "Ana", lastName: "Alvarez", beltGrade: "10 Gup" },
  { id: "student-2", firstName: "Bruno", lastName: "Benitez", beltGrade: "8 Gup" },
  { id: "student-3", firstName: "Carla", lastName: "Castro", beltGrade: "1 Dan" },
  { id: "student-4", firstName: "Diego", lastName: "Diaz", beltGrade: "4 Gup" },
];

async function seed() {
  await db.doc(`associations/${ASSOCIATION_ID}`).set({
    name: "Asociacion Metropolitana de Taekwondo",
  });

  await db.doc(`schools/${SCHOOL_ID}`).set({
    associationId: ASSOCIATION_ID,
    name: "Escuela Central",
  });

  await db.doc(`sedes/${SEDE_ID}`).set({
    schoolId: SCHOOL_ID,
    associationId: ASSOCIATION_ID,
    name: "Sede Norte",
    address: "Av. Siempre Viva 742",
  });

  for (const s of STUDENTS) {
    await db.doc(`students/${s.id}`).set({
      schoolId: SCHOOL_ID,
      associationId: ASSOCIATION_ID,
      firstName: s.firstName,
      lastName: s.lastName,
      lastNameLower: s.lastName.trim().toLowerCase(),
      beltGrade: s.beltGrade,
    });
  }

  await db.doc(`memberships/${PRESIDENT_UID}`).set({
    scope: "association",
    associationId: ASSOCIATION_ID,
  });

  await db.doc(`memberships/${INSTRUCTOR_UID}`).set({
    scope: "school",
    schoolIds: [SCHOOL_ID],
  });

  console.log(
    `Seeded: 1 association, 1 school, 1 sede, ${STUDENTS.length} students, ` +
      `2 memberships into project ${PROJECT_ID}`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
