import type { AuthUser } from "../model/auth-user";
import type { UserScope } from "../model/scope";
import { observeSession, type SessionState } from "./session";

jest.mock("./auth-service", () => ({ observeAuthState: jest.fn() }));
jest.mock("./repository", () => ({ getMembership: jest.fn() }));

const USER: AuthUser = { uid: "uid-1", email: "profe@ulji.com.ar", displayName: null };
const OTHER: AuthUser = { uid: "uid-2", email: "presi@ulji.com.ar", displayName: null };

const SCHOOL_SCOPE: UserScope = { kind: "school", schoolIds: ["school-1"] };
const ASSOCIATION_SCOPE: UserScope = { kind: "association", associationId: "assoc-1" };

const LOADING: SessionState = { status: "loading" };
const SIGNED_OUT: SessionState = { status: "signed-out" };

/** Drives the auth listener by hand instead of going through Firebase. */
function fakeAuth() {
  let emit: (user: AuthUser | null) => void = () => {};
  let unsubscribed = false;
  return {
    observeAuth: (listener: (user: AuthUser | null) => void) => {
      emit = listener;
      return () => {
        unsubscribed = true;
      };
    },
    authStateChanged: (user: AuthUser | null) => emit(user),
    get unsubscribed() {
      return unsubscribed;
    },
  };
}

describe("observeSession", () => {
  it("starts in loading before the auth state is known", () => {
    const auth = fakeAuth();
    const seen: SessionState[] = [];

    observeSession((s) => seen.push(s), {
      observeAuth: auth.observeAuth,
      loadScope: async () => SCHOOL_SCOPE,
    });

    // Firebase reports the restored session asynchronously; until it does, the
    // navigator must show a splash rather than guess "signed out".
    expect(seen).toEqual([LOADING]);
  });

  it("reports signed-out when there is no restored session", () => {
    const auth = fakeAuth();
    const seen: SessionState[] = [];

    observeSession((s) => seen.push(s), {
      observeAuth: auth.observeAuth,
      loadScope: async () => SCHOOL_SCOPE,
    });
    auth.authStateChanged(null);

    expect(seen).toEqual([LOADING, SIGNED_OUT]);
  });

  it("becomes active with the user and their resolved scope", async () => {
    const auth = fakeAuth();
    const seen: SessionState[] = [];

    observeSession((s) => seen.push(s), {
      observeAuth: auth.observeAuth,
      loadScope: async () => SCHOOL_SCOPE,
    });
    auth.authStateChanged(USER);
    await flush();

    expect(seen).toEqual([
      LOADING,
      { status: "active", user: USER, scope: SCHOOL_SCOPE },
    ]);
  });

  it("returns to loading while a newly signed-in user's scope resolves", async () => {
    const auth = fakeAuth();
    const seen: SessionState[] = [];

    observeSession((s) => seen.push(s), {
      observeAuth: auth.observeAuth,
      loadScope: async () => SCHOOL_SCOPE,
    });
    auth.authStateChanged(null);
    auth.authStateChanged(USER);
    await flush();

    expect(seen).toEqual([
      LOADING,
      SIGNED_OUT,
      LOADING,
      { status: "active", user: USER, scope: SCHOOL_SCOPE },
    ]);
  });

  it("resolves the scope for the uid that signed in", async () => {
    const auth = fakeAuth();
    const requested: string[] = [];

    observeSession(() => {}, {
      observeAuth: auth.observeAuth,
      loadScope: async (uid) => {
        requested.push(uid);
        return SCHOOL_SCOPE;
      },
    });
    auth.authStateChanged(OTHER);
    await flush();

    expect(requested).toEqual(["uid-2"]);
  });

  it("ignores a slow scope resolution once another user has signed in", async () => {
    const auth = fakeAuth();
    const seen: SessionState[] = [];
    const scopes: Record<string, UserScope> = {
      "uid-1": SCHOOL_SCOPE,
      "uid-2": ASSOCIATION_SCOPE,
    };
    // uid-1's read is slower than uid-2's, so it settles last.
    const loadScope = async (uid: string): Promise<UserScope> => {
      await delay(uid === "uid-1" ? 20 : 0);
      return scopes[uid];
    };

    observeSession((s) => seen.push(s), { observeAuth: auth.observeAuth, loadScope });
    auth.authStateChanged(USER);
    auth.authStateChanged(OTHER);
    await delay(50);

    expect(seen).toEqual([
      LOADING,
      { status: "active", user: OTHER, scope: ASSOCIATION_SCOPE },
    ]);
  });

  it("ignores a slow scope resolution once the user has signed out", async () => {
    const auth = fakeAuth();
    const seen: SessionState[] = [];
    const loadScope = async (): Promise<UserScope> => {
      await delay(20);
      return SCHOOL_SCOPE;
    };

    observeSession((s) => seen.push(s), { observeAuth: auth.observeAuth, loadScope });
    auth.authStateChanged(USER);
    auth.authStateChanged(null);
    await delay(50);

    // Without the guard the in-flight read lands after sign-out and hands the
    // signed-out app an authenticated session.
    expect(seen).toEqual([LOADING, SIGNED_OUT]);
  });

  it("does not emit after unsubscribing", async () => {
    const auth = fakeAuth();
    const seen: SessionState[] = [];
    const loadScope = async (): Promise<UserScope> => {
      await delay(20);
      return SCHOOL_SCOPE;
    };

    const unsubscribe = observeSession((s) => seen.push(s), {
      observeAuth: auth.observeAuth,
      loadScope,
    });
    auth.authStateChanged(USER);
    unsubscribe();
    await delay(50);

    expect(auth.unsubscribed).toBe(true);
    expect(seen).toEqual([LOADING]);
  });
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const flush = () => delay(0);
