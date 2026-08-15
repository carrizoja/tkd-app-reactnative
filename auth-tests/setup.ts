/**
 * Jest `setupFiles` for the "auth" project. Runs before any test module (and
 * therefore before `src/lib/firebase.ts` is imported) so the Firebase client
 * SDK initializes in emulator mode with a harmless demo web config. Real keys
 * never reach these tests — they always talk to the local Auth + Firestore
 * emulators started by `npm run test:auth`.
 */
process.env.EXPO_PUBLIC_USE_EMULATOR = "1";
process.env.EXPO_PUBLIC_EMULATOR_HOST ??= "127.0.0.1";
process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??= "demo-api-key";
process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??= "demo-tkd.firebaseapp.com";
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ??= "demo-tkd";
process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??= "demo-tkd.appspot.com";
process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??= "0";
process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??= "demo-app-id";
