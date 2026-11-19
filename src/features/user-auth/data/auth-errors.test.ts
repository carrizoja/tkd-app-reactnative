import { AuthError } from "../model/auth-user";
import { toAuthError } from "./auth-errors";

/** Firebase rejects with an object carrying a `code`; this mimics that shape. */
const firebaseError = (code: string) => ({ code, message: "ignored" });

describe("toAuthError", () => {
  it("always produces an AuthError", () => {
    expect(toAuthError(firebaseError("auth/invalid-email"))).toBeInstanceOf(AuthError);
  });

  it("reports a taken address on registration", () => {
    expect(toAuthError(firebaseError("auth/email-already-in-use")).code).toBe(
      "email-already-in-use",
    );
  });

  it.each([
    "auth/invalid-credential",
    "auth/invalid-login-credentials",
    "auth/wrong-password",
    "auth/user-not-found",
  ])("collapses %s into one generic invalid-credentials code", (code) => {
    // The login form must never reveal which field was wrong.
    expect(toAuthError(firebaseError(code)).code).toBe("invalid-credentials");
  });

  it("maps a weak password", () => {
    expect(toAuthError(firebaseError("auth/weak-password")).code).toBe("weak-password");
  });

  it("maps a malformed address", () => {
    expect(toAuthError(firebaseError("auth/invalid-email")).code).toBe("invalid-email");
  });

  it("maps throttling", () => {
    expect(toAuthError(firebaseError("auth/too-many-requests")).code).toBe("too-many-requests");
  });

  it("maps a network failure", () => {
    expect(toAuthError(firebaseError("auth/network-request-failed")).code).toBe("network-error");
  });

  it("maps an aborted social sign-in to cancelled", () => {
    // Dismissing the Google/Facebook sheet is not an error worth alarming about.
    expect(toAuthError(firebaseError("auth/user-cancelled")).code).toBe("cancelled");
    expect(toAuthError(firebaseError("auth/popup-closed-by-user")).code).toBe("cancelled");
  });

  it("maps an email already claimed by a different provider", () => {
    // Telling this user "invalid credentials" would be a dead end: their
    // account exists, just under another sign-in method.
    expect(toAuthError(firebaseError("auth/account-exists-with-different-credential")).code).toBe(
      "account-exists-with-other-provider",
    );
  });

  it("falls back to unknown for an unrecognised code", () => {
    expect(toAuthError(firebaseError("auth/some-new-code")).code).toBe("unknown");
  });

  it("falls back to unknown for a thrown value that has no code", () => {
    expect(toAuthError(new Error("boom")).code).toBe("unknown");
    expect(toAuthError(null).code).toBe("unknown");
    expect(toAuthError("string failure").code).toBe("unknown");
  });
});
