/**
 * Task 3.1 — registration behavior against the Auth emulator.
 * Covers the user-auth spec "Instructor registration" requirement:
 * successful registration starts a session; a duplicate email is rejected.
 */
import {
  getCurrentUser,
  registerWithEmail,
  signOutUser,
} from "../src/features/user-auth/data/auth-service";
import { AuthError } from "../src/features/user-auth/model/auth-user";
import { clearAuthEmulator, uniqueEmail } from "./helpers";

const PASSWORD = "Secret123!";

describe("registration (Auth emulator)", () => {
  beforeEach(async () => {
    await clearAuthEmulator();
    await signOutUser();
  });

  it("creates an account and starts an authenticated session", async () => {
    const email = uniqueEmail();

    const user = await registerWithEmail(email, PASSWORD);

    expect(user.uid).toBeTruthy();
    expect(user.email).toBe(email);
    // Session started: the SDK now reports a current user.
    expect(getCurrentUser()?.uid).toBe(user.uid);
  });

  it("rejects a duplicate email and reports it as taken", async () => {
    const email = uniqueEmail();
    await registerWithEmail(email, PASSWORD);
    await signOutUser();

    const error = await registerWithEmail(email, PASSWORD).catch((e) => e);

    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe("email-already-in-use");
  });
});
