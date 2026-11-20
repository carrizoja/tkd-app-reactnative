/**
 * Loads async data for a screen and exposes a manual `reload`. A failed load is
 * logged and surfaced as `error` so the screen can offer a retry, never shown
 * as an empty list (which would read as "you have no schools").
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error" };

export function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    loadRef.current().then(
      (data) => active && setState({ status: "ready", data }),
      (error) => {
        console.warn("School data could not be loaded.", error);
        if (active) setState({ status: "error" });
      },
    );
    return () => {
      active = false;
    };
    // `deps` are the caller's inputs; `attempt` re-runs the load on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, reload };
}
