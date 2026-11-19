/**
 * Session = the authenticated user plus their resolved tenancy scope
 * (task 3.5, design D3).
 *
 * Scope is resolved from the auth-state stream rather than from the login call
 * so that a session restored from storage on app launch gets a scope too — the
 * spec's "persisted session" and "scope determines visible data" scenarios must
 * both hold, and only one of them goes through a login screen.
 */
import type { AuthUser } from "../model/auth-user";
import type { UserScope } from "../model/scope";
import { observeAuthState } from "./auth-service";
import { loadUserScope } from "./scope-service";

/**
 * Three states, so navigation never has to infer one from the absence of
 * another. `loading` covers both "Firebase has not reported yet" and "we are
 * resolving this user's scope"; without it an authenticated user flashes the
 * login screen while their membership is read.
 */
export type SessionState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "active"; user: AuthUser; scope: UserScope };

export interface SessionDeps {
  observeAuth?: (listener: (user: AuthUser | null) => void) => () => void;
  /** Must fail closed rather than reject; `loadUserScope` already does. */
  loadScope?: (uid: string) => Promise<UserScope>;
}

/**
 * Subscribe to the current session. Emits `loading` immediately, then tracks
 * sign-in/sign-out. Returns the unsubscribe function.
 */
export function observeSession(
  listener: (state: SessionState) => void,
  deps: SessionDeps = {},
): () => void {
  const observeAuth = deps.observeAuth ?? observeAuthState;
  const loadScope = deps.loadScope ?? loadUserScope;

  // Guards against a slow scope read for a previous user (or for a user who
  // has since signed out) landing late and overwriting the current session.
  let generation = 0;
  let last: SessionState["status"] | null = null;

  const emit = (state: SessionState) => {
    last = state.status;
    listener(state);
  };

  const emitLoading = () => {
    // Collapses the initial "waiting for Firebase" and "resolving scope" into
    // a single loading state instead of emitting it twice on first launch.
    if (last !== "loading") {
      emit({ status: "loading" });
    }
  };

  emitLoading();

  const unsubscribe = observeAuth((user) => {
    const generationAtChange = ++generation;

    if (user === null) {
      emit({ status: "signed-out" });
      return;
    }

    emitLoading();

    void loadScope(user.uid).then((scope) => {
      if (generationAtChange === generation) {
        emit({ status: "active", user, scope });
      }
    });
  });

  return () => {
    // Invalidate any in-flight resolution so it cannot emit after teardown.
    generation++;
    unsubscribe();
  };
}
