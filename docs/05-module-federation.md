# 05 — Module Federation Configuration (Vite)

Federation is implemented with `@originjs/vite-plugin-federation` — the Vite
equivalent of Webpack 5 Module Federation. Every app's `vite.config.ts`
carries the same shape: a `name`, either `exposes` (remotes) or `remotes`
(the host), and a `shared` singleton map.

## Topology

```
host (consumer only, port 5173)
 ├── remote: authApp    → http://localhost:5174/assets/remoteEntry.js
 ├── remote: profileApp → http://localhost:5175/assets/remoteEntry.js
 └── remote: productApp → http://localhost:5176/assets/remoteEntry.js

auth-app    (port 5174) → exposes "./App" → apps/auth/src/App.tsx
profile-app (port 5175) → exposes "./App" → apps/profile/src/App.tsx
product-app (port 5176) → exposes "./App" → apps/product/src/App.tsx
```

## Side-by-Side: Host vs. Remote Config

| Option | Host (`apps/host/vite.config.ts`) | Remote (`apps/auth\|profile\|product/vite.config.ts`) |
|---|---|---|
| `name` | `"host"` | `"authApp"` / `"profileApp"` / `"productApp"` — must match the key the host uses in its `remotes` map |
| `exposes` | — (host exposes nothing) | `{ "./App": "./src/App.tsx" }` |
| `remotes` | `{ authApp: "…/remoteEntry.js", profileApp: "…", productApp: "…" }` | — (remotes don't consume other remotes in this topology) |
| `filename` | — | `"remoteEntry.js"` (emitted under the build output's assets dir, e.g. `dist/assets/remoteEntry.js` — confirmed by building; the host's `remotes` URLs must include `/assets/`) |
| `shared` | singleton map (below) | identical singleton map |
| `build.target` | `"esnext"` | `"esnext"` (required — federation relies on native dynamic `import()`) |
| `build.cssCodeSplit` | `false` | `false` (keeps each remote's CSS as one file the host can inject in full) |

## Shared Dependency (Singleton) Matrix

Every app — host and all three remotes — declares the identical `shared`
block:

```ts
shared: {
  react: { singleton: true, requiredVersion: false },
  "react-dom": { singleton: true, requiredVersion: false },
  "react-router-dom": { singleton: true, requiredVersion: false },
  "react-redux": { singleton: true, requiredVersion: false },
}
```

- `singleton: true` — only one copy of React (etc.) is ever loaded on the
  page, no matter how many federated apps request it. Without this, each
  remote would ship its own React and hooks would break across the
  federation boundary (e.g. two React copies means `useContext` from one
  copy can't read a Provider from another).
- `requiredVersion: false` — every app in this repo is pinned to the same
  major/minor versions (see each `package.json`), so we deliberately skip the
  plugin's stricter version-matching to avoid noisy warnings in a monorepo
  where all apps are versioned together. If apps genuinely start diverging on
  React major versions, remove this and let the plugin enforce it.
- `@reduxjs/toolkit` is **not** shared as a singleton — by design. Each app
  has its own Redux store instance (see [02](./02-state-management.md)), so
  there's no cross-app singleton requirement; RTK is just a regular
  dependency of each app.

## Why Build/Preview, Not `vite dev`, for Integration

`@originjs/vite-plugin-federation` generates `remoteEntry.js` as part of
`vite build`. Running a remote with plain `vite dev` does **not** reliably
produce a federation-consumable module graph. The practical workflow:

- **Isolated development** of one app: `yarn workspace auth-app dev` (or
  `cd apps/auth && yarn dev`) — ordinary Vite dev server, no federation
  involved, fastest HMR loop.
- **Full integration testing** (host + all three remotes wired together):
  `yarn build` (builds every workspace) then `yarn preview` (or the root
  `yarn serve` convenience script, which chains both) — every app now serves
  its built `dist/` including `remoteEntry.js`, and the host's dynamic
  `import("authApp/App")` resolves for real.

See [06-runtime-lifecycle.md](./06-runtime-lifecycle.md) for the full command
reference.
