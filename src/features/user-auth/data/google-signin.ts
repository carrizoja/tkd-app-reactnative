/**
 * Google sign-in (task 3.6).
 *
 * Firebase's own `signInWithPopup` / `signInWithRedirect` do not work in React
 * Native, so the flow is two steps: the native Google sheet produces an id
 * token, and `signInWithGoogleToken` exchanges that token for a Firebase
 * session. This module owns step one and the seam between them.
 *
 * The native module needs a development build — it cannot run in Expo Go.
 */
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { googleWebClientId } from "../../../lib/env";
import { AuthError, type AuthUser } from "../model/auth-user";
import { toAuthError } from "./auth-errors";
import { signInWithGoogleToken } from "./auth-service";

/**
 * Open the Google sign-in sheet and start a Firebase session from the result.
 *
 * Throws `AuthError("cancelled")` when the user dismisses the sheet — callers
 * should treat that as a no-op, not as a failure worth reporting.
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  // Configuring on every call keeps this independent of module import order;
  // `configure` is synchronous and idempotent.
  GoogleSignin.configure({ webClientId: googleWebClientId() });

  let idToken: string | null;
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (response.type === "cancelled") {
      throw new AuthError("cancelled", "The user dismissed the Google sign-in sheet.");
    }
    idToken = response.data.idToken;
  } catch (error) {
    throw error instanceof AuthError ? error : toAuthError(error);
  }

  if (idToken === null) {
    // Google reports success without a token when `webClientId` is missing or
    // belongs to the wrong client type. Fail here rather than in Firebase.
    throw new AuthError("unknown", "Google returned no id token; check EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.");
  }

  return signInWithGoogleToken(idToken);
}
