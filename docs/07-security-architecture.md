# 07 — Microfrontend Security Architecture & Governance Standard

This doc records what was actually implemented against the security
requirements this repo was built against, what's only partially covered, and
what's documented guidance because it requires real infrastructure this
repo doesn't have (a real CDN, real IAM, a real Snyk account). Every claim
below is either backed by code in this repo or explicitly labeled as
guidance — nothing here should be read as more thoroughly covered than it is.

## Coverage Matrix

| Control | Status | Where |
|---|---|---|
| Tier 1 — CORS | **Implemented** | Every app's `vite.config.ts` (`server.headers`/`preview.headers`); `apps/backend/src/server.js` (`cors` origin allowlist) |
| Tier 1 — CSP | **Implemented** | Every app's `vite.config.ts` |
| Tier 2 — signed asset URL | **Implemented** | `packages/asset-token`, `apps/backend/src/routes/assets.js`, `apps/host/src/security/remoteAssetAuth.ts` |
| Tier 2 — SRI-lite integrity check | **Implemented, partial coverage** | `remoteAssetAuth.ts` (only the entry file the host directly fetches — see caveat below) |
| Tier 3 — runtime handshake | **Implemented** | `packages/trusted-shell` |
| Caching — immutable hashed assets | **Implemented** | `createAssetCacheHeadersPlugin` (`packages/asset-token`), wired into every remote's `vite.config.ts` |
| Caching — in-session authorization memoization | **Implemented** | `apps/host/src/security/remoteAssetAuth.ts` (`authorizationCache`) |
| 3.1 Supply chain | **Partial** — real config, not a live scan | `.github/dependabot.yml`; Snyk/CI-gate is guidance only |
| 3.2 XSS blast radius | **Implemented**, narrow scope | `apps/profile/src/utils/sanitizeHtml.ts` |
| 3.3 BFF token/session | **Implemented** | `apps/backend` sessions, `packages/http-client` (`withCredentials`), `apps/auth` |
| 3.4 Global scope pollution | **Implemented, scoped mitigation** | `apps/host/src/security/nativeFetch.ts` |
| 3.5 Infra IAM / S3 hardening | **Documented guidance only** | This doc, below — no real cloud infra exists in this repo |
| 3.5 Full-chain SRI | **Documented guidance only** | This doc, below — would need a Service Worker, not built |

---

## Tier 1: Network Layer Validation (CORS & CSP)

