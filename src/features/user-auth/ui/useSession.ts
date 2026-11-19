/**
 * React binding for the session stream (task 3.7). Kept as the only place the
 * navigator touches `observeSession`, so screens stay free of subscription
 * bookkeeping.
 */
import { useCallback, useEffect, useState } from "react";
import { observeSession, type SessionState } from "../data/session";

export interface UseSessionResult {
  session: SessionState;
  /**
   * Re-subscribe, which re-resolves the scope for the signed-in user. Scope is
   * read once per subscription, so this is how a user picks up a membership
   * granted after they signed in, or retries a read that failed.
   */
  refresh: () => void;
}

export function useSession(): UseSessionResult {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const [subscription, setSubscription] = useState(0);

  useEffect(() => {
    // `observeSession` emits `loading` synchronously on subscribe, so a refresh
    // returns the UI to the splash while the membership is re-read.
    return observeSession(setState);
  }, [subscription]);

  const refresh = useCallback(() => setSubscription((n) => n + 1), []);

  return { session: state, refresh };
}
