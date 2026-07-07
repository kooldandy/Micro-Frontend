import { Provider } from "react-redux";
import { Navigate, Route, Routes } from "react-router-dom";
import { store } from "./store/store";
import { useShellSync } from "./hooks/useShellSync";
import { authorizeRemote } from "./security/remoteAssetAuth";
import { RemoteApp } from "./components/RemoteApp";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";
import "./index.css";

// Must match the `remotes` map in vite.config.ts — that static map is what
// lets the federation plugin recognize the "authApp/App"-style import
// specifiers at build time; the URLs below are what authorizeRemote()
// actually repoints the runtime loader at (see docs/07-security-architecture.md).
const REMOTE_URLS = {
  authApp: "http://localhost:5174/assets/remoteEntry.js",
  profileApp: "http://localhost:5175/assets/remoteEntry.js",
  productApp: "http://localhost:5176/assets/remoteEntry.js",
} as const;

// Stable module-level loader references — required so RemoteApp's
// `useMemo(() => lazy(loader), [loader])` doesn't re-import on every render.
// Each performs the Tier 2 signed-URL + SRI-lite handshake before delegating
// to the actual federated import.
const loadAuthApp = async () => {
  await authorizeRemote("authApp", REMOTE_URLS.authApp);
  return import("authApp/App");
};
const loadProfileApp = async () => {
  await authorizeRemote("profileApp", REMOTE_URLS.profileApp);
  return import("profileApp/App");
};
const loadProductApp = async () => {
  await authorizeRemote("productApp", REMOTE_URLS.productApp);
  return import("productApp/App");
};

function Shell() {
  useShellSync();
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        {/* Two-tier routing: each of these is a trailing-wildcard macro
            route owned by the host; everything past it is resolved by the
            MFE's own <Routes>. See docs/03-routing-blueprint.md. */}
        <Route path="auth/*" element={<RemoteApp name="Auth" loader={loadAuthApp} />} />
        <Route path="profile/*" element={<RemoteApp name="Profile" loader={loadProfileApp} />} />
        <Route path="product/*" element={<RemoteApp name="Product" loader={loadProductApp} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Shell />
    </Provider>
  );
}
