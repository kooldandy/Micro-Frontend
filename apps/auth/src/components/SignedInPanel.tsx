import { useAppSelector } from "../store/hooks";

/** Replaces the login/register form once a session already exists. */
export default function SignedInPanel() {
  const user = useAppSelector((state) => state.auth.user);

  return (
    <div className="auth-max-w-sm auth-mx-auto auth-mt-10 auth-p-6 auth-rounded-lg auth-border auth-border-slate-200 auth-shadow-sm auth-bg-white auth-text-center">
      <p className="auth-text-slate-700">
        You're signed in as <strong>{user?.email}</strong>.
      </p>
      <a href="/profile" className="auth-underline auth-text-slate-900 auth-mt-2 auth-inline-block">
        Go to your profile
      </a>
    </div>
  );
}
