import { Provider } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";
import { TrustedShellGate } from "@mfe/trusted-shell";
import { store } from "./store/store";
import { useSessionBootstrap } from "./hooks/useSessionBootstrap";
import { useAppSelector } from "./store/hooks";
import SessionBar from "./components/SessionBar";
import SignedInPanel from "./components/SignedInPanel";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import "./index.css";

function AuthRoutes() {
  useSessionBootstrap();
  const { user, bootstrapped } = useAppSelector((state) => state.auth);

  // Don't render the login form until we know whether a session already
  // exists — avoids a flash of the form right before it gets hidden.
  if (!bootstrapped) {
    return <p className="auth-text-center auth-mt-10 auth-text-slate-500">Checking session…</p>;
  }

  return (
    <>
      <SessionBar />
      {user ? (
        <SignedInPanel />
      ) : (
        <Routes>
          <Route index element={<Navigate to="login" replace />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="login" replace />} />
        </Routes>
      )}
    </>
  );
}

// This is the module federation exposes entry ("./App"). It intentionally
// does NOT render its own <BrowserRouter> — when mounted inside the host at
// "/auth/*", these <Routes> resolve relative to the host's Router context.
// Standalone dev (src/main.tsx) supplies the Router instead. One component,
// two hosts. See docs/03-routing-blueprint.md.
//
// <TrustedShellGate> is the Tier 3 handshake (docs/07-security-architecture.md)
// — both the host and this app's own main.tsx call markTrustedShell() before
// rendering, so this only refuses to render in a foreign, unbootstrapped page.
export default function App() {
  return (
    <TrustedShellGate>
      <Provider store={store}>
        <div className="auth-p-4">
          <AuthRoutes />
        </div>
      </Provider>
    </TrustedShellGate>
  );
}
