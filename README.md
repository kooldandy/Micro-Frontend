# Microfrontend Monorepo

Turborepo + Yarn workspaces monorepo implementing a microfrontend
architecture: a host shell that federates three independently-built React
apps (auth, profile, product) at runtime via Vite Module Federation, backed
by a fake Express API that handles real cookie-based auth sessions.

Full architecture reference: [`docs/00-overview.md`](./docs/00-overview.md).
Security architecture: [`docs/07-security-architecture.md`](./docs/07-security-architecture.md).
Reference for future Claude Code sessions: [`CLAUDE.md`](./CLAUDE.md).

## Stack

React 18 · Redux Toolkit · Tailwind CSS · Vite · Axios · Express ·
`@originjs/vite-plugin-federation` · Turborepo · Yarn Classic workspaces.

## Layout

```
apps/
  host/       :5173  macro shell — top-level router, nav, consumes remotes
  auth/       :5174  login / registration MFE
  profile/    :5175  view / edit profile MFE
  product/    :5176  product catalog + cart MFE
  backend/    :4000  fake API — auth sessions, profile/product data, asset tokens
packages/
  http-client/    @mfe/http-client    — shared axios factory (cookie-based auth)
  event-bus/      @mfe/event-bus      — shared CustomEvent pub/sub
  asset-token/    @mfe/asset-token    — signed remoteEntry.js tokens (Node-only)
  trusted-shell/  @mfe/trusted-shell  — Tier 3 runtime handshake (browser)
docs/         architecture reference (read this first)
```

## Getting Started

```bash
yarn install
```

Copy `.env.example` to `.env` in `apps/backend` and in each of
`apps/{host,auth,profile,product}` — the defaults already point every app at
each other on localhost, so this works out of the box for local dev.

Start the backend first (it's not managed by `turbo run dev`/`build` the
same way as the frontend apps since it has no build step):

```bash
cd apps/backend
yarn dev
```

Seeded demo login: `demo@example.com` / `password123`.

### Work on one frontend app in isolation

```bash
cd apps/auth   # or profile / product / host
yarn dev
```

Plain Vite dev server, own router, fastest HMR — no federation involved.
Talks to the backend directly over its `.env`'s `VITE_API_BASE_URL`.

⚠️ Don't run bare `yarn dev` at the **repo root** expecting the federated
shell to work — it starts every app's dev server at once, including
auth/profile/product, and dev mode has no built `remoteEntry.js` for the
host to load at all. See `docs/06-runtime-lifecycle.md` for exactly what
breaks and why.

### Run the full federated shell (recommended)

With the backend already running (above), in two more terminals:

```bash
yarn remotes:preview   # builds, then previews, auth + profile + product
yarn dev:host          # host with HMR, :5173
```

Or, if you don't need host HMR and just want to see it all working in one shot:

```bash
yarn serve              # build + preview all four apps
```

Then open `http://localhost:5173` — nav links load `/auth/login`,
`/profile`, `/product`, each backed by a separately-built, separately-served
app, gated by a short-lived signed token the host fetches from the backend
before each remote loads (see `docs/07-security-architecture.md`, Tier 2).
Stopping any one remote's process and refreshing demonstrates the host's
per-remote error boundary fallback instead of a crash.

## No Tests / No E2E

Intentionally excluded from this build per requirements — this repo is
infrastructure/architecture scaffolding, not a feature-complete product.

## Docs

| Doc | Covers |
|---|---|
| [00-overview.md](./docs/00-overview.md) | Repo layout, reading order |
| [01-executive-summary.md](./docs/01-executive-summary.md) | Goals, team autonomy, operational parameters |
| [02-state-management.md](./docs/02-state-management.md) | Decoupled store mandate, event bus contract |
| [03-routing-blueprint.md](./docs/03-routing-blueprint.md) | Host/MFE two-tier routing |
| [04-style-isolation.md](./docs/04-style-isolation.md) | Tailwind prefixes, CSS Modules |
| [05-module-federation.md](./docs/05-module-federation.md) | Vite federation config matrix |
| [06-runtime-lifecycle.md](./docs/06-runtime-lifecycle.md) | Dev/build/preview flow, error boundaries |
| [07-security-architecture.md](./docs/07-security-architecture.md) | 3-tier handshake, BFF auth, XSS/supply-chain/global-scope controls, coverage matrix |
