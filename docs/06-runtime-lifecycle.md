# 06 — Runtime Lifecycle

## Ports

| App | Standalone dev | Preview (federation-ready) |
|---|---|---|
| host | 5173 | 5173 |
| auth | 5174 | 5174 |
| profile | 5175 | 5175 |
| product | 5176 | 5176 |

## Commands

All commands below are run from the repo root unless noted, and are backed
by Turborepo (`turbo.json`) so they fan out to every workspace. `apps/backend`
is **not** part of any of these — it has no build step and isn't a turbo
task target; start it separately (`cd apps/backend && yarn dev`).

| Command | What it does |
|---|---|
| `yarn install` | Installs and links all workspaces (root, `apps/*`, `packages/*`) |
| `yarn dev` | Runs **every** frontend app's own `vite` dev server in parallel, including auth/profile/product. ⚠️ This is almost never what you want for testing the shell — see the warning below |
| `yarn dev:host` | Runs only the host's dev server (`--filter=host-app`) — pair with `yarn remotes:preview` running elsewhere |
| `yarn build` | `vite build` in every app (the two `packages/*` have no build step — they're consumed as TS source); produces each app's `dist/`, including `remoteEntry.js` for the three remotes |
| `yarn preview` | `vite preview` in every app, serving the already-built `dist/` |
| `yarn remotes:preview` | Builds, then previews, **only** auth/profile/product — the piece that actually needs to be in preview mode for federation |
| `yarn serve` | `build` then `preview` for **all four** apps in one shot — the simplest command to reach for when you just want to see the whole thing working |

### ⚠️ Why plain `yarn dev` breaks the shell

`vite.config.ts` sets `strictPort: true` in every app, so a dev server that
can't bind its configured port **fails outright** instead of picking another
one. Root-level `yarn dev` starts a `vite` dev server for auth/profile/product
too — and dev mode has no physical `remoteEntry.js` to serve at all (see
Tier 2 in [07-security-architecture.md](./07-security-architecture.md)), so
even if it *does* start, the host's remote loading will fail against it.
Two concrete failure modes this produces, both encountered while building
this repo:

- If a preview server (or another dev server) is already bound to 5174/5175/5176,
  running `yarn dev` at the root logs `auth-app:dev: error when starting dev
  server` (etc.) for each colliding app — a plain port conflict.
- If it *does* start cleanly, the host's `authorizeRemote()` integrity check
  (Tier 2) throws `"...returned an HTML page instead of remoteEntry.js — it's
  likely running \`yarn dev\` instead of \`yarn build && yarn preview\`"` —
  because dev mode serves its SPA `index.html` fallback for that path.

Bare `yarn dev` is only useful when you're working on exactly one app in
total isolation and don't care whether cross-app loading works this session.

### To work on one MFE in isolation

```bash
cd apps/auth
yarn dev          # http://localhost:5174, no federation, own BrowserRouter
```

### To see the full federated shell (recommended)

```bash
cd apps/backend && yarn dev     # terminal 1 — the fake API, :4000
yarn remotes:preview            # terminal 2 — builds + previews auth/profile/product
yarn dev:host                   # terminal 3 — host with HMR, :5173
```

Or, if you don't need host HMR and just want to see it all working:

```bash
cd apps/backend && yarn dev     # terminal 1
yarn serve                      # terminal 2 — build + preview all four
```

## Integration Flow (what happens when you open `/auth/login` on the host)

1. Browser loads `host` at `http://localhost:5173`, `BrowserRouter` mounts,
   `/` redirects to `/dashboard`.
2. User navigates to `/auth/login`. The host's `Route path="auth/*"` matches;
   `RemoteApp` renders.
3. `RemoteApp` calls `React.lazy(loadAuthApp)`. Before the actual federated
   import resolves, `loadAuthApp` runs `authorizeRemote()`
   (`apps/host/src/security/remoteAssetAuth.ts`) — the Tier 2 handshake: mint
   a short-lived signed token from the backend, SHA-384-verify the actual
   `remoteEntry.js` bytes against the backend's manifest, then repoint
   Module Federation's runtime remote map at the signed URL. Only then does
   `import("authApp/App")` actually fetch
   `http://localhost:5174/assets/remoteEntry.js?token=...`, which in turn
   fetches `auth-app`'s bundled chunks and CSS. See
   [07-security-architecture.md](./07-security-architecture.md), Tier 2.

   `authorizeRemote()` only does this full round trip once per remote per
   page load — it memoizes success in an in-memory cache, so navigating away
   from `/auth/*` and back (a fresh `RemoteApp`/`React.lazy` instance each
   time) skips straight to the cached result instead of re-fetching the
   token, manifest, and remoteEntry.js bytes again. The chunks fetched in
   this step are also cache-control'd for reuse *across* page loads:
   everything except `remoteEntry.js` is content-hashed and served
   `immutable`; `remoteEntry.js` itself is `no-store` since its URL always
   carries a fresh token. See "Caching" in
   [07-security-architecture.md](./07-security-architecture.md).
4. `AuthApp`'s exposed `App.tsx` mounts: it creates its own Redux store,
   wraps itself in its own `<Provider>` and `<TrustedShellGate>` (Tier 3),
   and its internal `<Routes>` matches `login` against the remaining path
   segment.
5. On submit, `LoginPage` calls `@mfe/http-client` (`authApi.post('/login', …)`).
   The backend sets an **httpOnly** session cookie — no token ever reaches
   this app's JavaScript (see 07 § 3.3, the BFF pattern) — then `LoginPage`
   dispatches into `auth-app`'s own store and `emit("auth:login", { userId })`.
6. `host` and `profile-app` (if mounted) each independently receive that
   `window` CustomEvent via their own `on("auth:login", …)` subscription and
   update their own local state (nav header, profile session mirror) — no
   direct call between the apps ever happens.

## Independent Deployment

Each app under `apps/*` builds to its own `dist/` and is deployable to its
own static host / CDN path independently:

- The host only needs to know each remote's **public** `remoteEntry.js` URL
  (configured in `apps/host/vite.config.ts`'s `remotes` map) — swap
  `http://localhost:517x` for the deployed URL per environment and nothing
  else in the host changes.
- A remote can ship a new version at any time; the next page load (or next
  cold `import()`) picks it up. There is no host redeploy required for a
  remote-only change.
- Because every app shares only `react`/`react-dom`/`react-router-dom`/`react-redux`
  as federation singletons (see [05](./05-module-federation.md)), a remote is
  free to upgrade its own other dependencies (axios via `@mfe/http-client`,
  UI libraries, etc.) without coordinating with the other three apps.

## Error Boundaries — Graceful Remote-Drop Handling

`apps/host/src/components/RemoteErrorBoundary.tsx` wraps every
`<RemoteApp />`. If a remote's dev/preview server is down, `remoteEntry.js`
404s, or the remote throws during its own render:

- `Suspense`'s fallback (`Loading {name}…`) shows first, while the dynamic
  import is in flight.
- If the import or subsequent render throws, `RemoteErrorBoundary` catches it
  and renders a contained fallback card ("`{name}` is currently
  unavailable…") with a **Retry** button, instead of a blank page or a crash
  that takes down the entire host shell.
- Other routes/remotes on the page are completely unaffected — the boundary
  is scoped per-remote, not global.

This is easy to verify manually: run `yarn serve`, navigate to `/product`,
then stop just the product-app preview process (Ctrl-C in its terminal) and
refresh — the host stays up and shows the fallback card only where the
product remote used to be.
