# 01 — Executive Summary & Goals

## Why Microfrontends

Four teams (Host/Shell, Auth, Profile, Product) need to ship on independent
schedules without a release-train blocking one team on another's code
review, CI, or deploy window. A single-repo, single-bundle SPA makes that
impossible — any change anywhere forces a full app rebuild and a coordinated
release. Splitting along team/domain boundaries and federating at runtime
removes that coupling.

## Goals

1. **Team autonomy** — each app (`auth`, `profile`, `product`) is buildable,
   runnable, and (conceptually) deployable on its own. A team can change its
   app's internals, dependencies, or even its Redux slice shape without
   touching another team's code or coordinating a release.
2. **One shell, many remotes** — `host` owns navigation chrome and the
   top-level URL space; it does not own business logic for auth/profile/product.
3. **No hidden coupling** — the only sanctioned cross-app contact points are
   (a) props passed at mount time and (b) `@mfe/event-bus` CustomEvents.
   Direct imports of one app's internals from another are not permitted.
4. **Fail soft** — if a remote is down, slow, or throws, the host shows a
   contained fallback instead of a blank page or a hard crash.
5. **Consistent tooling, independent versioning** — every app shares the same
   Vite/Tailwind/Redux Toolkit/axios major versions (enforced by the shared
   `singleton` federation config, see [05](./05-module-federation.md)), but
   each app's `package.json` is otherwise independent.

## Operational Parameters

| Concern | Owner | Notes |
|---|---|---|
| Top-level routing (`/dashboard`, `/auth`, `/profile`, `/product`) | Host | See [03](./03-routing-blueprint.md) |
| Auth session state | Auth app | Published via `auth:login` / `auth:logout` events |
| HTTP conventions (base URL, auth header, error shape) | `packages/http-client` | Consumed, not forked, by every app |
| Cross-app messaging contract | `packages/event-bus` | `EventPayloadMap` is the single source of truth for event names/shapes |
| Visual isolation | Each app's `tailwind.config.js` | Unique `prefix` per app, see [04](./04-style-isolation.md) |

## Non-Goals (this build)

- No automated test suite or e2e harness — explicitly excluded.
- No CI/CD pipeline definitions.
- No shared design-system/component-library package — each app owns its UI.
- No server-side rendering.
