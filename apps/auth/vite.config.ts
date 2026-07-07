import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";
import { createRemoteEntryGuardPlugin, createAssetCacheHeadersPlugin } from "@mfe/asset-token";

// Tier 1 (docs/07-security-architecture.md): explicit host-only CORS,
// replacing the permissive `cors: true` this app used before. A same-origin
// page load (standalone dev, opening :5174 directly) is unaffected — CORS
// only governs cross-origin requests, which is exactly the host loading
// this app's remoteEntry.js from :5173.
const HOST_ORIGIN = "http://localhost:5173";
const BACKEND_ORIGIN = "http://localhost:4000";

const previewCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${BACKEND_ORIGIN}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

// `vite dev` needs 'unsafe-inline' in script-src for @vitejs/plugin-react's
// React Fast Refresh bootstrap, an inline <script> that only exists in dev
// mode. Only governs the local dev server — previewCsp is what's actually
// served and stays strict. See apps/host/vite.config.ts for the fuller note.
const devCsp = previewCsp.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'");

const sharedHeaders = {
  "Access-Control-Allow-Origin": HOST_ORIGIN,
  "Access-Control-Allow-Methods": "GET",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

// Remote MFE: exposes ./App for the host shell and runs standalone on :5174.
// `vite dev` here is for isolated development only — remoteEntry.js (the
// federation manifest) is only emitted by `vite build`, so integration with
// the host requires `yarn build && yarn preview`. See docs/06-runtime-lifecycle.md.
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "authApp",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/App.tsx",
      },
      shared: {
        react: { singleton: true, requiredVersion: false },
        "react-dom": { singleton: true, requiredVersion: false },
        "react-router-dom": { singleton: true, requiredVersion: false },
        "react-redux": { singleton: true, requiredVersion: false },
      },
    }),
    // Tier 2 (docs/07-security-architecture.md): 403s any remoteEntry.js
    // request that doesn't carry a valid, backend-signed, short-lived token.
    createRemoteEntryGuardPlugin("authApp"),
    // Caching (docs/07-security-architecture.md § Caching): immutable
    // long-lived Cache-Control for every content-hashed build output,
    // `no-store` for the token-gated, unhashed remoteEntry.js.
    createAssetCacheHeadersPlugin(),
  ],
  server: {
    port: 5174,
    strictPort: true,
    headers: { ...sharedHeaders, "Content-Security-Policy": devCsp },
  },
  preview: {
    port: 5174,
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
