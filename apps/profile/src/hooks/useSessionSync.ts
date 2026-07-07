import { useEffect } from "react";
import { on } from "@mfe/event-bus";
import { useAppDispatch } from "../store/hooks";
import { sessionEnded, sessionStarted } from "../store/sessionSlice";
import { sessionApi } from "../api/sessionApi";

// Subscribes this app's local (decoupled) store to auth-app's session
// lifecycle via safe browser CustomEvents — the only channel allowed
// between app boundaries. See docs/02-state-management.md.
//
// The event bus alone only tells this app about logins that happen *while
// it's mounted and listening* — navigating straight to /profile after a
// login that happened before profile-app ever mounted would otherwise leave
// this app thinking nobody's signed in. The GET /session check below closes
// that gap independently, the same way auth-app's own bootstrap does.
export function useSessionSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;
    sessionApi
      .get<{ user: { id: string } }>("/session")
      .then((res) => {
        if (!cancelled) dispatch(sessionStarted({ userId: res.data.user.id }));
      })
      .catch(() => {
        // No active session — leave as "not signed in".
      });

    const offLogin = on("auth:login", ({ userId }) => dispatch(sessionStarted({ userId })));
    const offLogout = on("auth:logout", () => dispatch(sessionEnded()));
    return () => {
      cancelled = true;
      offLogin();
      offLogout();
    };
  }, [dispatch]);
}
