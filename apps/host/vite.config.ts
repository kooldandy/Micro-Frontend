import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

// Tier 1 (docs/07-security-architecture.md): a strict CSP for the shell.
// script-src must name each remote's origin — their JS is fetched via
// dynamic import() and executed in this document's context. style-src ALSO
// needs each remote's origin: @originjs/vite-plugin-federation's generated
// remoteEntry.js loads each exposed module's CSS by appending a
// `<link rel="stylesheet" href="http://localhost:517x/assets/style-*.css">`
// to the HOST's own document.head (dynamicLoadingCss in the plugin's
// runtime) — that request's origin is the remote, not 'self', so it needs
// the same allowlist script-src uses. 'unsafe-inline' is additionally
// required because Vite's dev server injects CSS via inline <style> tags; a
// stricter nonce-based policy is a documented follow-up, not done here.
// connect-src covers the backend API plus each remote's own origin (the
// host fetches remoteEntry.js directly for the SRI-lite check).
const REMOTE_ORIGINS = "http://localhost:5174 http://localhost:5175 http://localhost:5176";
const BACKEND_ORIGIN = "http://localhost:4000";

const previewCsp = [
  "default-src 'self'",
  `script-src 'self' ${REMOTE_ORIGINS}`,
  `style-src 'self' 'unsafe-inline' ${REMOTE_ORIGINS}`,
  "img-src 'self' data:",
  `connect-src 'self' ${BACKEND_ORIGIN} ${REMOTE_ORIGINS}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

// `vite dev` (server.headers) needs a looser script-src than preview/prod:
// @vitejs/plugin-react injects its React Fast Refresh bootstrap as an
// inline `<script type="module">` on every page load, which only exists in
// dev mode — a strict script-src blocks it outright ("can't detect
// preamble"). This CSP only ever governs a local dev server, never what's
// actually served to users; `previewCsp` above is the one that matters and
// stays strict. Don't "fix" this by loosening previewCsp instead.
const devCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${REMOTE_ORIGINS}`,
  `style-src 'self' 'unsafe-inline' ${REMOTE_ORIGINS}`,
  "img-src 'self' data:",
  `connect-src 'self' ${BACKEND_ORIGIN} ${REMOTE_ORIGINS} ws://localhost:5173`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const sharedHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// Host (macro) app: owns the top-level BrowserRouter and consumes the three
// remotes as federated modules. Remote URLs point at each MFE's `vite
// preview` server (remoteEntry.js only exists post-build) — see
// docs/06-runtime-lifecycle.md for the full dev/integration workflow.
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "host",
      remotes: {
        authApp: "http://localhost:5174/assets/remoteEntry.js",
        profileApp: "http://localhost:5175/assets/remoteEntry.js",
        productApp: "http://localhost:5176/assets/remoteEntry.js",
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        "react-dom": { singleton: true, requiredVersion: false },
        "react-router-dom": { singleton: true, requiredVersion: false },
        "react-redux": { singleton: true, requiredVersion: false },
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    headers: { ...sharedHeaders, "Content-Security-Policy": devCsp },
  },
  preview: {
    port: 5173,
    strictPort: true,
    headers: { ...sharedHeaders, "Content-Security-Policy": previewCsp },
  },
  build: {
    target: "esnext",
    modulePreload: false,
    minify: false,
    cssCodeSplit: false,
  },
});
