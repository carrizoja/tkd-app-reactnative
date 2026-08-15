/**
 * Authentication data layer. The only module that talks to Firebase Auth; it
 * translates the SDK's `User` and `auth/*` errors into the capability's own
 * `AuthUser` / `AuthError` model so screens stay provider-agnostic (design D4).
 */
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "../../../lib/firebase";
import { AuthError, type AuthUser } from "../model/auth-user";

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
}

function providerErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

/**
 * Maps Firebase error codes onto `AuthError`. Messages here are technical and
 * English; Spanish user-facing copy lives in the UI layer (`ui/messages.ts`).
 */
function toAuthError(error: unknown): AuthError {
  switch (providerErrorCode(error)) {
    case "auth/email-already-in-use":
      return new AuthError("email-already-in-use", "That address is already taken.");
    // Firebase collapses wrong-password / unknown-user into `invalid-credential`
    // when email-enumeration protection is on; older codes are kept for safety.
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return new AuthError("invalid-credentials", "Invalid credentials.");
    case "auth/weak-password":
      return new AuthError("weak-password", "The password is too weak.");
    case "auth/invalid-email":
      return new AuthError("invalid-email", "Malformed address.");
    case "auth/too-many-requests":
      return new AuthError("too-many-requests", "Too many attempts, try again later.");
    case "auth/network-request-failed":
      return new AuthError("network-error", "Network request failed.");
    default:
      return new AuthError("unknown", "Authentication failed.");
  }
}

/** Create an account and start an authenticated session. */
export async function registerWithEmail(
  email: string,
  password: string,
): Promise<AuthUser> {
  try {
    const credential = await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      email,
      password,
    );
    return toAuthUser(credential.user);
  } catch (error) {
    throw toAuthError(error);
  }
}

/** Sign in an existing account with email and password. */
export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AuthUser> {
  try {
    const credential = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      email,
      password,
    );
    return toAuthUser(credential.user);
  } catch (error) {
    throw toAuthError(error);
  }
}

/** End the session. */
export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** The currently signed-in user, or null. Synchronous SDK state. */
export function getCurrentUser(): AuthUser | null {
  const user = getFirebaseAuth().currentUser;
  return user ? toAuthUser(user) : null;
}

/**
 * Subscribe to session changes; fires once with the restored session on start
 * and again on every sign-in/sign-out. Returns the unsubscribe function.
 */
export function observeAuthState(
  listener: (user: AuthUser | null) => void,
): () => void {
  return onAuthStateChanged(getFirebaseAuth(), (user) => {
    listener(user ? toAuthUser(user) : null);
  });
}
