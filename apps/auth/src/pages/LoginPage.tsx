import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { emit } from "@mfe/event-bus";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { loginStart, loginSuccess, loginFailure } from "../store/authSlice";
import { authApi } from "../api/client";
import type { ApiError } from "@mfe/http-client";

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    dispatch(loginStart());
    try {
      // No token in the response body — the backend sets an httpOnly session
      // cookie instead (3.3 BFF pattern, docs/07-security-architecture.md).
      const { data } = await authApi.post<{ user: { id: string; email: string } }>("/login", {
        email,
        password,
      });
      dispatch(loginSuccess({ user: data.user }));
      emit("auth:login", { userId: data.user.id });
    } catch (err) {
      dispatch(loginFailure((err as ApiError).message ?? "Login failed"));
    }
  }

  return (
    <div className="auth-max-w-sm auth-mx-auto auth-mt-10 auth-p-6 auth-rounded-lg auth-border auth-border-slate-200 auth-shadow-sm auth-bg-white">
      <h1 className="auth-text-xl auth-font-semibold auth-mb-4 auth-text-slate-900">Sign in</h1>
      <form onSubmit={handleSubmit} className="auth-flex auth-flex-col auth-gap-3">
        <label className="auth-flex auth-flex-col auth-gap-1 auth-text-sm auth-text-slate-700">
          Email
          <input
            type="email"
            required
            placeholder="demo@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-border auth-border-slate-300 auth-rounded auth-px-3 auth-py-2"
          />
        </label>
        <label className="auth-flex auth-flex-col auth-gap-1 auth-text-sm auth-text-slate-700">
          Password
          <input
            type="password"
            required
            placeholder="password123"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-border auth-border-slate-300 auth-rounded auth-px-3 auth-py-2"
          />
        </label>
        {error && <p className="auth-text-sm auth-text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={status === "loading"}
          className="auth-bg-slate-900 auth-text-white auth-rounded auth-py-2 auth-mt-2 disabled:auth-opacity-50"
        >
          {status === "loading" ? "Signing in…" : "Sign in"}
        </button>
        <p className="auth-text-sm auth-text-slate-500 auth-text-center">
          No account? <Link to="../register" className="auth-underline">Register</Link>
        </p>
      </form>
    </div>
  );
}
