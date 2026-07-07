import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { emit } from "@mfe/event-bus";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { loginStart, loginSuccess, loginFailure } from "../store/authSlice";
import { authApi } from "../api/client";
import type { ApiError } from "@mfe/http-client";

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, error } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    dispatch(loginStart());
    try {
      const { data } = await authApi.post<{ user: { id: string; email: string } }>("/register", {
        email,
        password,
      });
      dispatch(loginSuccess({ user: data.user }));
      emit("auth:login", { userId: data.user.id });
      navigate("../login", { replace: true });
    } catch (err) {
      dispatch(loginFailure((err as ApiError).message ?? "Registration failed"));
    }
  }

  return (
    <div className="auth-max-w-sm auth-mx-auto auth-mt-10 auth-p-6 auth-rounded-lg auth-border auth-border-slate-200 auth-shadow-sm auth-bg-white">
      <h1 className="auth-text-xl auth-font-semibold auth-mb-4 auth-text-slate-900">Create account</h1>
      <form onSubmit={handleSubmit} className="auth-flex auth-flex-col auth-gap-3">
        <label className="auth-flex auth-flex-col auth-gap-1 auth-text-sm auth-text-slate-700">
          Email
          <input
            type="email"
            required
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
          {status === "loading" ? "Creating…" : "Create account"}
        </button>
        <p className="auth-text-sm auth-text-slate-500 auth-text-center">
          Already have an account? <Link to="../login" className="auth-underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
