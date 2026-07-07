import { __federation_method_setRemote } from "virtual:__federation__";
import { nativeFetch } from "./nativeFetch";

// Falls back to the documented default dev backend URL if VITE_BACKEND_URL
// isn't set (e.g. no .env file yet) — otherwise a missing env var silently
// becomes the empty string, turning this into a same-origin relative fetch
// that 200s with the host's own index.html instead of failing loudly.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await nativeFetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`Request to ${url} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

async function sha384Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-384", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Caching (docs/07-security-architecture.md § Caching): remoteEntry.js is
// deliberately non-cacheable over HTTP (its URL carries a fresh, one-shot
// signed token every time — see createAssetCacheHeadersPlugin in
// packages/asset-token). Repeat cost is avoided here instead: once a
// remote's handshake succeeds, its resolved promise is kept for the rest of
// the page session, so navigating away from a remote's route and back
// (each a fresh `RemoteApp`/`React.lazy` instance — see RemoteApp.tsx)
// resolves instantly instead of re-running the token/manifest/SRI round
// trip. Cleared on failure so a later attempt (e.g. re-navigating to the
// route after the remote comes back up) actually retries the network calls
// rather than replaying a stale rejection.
const authorizationCache = new Map<string, Promise<void>>();

/**
 * Tier 2 handshake (docs/07-security-architecture.md):
 *  1. Fetch a short-lived, backend-signed token for `remoteName`.
 *  2. SRI-lite: fetch the actual remoteEntry.js bytes and SHA-384-compare
 *     them against the backend's manifest before allowing anything to load
 *     (only covers this one entry file, not every lazily-imported chunk —
 *     documented as a known gap in docs/07).
 *  3. Point Module Federation's runtime remotes map at the signed URL via
 *     the plugin's own dynamic-remote API, so the caller's subsequent
 *     `import("<remote>/App")` resolves against it.
 *
 * If any step throws, the caller's RemoteApp/Suspense/ErrorBoundary chain
 * (apps/host/src/components/RemoteApp.tsx) shows the same "unavailable"
 * fallback it already shows for a remote that's simply down — a tampered
 * or unreachable remote fails exactly the same way a dead one does.
 *
 * Memoized per `remoteName` for the page session — see authorizationCache.
 */
export function authorizeRemote(remoteName: string, remoteBaseUrl: string): Promise<void> {
  const cached = authorizationCache.get(remoteName);
  if (cached) {
    return cached;
  }
  const attempt = performHandshake(remoteName, remoteBaseUrl).catch((error) => {
    authorizationCache.delete(remoteName);
    throw error;
  });
  authorizationCache.set(remoteName, attempt);
  return attempt;
}

async function performHandshake(remoteName: string, remoteBaseUrl: string): Promise<void> {
  const { token } = await fetchJson<{ token: string; expiresAt: number }>(
    `${BACKEND_URL}/api/assets/token?remote=${encodeURIComponent(remoteName)}`
  );
  const signedUrl = `${remoteBaseUrl}?token=${encodeURIComponent(token)}`;

  const manifest = await fetchJson<Record<string, { sha384: string } | null>>(
    `${BACKEND_URL}/api/assets/manifest`
  );
  const expectedHash = manifest[remoteName]?.sha384;
  if (expectedHash) {
    const res = await nativeFetch(signedUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${remoteName} remoteEntry.js for integrity check`);
    }
    // Vite's dev server (`yarn dev`) has no physical remoteEntry.js to serve —
    // a request for one falls through to its SPA index.html fallback, which
    // is valid HTML but will never match a build's hash. This is the single
    // most common cause of a mismatch here, so name it explicitly instead of
    // leaving it looking like a tampering incident. See docs/06-runtime-lifecycle.md.
    if (res.headers.get("content-type")?.includes("text/html")) {
      throw new Error(
        `${remoteName} returned an HTML page instead of remoteEntry.js — it's likely running ` +
          `\`yarn dev\` instead of \`yarn build && yarn preview\`. Federation requires the built preview server.`
      );
    }
    const actualHash = await sha384Hex(await res.arrayBuffer());
    if (actualHash !== expectedHash) {
      throw new Error(
        `Integrity check failed for ${remoteName}: remoteEntry.js does not match the signed manifest`
      );
    }
  }

  __federation_method_setRemote(remoteName, {
    url: () => Promise.resolve(signedUrl),
    format: "esm",
    from: "vite",
  });
}
