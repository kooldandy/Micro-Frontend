# CLAUDE.md

Reference for Claude Code (or any future agent) working in this repo. Read
[`docs/00-overview.md`](./docs/00-overview.md) first for the full
architecture write-up — this file is the fast-orientation summary plus
gotchas that aren't obvious from reading one file at a time.

## What this repo is

Turborepo + Yarn Classic (v1) workspaces monorepo. Four Vite/React apps
(`apps/host`, `apps/auth`, `apps/profile`, `apps/product`) federated at
runtime via `@originjs/vite-plugin-federation`, backed by a fake Express API
(`apps/backend`, plain Node ESM, no build step). Four shared packages
(`packages/http-client`, `packages/event-bus`, `packages/asset-token`,
`packages/trusted-shell`) consumed as raw source (no build step — `main`/
`types` point straight at `src/index.*`); `asset-token` is plain `.js`
(Node-only, used by the backend and by every remote's `vite.config.ts`),
the rest are consumed by Vite's own bundling.

No test framework and no e2e harness are configured anywhere in this repo —
that's intentional, not an oversight. Don't add one unless asked.

## Non-negotiable architectural rules

1. **One Redux store per app, never shared.** If you're tempted to import
   another app's slice/store/selector, stop — the answer is
   `@mfe/event-bus` instead. See `docs/02-state-management.md`.
2. **MFE `App.tsx` never renders `<BrowserRouter>`.** Only each app's
   `main.tsx` (standalone entry) does. `App.tsx` is the federation `./App`
   expose and must compose into whatever Router already exists on the page.
   See `docs/03-routing-blueprint.md`.
3. **Host route wildcards are load-bearing.** `auth/*`, `profile/*`,
   `product/*` in `apps/host/src/App.tsx` — dropping the trailing `/*` breaks
   the MFE's internal routing.
4. **Federation singleton map must stay identical across all four
   `vite.config.ts` files** (`react`, `react-dom`, `react-router-dom`,
   `react-redux`, all `singleton: true`). If you add a new shared
   dependency, add it to every app's config, not just one.
5. **Tailwind `prefix` per app is intentional** (`host-`, `auth-`,
   `profile-`, `product-`). Don't remove it or "simplify" class names to
   drop the prefix — see `docs/04-style-isolation.md` for why.
6. **`RemoteApp`'s `loader` prop must be a stable, module-level function
   reference** (see the `loadAuthApp` / `loadProfileApp` / `loadProductApp`
   constants in `apps/host/src/App.tsx`). An inline arrow function there
   would re-trigger `React.lazy()` on every host re-render.
7. **No client-visible auth token, anywhere.** Auth is a backend-issued
   httpOnly session cookie (`apps/backend/src/middleware/session.js`) plus
   `withCredentials: true` in `packages/http-client` — don't reintroduce a
   `localStorage` token or an `Authorization` header. See
   `docs/07-security-architecture.md` § 3.3.
8. **Every remote's `vite.config.ts` needs `createRemoteEntryGuardPlugin`
   and the CSP/CORS `headers` block** (`packages/asset-token`) — don't
   revert to the old permissive `cors: true`. If you add a fifth remote,
   copy this pattern, not the pre-hardening one.
9. **Every app's `main.tsx` calls `markTrustedShell()`** (`@mfe/trusted-shell`)
   — host and every MFE's standalone entry, not just the host. Skipping it
   in a new MFE means that MFE's `<TrustedShellGate>` always renders the
   "Execution Environment Error" fallback, including standalone.
10. **Never run bare `yarn dev` at the repo root expecting federation to
    work.** It starts every app's dev server, including auth/profile/product
    — dev mode has no built `remoteEntry.js`, so the host's Tier 2 integrity
    check throws (and if a preview server already holds those ports,
    `strictPort: true` makes the dev server fail outright instead of picking
    another one). Use `yarn remotes:preview` + `yarn dev:host`, or `yarn serve`.

## Commands

```bash
cd apps/backend && yarn dev   # start the fake API first (not part of turbo dev/build)
yarn install                 # once, from repo root
yarn remotes:preview          # build + preview auth/profile/product together
yarn dev:host                 # host with HMR, :5173 — pairs with the line above
yarn serve                    # or: build + preview ALL FOUR in one shot
cd apps/<name> && yarn dev   # isolate exactly one app in total isolation
```

Federation (`import("authApp/App")` etc.) only resolves after a real
`vite build` — plain `vite dev` on a remote does not reliably emit a
consumable `remoteEntry.js`, and per rule 10 above, root-level `yarn dev`
is not the command for testing the federated shell. Full detail:
`docs/06-runtime-lifecycle.md`. Seeded demo login: `demo@example.com` / `password123`.

## Where things live

| Need to change... | Look at |
|---|---|
| An event name/payload shared between apps | `packages/event-bus/src/index.ts` (`EventPayloadMap`) — single source of truth |
| HTTP/axios conventions (base URL, cookie credentials, error shape) | `packages/http-client/src/index.ts` |
| Host nav, top-level routes, remote loading/fallback UI | `apps/host/src/App.tsx`, `apps/host/src/components/` |
| Tier 2 signed-token/SRI-lite handshake | `apps/host/src/security/remoteAssetAuth.ts`, `packages/asset-token/src/index.js` |
| Tier 3 runtime handshake | `packages/trusted-shell/src/index.tsx` |
| Fake backend routes/data/sessions | `apps/backend/src/routes/`, `apps/backend/src/data/`, `apps/backend/src/middleware/session.js` |
| One MFE's own pages/routes/store | `apps/<name>/src/App.tsx`, `apps/<name>/src/pages/`, `apps/<name>/src/store/` |
| Federation wiring (ports, exposes, remotes, shared deps, CSP/CORS headers) | Each app's `vite.config.ts` |
| Tailwind prefix / content globs for one app | `apps/<name>/tailwind.config.js` |

## Conventions to follow when extending

- New MFE app: copy `apps/product` (simplest of the three) as the template —
  same `package.json` script set, same `App.tsx`/`main.tsx` split, same
  `vite.config.ts` shape (just change `name`, `exposes`, and the port).
- New shared package: source-only like `http-client`/`event-bus` (`main`
  pointing at `src/index.ts`) unless it genuinely needs a build step —
  don't introduce a bundler config for a package that doesn't need one.
- New cross-app event: add it to `EventPayloadMap` first, export a constant
  in `MFE_EVENTS` if it's meant to be referenced by name elsewhere, then wire
  the emitter and listener(s).
- Don't add a shared UI/component-library package unless explicitly asked —
  it's an intentional non-goal (see `docs/01-executive-summary.md`).
