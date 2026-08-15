/**
 * Shared Firebase initializer. This is the ONLY module in the app that imports
 * the Firebase SDK app/auth/firestore/storage entry points. Feature code must
 * go through the repository layer (`src/lib/repository.ts` + each capability's
 * `data/` folder) and never import `firebase/firestore` directly.
 *
 * When `EXPO_PUBLIC_USE_EMULATOR=1` the SDK is pointed at the local Firebase
 * Emulator Suite (see `firebase.json`) instead of the real project.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage";
import { emulatorHost, readFirebaseEnv, useEmulator } from "./env";

let cachedApp: FirebaseApp | undefined;
let cachedAuth: Auth | undefined;
let emulatorsConnected = false;

function firebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length > 0 ? getApp() : initializeApp(readFirebaseEnv());
  return cachedApp;
}

/**
 * React Native storage-backed persistence, or `undefined` outside React Native.
 *
 * `firebase/auth` resolves to a different build per platform: Metro picks the
 * `react-native` one, which exports `getReactNativePersistence`, while the Node
 * build used by the emulator test suite does not export it (and cannot load
 * AsyncStorage's native module). Both lookups are therefore deliberately lazy.
 */
function reactNativePersistence(): Persistence | undefined {
  const authSdk = require("firebase/auth") as {
    getReactNativePersistence?: (storage: unknown) => Persistence;
  };
  if (!authSdk.getReactNativePersistence) return undefined;
  const asyncStorage = require("@react-native-async-storage/async-storage")
    .default as unknown;
  return authSdk.getReactNativePersistence(asyncStorage);
}

/**
 * Auth instance with a session that survives app restarts (user-auth spec,
 * "Persisted session"). Without an explicit persistence React Native falls back
 * to in-memory sessions, which would sign the instructor out on every launch.
 */
export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    const persistence = reactNativePersistence();
    cachedAuth = persistence
      ? initializeAuth(firebaseApp(), { persistence })
      : getAuth(firebaseApp());
  }
  connectEmulatorsOnce(cachedAuth, getFirestore(firebaseApp()), getStorage(firebaseApp()));
  return cachedAuth;
}

export function getDb(): Firestore {
  const db = getFirestore(firebaseApp());
  // Via `getFirebaseAuth()`, never `getAuth()`: creating the default Auth
  // instance first would make the persistent `initializeAuth` below it throw
  // `auth/already-initialized`.
  connectEmulatorsOnce(getFirebaseAuth(), db, getStorage(firebaseApp()));
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  const storage = getStorage(firebaseApp());
  connectEmulatorsOnce(getFirebaseAuth(), getFirestore(firebaseApp()), storage);
  return storage;
}

function connectEmulatorsOnce(
  auth: Auth,
  db: Firestore,
  storage: FirebaseStorage,
): void {
  if (emulatorsConnected || !useEmulator()) return;
  emulatorsConnected = true;
  const host = emulatorHost();
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8085);
  connectStorageEmulator(storage, host, 9199);
}
