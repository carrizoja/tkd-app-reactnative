/**
 * The auth gate (task 3.7), kept as a pure function so the rule "Home hub only
 * when authenticated *and* scoped" is testable without mounting a navigator.
 */
import type { SessionState } from "../features/user-auth/data/session";
import { hasTenancy } from "../features/user-auth/model/scope";

export type RootRoute =
  /** Session not yet known — show a splash, never guess "signed out". */
  | "splash"
  /** No session — login / registration. */
  | "auth"
  /** Authenticated and scoped — the capability hub. */
  | "home"
  /** Authenticated but without usable tenancy — explain, do not show an empty hub. */
  | "no-tenancy";

export function routeForSession(state: SessionState): RootRoute {
  switch (state.status) {
    case "loading":
      return "splash";
    case "signed-out":
      return "auth";
    case "active":
      return hasTenancy(state.scope) ? "home" : "no-tenancy";
  }
}
