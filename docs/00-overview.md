# Microfrontend Architecture — Overview

This `docs/` folder is the technical requirements & architecture reference for
the monorepo. It exists separately from application code so it survives
refactors and can be read without opening a single app.

## Repo Layout

```
apps/
  host/       Macro shell — owns the top-level router, nav, and consumes remotes
  auth/       Login / registration MFE
  profile/    View / edit profile MFE
  product/    Product catalog + cart MFE
  backend/    Fake API (Express) — auth sessions, profile/product data, asset tokens
packages/
  http-client/    @mfe/http-client    — shared axios factory (cookie-based auth)
  event-bus/      @mfe/event-bus      — shared CustomEvent pub/sub
  asset-token/    @mfe/asset-token    — signed remoteEntry.js tokens (Node-only)
  trusted-shell/  @mfe/trusted-shell  — Tier 3 runtime handshake (browser)
docs/         This folder
```

## Reading Order

1. [01-executive-summary.md](./01-executive-summary.md) — goals & team autonomy model
2. [02-state-management.md](./02-state-management.md) — decoupled store mandate + event bus
3. [03-routing-blueprint.md](./03-routing-blueprint.md) — two-tier routing
4. [04-style-isolation.md](./04-style-isolation.md) — Tailwind prefixes / CSS Modules
5. [05-module-federation.md](./05-module-federation.md) — Vite federation config matrix
6. [06-runtime-lifecycle.md](./06-runtime-lifecycle.md) — dev/build/deploy flow, error boundaries
7. [07-security-architecture.md](./07-security-architecture.md) — 3-tier handshake, BFF auth, coverage matrix

## Tech Stack

React 18 · Redux Toolkit · Tailwind CSS · Vite · Axios · Express ·
`@originjs/vite-plugin-federation` · Turborepo · Yarn Classic workspaces.
No test runner / e2e framework is configured by design — out of scope for
this build.
