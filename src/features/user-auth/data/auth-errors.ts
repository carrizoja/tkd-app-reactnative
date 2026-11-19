/**
 * Translates Firebase `auth/*` codes into the capability's own `AuthError`
 * (design D4). Kept free of any Firebase import so the mapping — the part with
 * actual decisions in it — is unit-testable without the SDK in the module graph.
 */
import { AuthError, type AuthErrorCode } from "../model/auth-user";

function providerErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return "";
}

const MESSAGES: Record<AuthErrorCode, string> = {
  "email-already-in-use": "That address is already taken.",
  "invalid-credentials": "Invalid credentials.",
  "weak-password": "The password is too weak.",
  "invalid-email": "Malformed address.",
  "too-many-requests": "Too many attempts, try again later.",
  "network-error": "Network request failed.",
  cancelled: "The user cancelled the sign-in.",
  "account-exists-with-other-provider":
    "That address already has an account created with another provider.",
  unknown: "Authentication failed.",
};

function codeFor(providerCode: string): AuthErrorCode {
  switch (providerCode) {
    case "auth/email-already-in-use":
      return "email-already-in-use";
    // Firebase collapses wrong-password / unknown-user into `invalid-credential`
    // when email-enumeration protection is on; older codes are kept for safety.
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "invalid-credentials";
    case "auth/weak-password":
      return "weak-password";
    case "auth/invalid-email":
      return "invalid-email";
    case "auth/too-many-requests":
      return "too-many-requests";
    case "auth/network-request-failed":
      return "network-error";
    case "auth/user-cancelled":
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "cancelled";
    case "auth/account-exists-with-different-credential":
      return "account-exists-with-other-provider";
    default:
      return "unknown";
  }
}

/**
 * Map any thrown value onto an `AuthError`. Messages here are technical and
 * English; Spanish user-facing copy lives in the UI layer (`ui/copy.ts`).
 */
export function toAuthError(error: unknown): AuthError {
  const code = codeFor(providerErrorCode(error));
  return new AuthError(code, MESSAGES[code]);
}
