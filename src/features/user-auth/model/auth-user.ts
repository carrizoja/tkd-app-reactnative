/**
 * Auth domain model. Screens, navigation and tests depend on `AuthUser` and
 * `AuthError` — never on Firebase's own `User` object or its `auth/*` error
 * codes — so the Firebase SDK stays behind the data layer (design D4).
 */

/** The authenticated identity, independent of the auth provider used. */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Provider-agnostic failure reasons. `invalid-credentials` is deliberately
 * coarse: the login form must not reveal whether the address or the secret was
 * the wrong one (user-auth spec, "Invalid credentials" scenario).
 */
export type AuthErrorCode =
  | "email-already-in-use"
  | "invalid-credentials"
  | "weak-password"
  | "invalid-email"
  | "too-many-requests"
  | "network-error"
  | "cancelled"
  | "unknown";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    // Keeps `instanceof AuthError` working when the class is transpiled down.
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}
