import { emit } from "@mfe/event-bus";
import { authApi } from "../api/client";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { logout } from "../store/authSlice";

/** Shown once a session exists — the logout affordance this app was missing. */
export default function SessionBar() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  if (!user) return null;

  async function handleLogout() {
    try {
      await authApi.post("/logout");
    } finally {
      dispatch(logout());
      emit("auth:logout");
    }
  }

  return (
    <div className="auth-max-w-sm auth-mx-auto auth-mb-4 auth-flex auth-items-center auth-justify-between auth-text-sm auth-text-slate-600">
      <span>Signed in as {user.email}</span>
      <button onClick={handleLogout} className="auth-underline">
        Logout
      </button>
    </div>
  );
}
