/**
 * Task 3.3 — login, session persistence and sign out against the Auth emulator.
 * Covers the user-auth spec "Login" and "Session and scope resolution"
 * requirements (valid credentials, invalid credentials, persisted session,
 * sign out).
 */
import {
  getCurrentUser,
  loginWithEmail,
  observeAuthState,
  registerWithEmail,
  signOutUser,
} from "../src/features/user-auth/data/auth-service";
import { AuthError } from "../src/features/user-auth/model/auth-user";
import type { AuthUser } from "../src/features/user-auth/model/auth-user";
import { clearAuthEmulator, uniqueEmail } from "./helpers";

const PASSWORD = "Secret123!";

describe("login (Auth emulator)", () => {
  beforeEach(async () => {
    await clearAuthEmulator();
    await signOutUser();
  });

  it("authenticates a user with valid credentials", async () => {
    const email = uniqueEmail();
    await registerWithEmail(email, PASSWORD);
    await signOutUser();

    const user = await loginWithEmail(email, PASSWORD);

    expect(user.email).toBe(email);
    expect(getCurrentUser()?.email).toBe(email);
  });

  it("denies a wrong password without revealing which field was wrong", async () => {
    const email = uniqueEmail();
    await registerWithEmail(email, PASSWORD);
    await signOutUser();

    const error = await loginWithEmail(email, "WrongPass9!").catch((e) => e);

    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe("invalid-credentials");
    expect(error.message.toLowerCase()).not.toContain("password");
    expect(error.message.toLowerCase()).not.toContain("email");
    expect(getCurrentUser()).toBeNull();
  });

  it("keeps the user signed in (persisted session) until sign out", async () => {
    const email = uniqueEmail();
    await registerWithEmail(email, PASSWORD);

    // The session survives without re-login: the SDK still reports the user,
    // and a fresh auth-state observer is called back with them.
    expect(getCurrentUser()?.email).toBe(email);
    const restored = await new Promise<AuthUser | null>((resolve) => {
      const unsubscribe = observeAuthState((u) => {
        unsubscribe();
        resolve(u);
      });
    });
    expect(restored?.email).toBe(email);
  });

  it("ends the session on sign out", async () => {
    const email = uniqueEmail();
    await registerWithEmail(email, PASSWORD);

    await signOutUser();

    expect(getCurrentUser()).toBeNull();
  });
});