**CORS.** Every remote previously used Vite's `cors: true`, which reflects
any origin — the opposite of the mandate ("deny all cross-origin requests
except the designated Host"). Each of `apps/{auth,profile,product}/vite.config.ts`
now sets a static `Access-Control-Allow-Origin: http://localhost:5173`
(the host's origin) and `Access-Control-Allow-Methods: GET` on both
`server.headers` and `preview.headers`. `apps/backend/src/server.js` runs the
`cors` middleware with an explicit `ALLOWED_ORIGINS` allowlist (env-configurable)
and `credentials: true` (required for cookies to flow — see 3.3).

The allowlist in this repo includes all four frontend ports (5173–5176), not
just the host. That's a **deliberate relaxation for local development**,
documented here rather than hidden: this repo's workflow (docs/06) supports
running any MFE standalone, which means it also calls the backend directly.
In a real deployment, the backend's allowlist should be the Host origin
only, and each remote's static-asset CORS should be the Host origin only —
exactly as this repo already does for the remotes' own `Access-Control-Allow-Origin`.

**CSP.** Every app sets a `Content-Security-Policy` header. The host's is the
most restrictive-yet-functional: `script-src 'self' <remote origins>` (the
remotes' JS is fetched via dynamic `import()` and executed in the host's
document), `connect-src` naming the backend and remote origins (for the
Tier 2 fetches), `frame-ancestors 'none'`, `object-src 'none'`. Each remote's
own CSP is tighter still since it doesn't need to name any other app.

**Known trade-off:** `style-src 'self' 'unsafe-inline'` is required because
Vite's dev server injects CSS via inline `<style>` tags. A stricter,
nonce-based style policy is possible but wasn't implemented here — noted as
a follow-up, not silently ignored.

**The host's `style-src` also needs each remote's origin, not just
`script-src`.** Caught by actually loading the federated shell in a browser:
`@originjs/vite-plugin-federation`'s generated `remoteEntry.js` loads an
exposed module's CSS by appending a `<link rel="stylesheet" href="http://
localhost:517x/assets/style-*.css">` directly to the **host's** `document.head`
(its `dynamicLoadingCss` runtime helper) — that fetch's origin is the remote,
not the host, so `style-src 'self'` alone blocked it. Fixed by adding
`REMOTE_ORIGINS` to `style-src` exactly as `script-src` already had it
(`apps/host/vite.config.ts`). A useful pattern for extending this repo: any
CSP directive covering something a remote's federation runtime injects into
the host's page needs the same origin list `script-src` uses, not just the
directive that seems topically related (style vs. script).

**Dev-mode CSP is intentionally looser than preview's, on `script-src`
specifically.** Every `vite.config.ts` defines a `devCsp` (applied to
`server.headers`, i.e. `yarn dev`) and a stricter `previewCsp` (applied to
`preview.headers`). The reason: `@vitejs/plugin-react` injects its React
Fast Refresh bootstrap as an inline `<script type="module">` on every dev
page load — this only exists in dev mode, and a `script-src` without
`'unsafe-inline'` blocks it outright (surfaces in the browser console as
"`@vitejs/plugin-react` can't detect preamble" alongside a CSP violation
notice). This was caught by actually opening the app in a browser after the
first pass of this doc shipped, which is exactly why docs/06's workflow
distinguishes `yarn dev` (standalone convenience loop) from `yarn build &&
yarn preview` (what this repo's security posture actually targets) —
`previewCsp` never gained the relaxation and is the one that matters.

## Tier 2: Cryptographic Access (Dynamic Token Authentication + Integrity)

This is implemented for real, not simulated — verified against the
installed `@originjs/vite-plugin-federation` source before committing to the
design (it exposes a `__federation_method_setRemote(name, {url, format,
from})` runtime function, resolvable via `import ... from
"virtual:__federation__"` from any host-side module).

**Flow** (`apps/host/src/security/remoteAssetAuth.ts`, called from
`apps/host/src/App.tsx`'s remote loaders before the actual federated import):

1. **Mint a token.** `GET /api/assets/token?remote=authApp` on the backend
   (`apps/backend/src/routes/assets.js`) returns an HMAC-SHA256-signed,
   30-second-lived token (`packages/asset-token/src/index.js`,
   `signAssetToken`). The token is `${remote}.${expiresAt}.${signature}` —
   bound to a specific remote name and a specific expiry, so it can't be
   replayed against a different remote or reused after it expires.
2. **Verify at the edge.** Each remote's `vite.config.ts` installs
   `createRemoteEntryGuardPlugin(remoteName)` (also from
   `packages/asset-token`), a connect-middleware Vite plugin that 403s any
   request for `/assets/remoteEntry.js` whose `?token=` fails
   `verifyAssetToken` (wrong remote, expired, or bad signature —
   `crypto.timingSafeEqual`, not `===`, to avoid timing side-channels). In
   this repo, the remote's own `vite preview` server plays the role a
   hardened CDN/edge layer would in production — same verification logic,
   different host.
3. **SRI-lite integrity check.** Before letting the import proceed, the host
   also fetches `GET /api/assets/manifest` (SHA-384 of each remote's built
   `remoteEntry.js`, computed fresh off disk on every call — see `assets.js`),
   fetches the actual remoteEntry.js bytes via the signed URL, and compares
   SHA-384 digests using the browser's native `crypto.subtle.digest`. A
   mismatch throws before anything is executed.
4. **Point federation at the signed URL.** Only after both checks pass does
   the code call `__federation_method_setRemote(remoteName, { url: () =>
   Promise.resolve(signedUrl), format: "esm", from: "vite" })` — this
   overwrites the plugin's internal `remotesMap` entry for that remote, so
   the subsequent `import("authApp/App")` resolves against the signed,
   verified URL instead of the plain static one baked into the build.

**Caveat, stated plainly:** the SRI-lite check only covers `remoteEntry.js`
itself — the one file the host directly fetches. `remoteEntry.js` in turn
dynamically imports further chunks (the actual exposed `App` bundle, shared
React chunks) that the host never fetches directly, so those aren't
hash-verified by this mechanism. A complete solution would intercept every
chunk request via a Service Worker and verify the full dependency graph —
not built here, and called out as the real production hardening path rather
than glossed over.

**Failure mode:** if any step throws — token fetch fails, integrity check
fails, the remote is simply down — the caller's existing `RemoteApp` /
`Suspense` / `RemoteErrorBoundary` chain (`apps/host/src/components/`)
catches it and shows the same "service unavailable" fallback UI a merely-down
remote would show. A tampered remote and a dead remote fail identically from
the user's perspective; only the console/server logs differ.

## Caching

Every remote's build output gets one of two treatments, enforced by
`createAssetCacheHeadersPlugin` (`packages/asset-token`, wired into each of
`apps/{auth,profile,product}/vite.config.ts` right after
`createRemoteEntryGuardPlugin`):

- **Everything under `/assets/` except `remoteEntry.js`** — the shared
  vendor chunks (`__federation_shared_react-*.js`), the exposed app bundle
  (`__federation_expose_App-*.js`), CSS — is content-hashed by Vite's build
  (a changed deploy ships a new filename, never a mutated one at the old
  filename). These get `Cache-Control: public, max-age=31536000, immutable`.
  This is the bulk of what a remote actually ships, so this is where the
  real byte-transfer savings on repeat visits come from.
- **`remoteEntry.js` itself** gets `Cache-Control: no-store` — deliberately,
  not by omission. Its URL always carries the Tier 2 signed `?token=`
  (`remoteAssetAuth.ts`), which is different on every request by design
  (30-second TTL, minted fresh per handshake); an HTTP cache keyed on that
  URL would never produce a hit anyway, and caching a token-bearing URL in a
  shared/CDN cache is the wrong instinct regardless of hit rate. Loosening
  this to make `remoteEntry.js` cacheable (e.g. by moving the token off the
  query string and onto a stable URL) would weaken Tier 2's access gate —
  not done, and not a direction to take without treating it as a deliberate
  security tradeoff, not a caching tweak.

**The repeat-fetch cost for `remoteEntry.js` is solved separately, in-memory,
not over HTTP.** `authorizeRemote` (`apps/host/src/security/
remoteAssetAuth.ts`) memoizes its result per `remoteName` in a module-level
`authorizationCache` for the life of the page: the first successful
handshake for a remote is kept, so navigating away from `/auth/*` and back
(which unmounts and remounts `RemoteApp`, creating a fresh `React.lazy`
instance — see `docs/06-runtime-lifecycle.md`) resolves instantly instead of
re-running the token fetch, manifest fetch, and SRI byte-compare. A failed
attempt is evicted from the cache immediately (in the `.catch`), so the next
attempt — typically the next time that route is entered, since `RemoteApp`'s
own `React.lazy` also caches a rejected promise for the lifetime of that
component instance and won't retry on its own — actually redoes the network
calls instead of replaying a stale failure.

**Trade-off, stated plainly:** both caches are page-session-scoped —
a full reload clears them, same as the token itself expiring after 30
seconds would eventually require a fresh mint anyway. This isn't a gap
against the design goal; the goal was eliminating *redundant re-verification
within a session*, not persisting a security handshake result across
reloads (which would just be a longer-lived token by another name).

## Tier 3: Runtime Code-Level Handshake

`packages/trusted-shell` implements the spec's sample almost verbatim:
`markTrustedShell()` defines a non-enumerable, non-writable,
non-configurable `window.__MFE_SHELL_CONTEXT__`, and each MFE's exposed
`App.tsx` wraps its render in `<TrustedShellGate>`, which refuses to render
(and logs a `[CRITICAL]` console error) if that value doesn't match.

**Adaptation from the spec, and why:** the spec's sample only has the *host*
call the equivalent of `markTrustedShell()`. Doing only that would break this
repo's standalone-MFE-dev workflow (docs/06) — each MFE's own `main.tsx`
also needs to render `<App>` successfully when run alone, with no host
present. So every app's own `main.tsx` — host **and** each MFE's standalone
entry — calls `markTrustedShell()`. The check now means "I am running inside
one of our own bootstraps" rather than "I am specifically the host," which
still blocks the scenario the spec cares about (a foreign page importing our
remote into an execution context that never ran any of our bootstraps) while
preserving the "one component, two hosts" design from docs/03.

**Say this plainly, because the spec's own framing risks overclaiming it:**
this is an **integrity/provenance signal, not a confidentiality boundary**.
The token is a literal string shipped in every app's client bundle — anyone
who downloads the JS can read it and satisfy the check themselves. What it
actually raises the bar against is casual reuse (someone `import()`-ing our
`remoteEntry.js` into an unrelated page without having read our source), not
a motivated attacker who already has our code. Treat it as one layer in a
defense-in-depth stack (alongside Tiers 1 and 2, which are real access
controls), not as the thing standing between a remote and unauthorized
execution.

---

## 3.1 Third-Party Dependency Supply Chain Attacks

**Implemented:** `.github/dependabot.yml` — a real, working config
(`npm` ecosystem, `directory: "/"`, which Dependabot resolves across the
whole yarn workspaces tree from the root lockfile), weekly, grouped by
production vs. development dependencies.

**Guidance, not implemented:** wiring a real Snyk (or equivalent SCA) gate
into CI requires an account/token this repo doesn't have and can't fake
usefully — a stub "scan" that always passes would be worse than no doc at
all. The recommendation: add a CI job that runs `dependabot`/`snyk test` (or
`npm audit --audit-level=high`, which needs no external account) and fails
the pipeline on high/critical findings, gating merge.

The shared-singleton pinning for `react`/`react-dom`/`react-router-dom`/
`react-redux` (docs/05-module-federation.md) is the other half of this
control — it's what prevents four independently-versioned apps from each
loading their own copy of a foundational library (and thus their own,
potentially-vulnerable, copy).

## 3.2 Cross-Site Scripting (XSS) Blast Radius Expansion

**Implemented, narrowly.** The one place in this repo a user's own free-text
input is rendered as markup rather than escaped plain text is the profile
bio (`apps/profile/src/pages/ProfilePage.tsx`) — everywhere else (`{value}`
JSX interpolation) React already auto-escapes, so adding DOMPurify there
would have been decorative rather than load-bearing. `bio` is now rendered
via `dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.bio) }}`, where
`sanitizeHtml` (`apps/profile/src/utils/sanitizeHtml.ts`) is a DOMPurify
wrapper allowlisting only `b/i/em/strong/br/p`.

**Guidance, not implemented:** this repo has no untrusted third-party widget
(marketing scripts, embedded legacy content) to isolate — there's nothing to
sandbox. If one is added later, isolate it in an `<iframe sandbox="allow-scripts">`
with no `allow-same-origin`, entirely outside the Module Federation
ecosystem, exactly as the spec describes.

## 3.3 Token Theft & Decentralized Session Management (BFF Pattern)

**Implemented — this is the biggest behavioral change from the previous
version of this repo.** Auth used to write a bearer token to `localStorage`
and attach it as an `Authorization` header (`packages/http-client`'s old
`getToken` option). That's gone. Now:

- `apps/backend`'s `/api/auth/{login,register}` set an **httpOnly** session
  cookie (`mfe_session`, `apps/backend/src/middleware/session.js`) whose
  value is an opaque `crypto.randomBytes(32)` string looked up in a
  server-side session map — never a JWT the browser could decode, and never
  readable by any client-side JS (`httpOnly`).
- Cookie flags: `SameSite=Strict`, `secure` (env-controlled —
  `SESSION_COOKIE_SECURE=false` for local http dev; **must** be `true` once
  served over https, per `apps/backend/.env.example`). In production, also
  rename the cookie with the `__Secure-` prefix (browsers enforce that
  prefix requires the `Secure` flag) — the spec's literal example
  (`__Secure-Session`) assumes https, which local dev isn't.
- `packages/http-client` sets `withCredentials: true` unconditionally and no
  longer has any bearer-token code path at all — there is nothing left for
  a script to steal.
- **Session bootstrap**: `apps/auth/src/hooks/useSessionBootstrap.ts` calls
  `GET /api/auth/session` on mount to re-derive "am I logged in" after a
  reload (which loses in-memory Redux state but keeps the httpOnly cookie).
  `apps/host/src/hooks/useShellSync.ts` and `apps/profile/src/hooks/
  useSessionSync.ts` independently do the same on their own mount — see
  `docs/02-state-management.md` § "Session Bootstrap: Every App Checks For
  Itself" for why relying on `auth-app`'s bootstrap alone wasn't enough.
- **Logout**: `apps/auth/src/components/SessionBar.tsx` (previously missing
  entirely) calls `POST /api/auth/logout`, which deletes the server-side
  session and clears the cookie.

## 3.4 Global Scope Pollution and Prototype Poisoning

**Implemented, deliberately scoped — not a blanket freeze.**
`apps/host/src/security/nativeFetch.ts` captures `window.fetch.bind(window)`
into a module-level constant, imported as the very first thing in
`apps/host/src/main.tsx` — before any remote has had a chance to load and
monkey-patch `window.fetch`. `apps/host/src/security/remoteAssetAuth.ts`
uses only that captured reference for every security-sensitive network call
(token, manifest, integrity fetch), never a fresh `window.fetch` lookup.

**Why not `Object.freeze(Object.prototype)` (or similar) globally, as a
literal reading of the spec might suggest:** it was evaluated and rejected.
Freezing shared prototypes at boot risks breaking legitimate library code —
React, Redux Toolkit, and axios (among others) rely on prototype-chain
behavior that a naive freeze can interfere with in ways that are hard to
fully regression-test without the test suite this repo intentionally
doesn't have. A narrow, targeted capture of the one global (`fetch`) that
this repo's own security code actually depends on is a real mitigation for
the described threat (a remote hijacking `window.fetch` to intercept or
divert the asset-token/manifest requests) without that risk. Broader
hardening (freezing specific, audited globals after a real regression pass)
is a reasonable next step, not done here.

## 3.5 Infrastructure-Level S3/CDN Pipeline Hardening

**Documented guidance only — there is no real cloud infrastructure in this
repo to harden.** For a real deployment:

- **Least-privilege IAM.** CI/CD deploy roles should be scoped to
  `s3:PutObject`/`s3:PutObjectAcl` on exactly the one app's asset prefix they
  deploy — never a shared, broadly-scoped credential across all four apps'
  buckets. A compromised CI job for `product-app` should not be able to
  overwrite `auth-app`'s `remoteEntry.js`.
- **Full-chain Subresource Integrity.** The SRI-lite check in Tier 2 above
  covers only `remoteEntry.js`. Browsers only apply the native `integrity`
  attribute to `<script>`/`<link>` tags and `fetch()` — not to dynamic
  `import()`, which is how Module Federation actually loads code. Covering
  every chunk in the dependency graph would require a Service Worker
  intercepting every request under a remote's origin and verifying each
  against a full manifest before letting it through to the network/cache.
  That's a real, buildable next step — just a materially bigger one than
  this repo's scope, and not implemented here.
- **Immutable, versioned deploys.** Ship each build to a versioned path
  (e.g. `/authApp/<git-sha>/remoteEntry.js`) rather than overwriting a fixed
  path in place, so a compromised deploy can't silently replace what's
  already being served to users — a rollback is then just re-pointing the
  manifest, not re-uploading anything.
