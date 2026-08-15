/**
 * Test helpers for the Auth/Firestore emulator suite: wiping emulator state
 * between tests, minting unique emails, and seeding membership documents with
 * the Admin SDK (which bypasses Security Rules against the emulator, the way
 * memberships are provisioned out-of-band in production — see firestore.rules).
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const HOST = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? "127.0.0.1";
const PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-tkd";
const AUTH_PORT = 9099;
const FIRESTORE_PORT = 8085;

/** Delete every account in the Auth emulator. */
export async function clearAuthEmulator(): Promise<void> {
  await fetch(
    `http://${HOST}:${AUTH_PORT}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: "DELETE" },
  );
}

/** Delete every document in the Firestore emulator. */
export async function clearFirestoreEmulator(): Promise<void> {
  await fetch(
    `http://${HOST}:${FIRESTORE_PORT}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}

let counter = 0;
/** A collision-free email for a single test. */
export function uniqueEmail(): string {
  counter += 1;
  return `user-${Date.now()}-${counter}@example.com`;
}

function adminDb() {
  // The Admin SDK targets the emulator via FIRESTORE_EMULATOR_HOST, which
  // `firebase emulators:exec` sets for us; belt-and-suspenders default here.
  process.env.FIRESTORE_EMULATOR_HOST ??= `${HOST}:${FIRESTORE_PORT}`;
  if (getApps().length === 0) initializeApp({ projectId: PROJECT_ID });
  return getFirestore();
}

/** Seed a membership document (rules-bypassing admin write) for a real uid. */
export async function seedMembership(
  uid: string,
  data: Record<string, unknown>,
): Promise<void> {
  await adminDb().doc(`memberships/${uid}`).set(data);
}
