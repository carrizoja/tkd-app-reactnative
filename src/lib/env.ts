/**
 * Firebase configuration is read from `EXPO_PUBLIC_*` environment variables.
 * Expo statically inlines any variable prefixed with `EXPO_PUBLIC_` into the
 * client bundle, so no secrets beyond the (public by design) Firebase web
 * config live here. See `.env.example` for the required keys.
 */
export type FirebaseEnv = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

export function readFirebaseEnv(): FirebaseEnv {
  return {
    apiKey: required(
      "EXPO_PUBLIC_FIREBASE_API_KEY",
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    ),
    authDomain: required(
      "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    ),
    projectId: required(
      "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    ),
    storageBucket: required(
      "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    ),
    messagingSenderId: required(
      "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    ),
    appId: required(
      "EXPO_PUBLIC_FIREBASE_APP_ID",
      process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    ),
  };
}

/** True when the app should talk to the local Firebase Emulator Suite. */
export function useEmulator(): boolean {
  return process.env.EXPO_PUBLIC_USE_EMULATOR === "1";
}

/** Host the emulators are reachable on (override for physical devices). */
export function emulatorHost(): string {
  return process.env.EXPO_PUBLIC_EMULATOR_HOST ?? "127.0.0.1";
}
