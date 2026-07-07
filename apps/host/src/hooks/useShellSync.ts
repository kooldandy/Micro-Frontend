import { useEffect } from "react";
import { on } from "@mfe/event-bus";
import { useAppDispatch } from "../store/hooks";
import { cartItemAdded, sessionEnded, sessionStarted } from "../store/uiSlice";
import { nativeFetch } from "../security/nativeFetch";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

// The host learns about auth/cart activity happening inside remotes purely
// through @mfe/event-bus CustomEvents — never by reaching into a remote's
// Redux store. See docs/02-state-management.md.
//
// The event bus alone only tells the host about logins that happen *while
// the host is mounted and listening* — it says nothing about a session that
// already existed when the page loaded (e.g. a reload while logged in, with
// auth-app never visited this session). The GET /session check below closes
// that gap independently, the same way auth-app's own bootstrap does.
export function useShellSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;
    nativeFetch(`${BACKEND_URL}/api/auth/session`, { credentials: "include" })
      .then((res) => (res.ok ? (res.json() as Promise<{ user: { id: string } }>) : null))
      .then((data) => {
        if (!cancelled && data?.user) dispatch(sessionStarted({ userId: data.user.id }));
      })
      .catch(() => {
        // No active session, or backend unreachable — leave as "not signed in".
      });

    const offLogin = on("auth:login", ({ userId }) => dispatch(sessionStarted({ userId })));
    const offLogout = on("auth:logout", () => dispatch(sessionEnded()));
    const offCart = on("product:added-to-cart", ({ quantity }) => dispatch(cartItemAdded({ quantity })));
    return () => {
      cancelled = true;
      offLogin();
      offLogout();
      offCart();
    };
  }, [dispatch]);
}
