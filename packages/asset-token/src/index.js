import crypto from "node:crypto";

// Tier 2 (docs/07-security-architecture.md): short-lived, HMAC-signed tokens
// gate access to each remote's remoteEntry.js. This module is the single
// source of truth for signing (used by apps/backend) and verifying (used by
// each remote's Vite guard plugin) so both sides can never drift apart.
//
// The secret below is a DEV-ONLY fallback so the repo runs out of the box.
// In any real deployment, ASSET_TOKEN_SECRET must come from a real secret
// manager and be injected as an env var to both the backend and each
// remote's build/serve environment.
const DEV_ONLY_FALLBACK_SECRET = "dev-only-shared-secret-change-me";
const DEFAULT_TTL_MS = 30_000;

function getSecret() {
  return process.env.ASSET_TOKEN_SECRET || DEV_ONLY_FALLBACK_SECRET;
}

function sign(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/** Mints a `${remoteName}.${expiresAt}.${signature}` token, valid for `ttlMs`. */
export function signAssetToken(remoteName, ttlMs = DEFAULT_TTL_MS) {
  const expiresAt = Date.now() + ttlMs;
  const payload = `${remoteName}.${expiresAt}`;
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}

/** Verifies a token was signed for `remoteName`, is well-formed, and hasn't expired. */
export function verifyAssetToken(remoteName, token) {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "missing_token" };
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "malformed_token" };
  }
  const [tokenRemote, expiresAtStr, signature] = parts;
  if (tokenRemote !== remoteName) {
    return { valid: false, reason: "remote_mismatch" };
  }
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return { valid: false, reason: "expired" };
  }
  const expected = Buffer.from(sign(`${tokenRemote}.${expiresAtStr}`), "hex");
  const actual = Buffer.from(signature, "hex");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return { valid: false, reason: "bad_signature" };
  }
  return { valid: true };
}

/**
 * Vite plugin factory: 403s any request for `filePath` (default
 * `/assets/remoteEntry.js`) unless it carries a valid `?token=` for
 * `remoteName`. Runs in both `configureServer` (dev) and
 * `configurePreviewServer` (the mode our federation workflow actually uses —
 * see docs/06-runtime-lifecycle.md) so the remote's own dev/preview server
 * stands in for what a hardened CDN/edge layer would enforce in production.
 */
export function createRemoteEntryGuardPlugin(remoteName, filePath = "/assets/remoteEntry.js") {
  function guard(req, res, next) {
    if (!req.url || !req.url.startsWith(filePath)) {
      next();
      return;
    }
    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");
    const result = verifyAssetToken(remoteName, token);
    if (!result.valid) {
      res.statusCode = 403;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "forbidden", reason: result.reason }));
      return;
    }
    next();
  }

  return {
    name: `mfe-asset-token-guard-${remoteName}`,
    configureServer(server) {
      server.middlewares.use(guard);
    },
    configurePreviewServer(server) {
      server.middlewares.use(guard);
    },
  };
}

/**
 * Vite plugin factory: sets `Cache-Control` on everything under `/assets/`,
 * split by whether the file is safe to cache. Every build output *except*
 * `remoteEntry.js` has a content hash in its filename (Vite's default —
 * `__federation_shared_react-BCcI129A.js`, `style-CzUH6Lq8.css`, etc.), so a
 * changed deploy ships a new filename rather than mutating an old one —
 * those get `immutable, max-age=1y`. `remoteEntry.js` keeps a fixed,
 * unhashed name on purpose (the federation runtime always requests it at
 * that exact path) and is gated per-request by a fresh, short-lived signed
 * `?token=` (`createRemoteEntryGuardPlugin` above) — caching that response
 * would either serve a stale build under a URL nothing will ever request
 * again (the token differs every time) or, worse, get treated as a stored
 * response for a URL a shared cache shouldn't retain at all. It gets
 * `no-store` instead, and the repeat-fetch cost within a session is
 * eliminated separately, by `authorizeRemote`'s in-memory memoization
 * (`apps/host/src/security/remoteAssetAuth.ts`) rather than HTTP caching.
 * See "Caching" in docs/07-security-architecture.md.
 */
export function createAssetCacheHeadersPlugin(remoteEntryPath = "/assets/remoteEntry.js") {
  function setCacheHeaders(req, res, next) {
    if (!req.url?.startsWith("/assets/")) {
      next();
      return;
    }
    const { pathname } = new URL(req.url, "http://localhost");
    if (pathname === remoteEntryPath) {
      res.setHeader("Cache-Control", "no-store");
    } else {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
    next();
  }

  return {
    name: "mfe-asset-cache-headers",
    configureServer(server) {
      server.middlewares.use(setCacheHeaders);
    },
    configurePreviewServer(server) {
      server.middlewares.use(setCacheHeaders);
    },
  };
}
