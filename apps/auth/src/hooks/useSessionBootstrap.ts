import { useEffect } from "react";
import { emit } from "@mfe/event-bus";
import type { ApiError } from "@mfe/http-client";
import { authApi } from "../api/client";
import { useAppDispatch } from "../store/hooks";
import { sessionChecked, type AuthUser } from "../store/authSlice";

/**
 * Reloading the page loses this app's in-memory Redux state but keeps the
 * httpOnly session cookie (3.3 BFF pattern). This hook re-derives "am I
 * logged in" via GET /session on mount instead of ever reading a token from
 * client storage — closing the "Known Limitation" noted in
 * docs/02-state-management.md's earlier localStorage-token design.
 */
export function useSessionBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;
    authApi
      .get<{ user: AuthUser }>("/session")
      .then((res) => {
        if (cancelled) return;
        dispatch(sessionChecked(res.data.user));
        emit("auth:login", { userId: res.data.user.id });
      })
      .catch((err: ApiError) => {
        if (cancelled) return;
        if (err.status !== 401) {
          console.warn("[auth] session bootstrap check failed:", err.message);
        }
        dispatch(sessionChecked(null));
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);
}
