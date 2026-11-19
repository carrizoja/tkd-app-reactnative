import type { AuthUser } from "../features/user-auth/model/auth-user";
import type { UserScope } from "../features/user-auth/model/scope";
import type { SessionState } from "../features/user-auth/data/session";
import { routeForSession } from "./routeForSession";

const USER: AuthUser = { uid: "uid-1", email: "profe@ulji.com.ar", displayName: null };

const active = (scope: UserScope): SessionState => ({ status: "active", user: USER, scope });

describe("routeForSession", () => {
  it("shows the splash while the session is still unknown", () => {
    expect(routeForSession({ status: "loading" })).toBe("splash");
  });

  it("shows the auth screens when nobody is signed in", () => {
    expect(routeForSession({ status: "signed-out" })).toBe("auth");
  });

  it("shows the Home hub to a school-scope instructor", () => {
    expect(routeForSession(active({ kind: "school", schoolIds: ["school-1"] }))).toBe("home");
  });

  it("shows the Home hub to an association-scope president", () => {
    expect(routeForSession(active({ kind: "association", associationId: "assoc-1" }))).toBe(
      "home",
    );
  });

  it("keeps an authenticated but unassigned user out of the Home hub", () => {
    // Authenticated is not the same as authorized: the Home hub would render
    // empty lists and read as a broken app.
    expect(routeForSession(active({ kind: "unassigned" }))).toBe("no-tenancy");
  });

  it("keeps a user whose scope could not be read out of the Home hub", () => {
    expect(routeForSession(active({ kind: "unavailable" }))).toBe("no-tenancy");
  });
});
