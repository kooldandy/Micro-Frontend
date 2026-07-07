# 03 — Two-Tier Routing Blueprint

## The Hierarchy

There are exactly two routers involved at any moment, never more:

1. **Macro router (host)** — one `<BrowserRouter>`, created in
   `apps/host/src/main.tsx`, owns the entire URL space (`/dashboard`,
   `/auth/*`, `/profile/*`, `/product/*`).
2. **Micro router (the active MFE)** — a plain `<Routes>` block inside that
   MFE's exposed `App.tsx`, with **no `<BrowserRouter>` of its own** when
   running federated.

## The Trailing Wildcard

The host declares each MFE's mount point with a trailing `/*`:

```tsx
// apps/host/src/App.tsx
<Route path="auth/*" element={<RemoteApp name="Auth" loader={loadAuthApp} />} />
<Route path="profile/*" element={<RemoteApp name="Profile" loader={loadProfileApp} />} />
<Route path="product/*" element={<RemoteApp name="Product" loader={loadProductApp} />} />
```

The `/*` tells React Router "match this prefix, then hand the remainder of
the path to whatever renders here." The MFE's own `<Routes>` (e.g.
`apps/auth/src/App.tsx`) then matches against that remainder using ordinary
relative paths — it has no idea it's mounted under `/auth`:

```tsx
// apps/auth/src/App.tsx — exposed as federation entry "./App"
<Routes>
  <Route path="login" element={<LoginPage />} />
  <Route path="register" element={<RegisterPage />} />
</Routes>
```

`/auth/login` in the browser → host's `auth/*` route matches → `AuthApp`
renders → its own `login` route matches. Neither router needs to know the
other's full path; the wildcard is the entire contract between them.

## One Component, Two Hosts

Every MFE's `App.tsx` is written to be mountable in two different contexts
without modification:

| Context | Who provides the Router | Entry point |
|---|---|---|
| Standalone dev (`yarn dev` inside `apps/auth`) | The MFE's own `src/main.tsx` wraps `<App />` in `<BrowserRouter>` | `main.tsx` |
| Federated into host | The host's `<BrowserRouter>` (already on the page) | `App.tsx` via `./App` federation expose |

This is why `App.tsx` never imports `BrowserRouter` — doing so would either
break federated mode (nested routers) or make standalone mode redundant.
`main.tsx` is the only place that decides "am I the top of the URL space."

## Fallback Route

The host's route table ends with a catch-all:

```tsx
<Route path="*" element={<NotFoundPage />} />
```

This only fires for paths that don't match `dashboard`, `auth/*`,
`profile/*`, or `product/*` at all — it is distinct from the
[ErrorBoundary fallback](./06-runtime-lifecycle.md) that fires when a
matched remote fails to *load*.
