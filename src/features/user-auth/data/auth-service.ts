/**
 * Authentication data layer. The only module that talks to Firebase Auth; it
 * translates the SDK's `User` and `auth/*` errors into the capability's own
 * `AuthUser` / `AuthError` model so screens stay provider-agnostic (design D4).
 */
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "../../../lib/firebase";
import type { AuthUser } from "../model/auth-user";
import { toAuthError } from "./auth-errors";

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
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

/**
 * Exchange a Google ID token for a Firebase session.
 *
 * The token itself comes from whichever native/browser Google flow the app
 * uses — Firebase's own `signInWithPopup`/`signInWithRedirect` do NOT work in
 * React Native, so acquisition always happens outside this module and only the
 * resulting token is exchanged here.
 */
export async function signInWithGoogleToken(idToken: string): Promise<AuthUser> {
  try {
    const credential = await signInWithCredential(
      getFirebaseAuth(),
      GoogleAuthProvider.credential(idToken),
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
