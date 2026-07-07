# 02 — State Management: The Decoupled Store Mandate

## The Mandate

Every app owns exactly one Redux Toolkit store, created in its own
`src/store/store.ts`, and **never shares that store instance with another
app.** Concretely:

- `host`, `auth`, `profile`, and `product` each call their own
  `configureStore()`. There are four separate store instances at runtime when
  all apps are mounted together — not one.
- A federated app's exposed `App.tsx` wraps itself in its **own**
  `<Provider store={store}>`. The host does not — and cannot — inject its
  store into a remote, and a remote never expects one from its host.
- No app imports another app's slice, selector, or store module. If
  `product-app` needs to know whether a user is signed in, it does not import
  `auth-app`'s `authSlice` — it listens for `auth:login` / `auth:logout`
  events and keeps its own local mirror (see `apps/profile/src/store/sessionSlice.ts`
  for the reference implementation).

## Why

Sharing one Redux store across independently-deployed apps re-introduces the
exact coupling microfrontends are meant to remove: a slice shape change in
one app would silently break a reducer in another, and every app would need
to agree on a single store shape and a single deploy cadence for state logic.
Decoupled stores mean a team can add, remove, or restructure their slices
freely.

## The Only Two Communication Channels

### 1. Props (mount-time / parent-to-child)

When the host renders a remote, it may pass plain React props — this is a
one-way, one-time (per-mount) handoff, not a live subscription. Used for
things like passing a `basePath` or feature flag down.

### 2. `@mfe/event-bus` (runtime, bidirectional, decoupled)

For anything that happens *after* mount — "the user logged in," "an item was
added to cart," "the profile was updated" — apps communicate via safe,
native browser `CustomEvent`s dispatched on `window`, wrapped by
`packages/event-bus/src/index.ts`:

```ts
import { emit, on, MFE_EVENTS } from "@mfe/event-bus";

// auth-app, after a successful login:
emit("auth:login", { userId: user.id });

// profile-app or host, anywhere:
const unsubscribe = on("auth:login", ({ userId }) => { /* ... */ });
```

Why `CustomEvent` instead of a message bus library or shared store:

- It's a browser primitive — zero extra runtime dependency, works identically
  whether the emitting/listening app was federated or is running standalone.
  As with any pub/sub channel, a listener only receives events fired after it
  subscribes, so mount order matters for one-shot events.
- `EventPayloadMap` in `packages/event-bus/src/index.ts` is the single typed
  contract for every event name and its payload shape — add a new event there
  first, then implement the emitter/listener.

### Auth Session: No Client-Visible Token At All

There is no token in this repo for any app to store — `localStorage`,
`sessionStorage`, or otherwise. See
[07-security-architecture.md § 3.3](./07-security-architecture.md#33-token-theft--decentralized-session-management-bff-pattern)
for the full write-up; the short version: `apps/backend` issues an
**httpOnly** session cookie on login/register, `packages/http-client` sets
`withCredentials: true` so the browser attaches it automatically, and no
app's JavaScript ever has a token to read, forward, or leak. This isn't a
violation of the decoupled-store mandate either way — the cookie is a
browser/network-layer mechanism, not shared in-memory state between apps.
If you need shared *session* knowledge (e.g. "is someone logged in, and
who"), that still goes over the event bus (`auth:login` payload carries
`userId`, nothing else), not a shared store.

## Session Bootstrap: Every App Checks For Itself

Earlier versions of this doc noted a real gap here: `auth-app` re-derived
"am I logged in" via its own `GET /api/auth/session` on mount, but `host`'s
`uiSlice` and `profile-app`'s `sessionSlice` only learned about a session by
listening for the `auth:login` event `auth-app`'s bootstrap emits — which
only happens once `auth-app` itself has mounted. Reload the page on
`/profile` (never having visited `/auth/*` this session) and the nav would
incorrectly show "Not signed in" even with a valid session cookie.

This is now closed for both apps that display session-dependent UI:
`apps/host/src/hooks/useShellSync.ts` and `apps/profile/src/hooks/
useSessionSync.ts` each run their **own** `GET /api/auth/session` check on
mount (via `nativeFetch` in the host, via a small `sessionApi` client in
profile-app), in addition to — not instead of — listening for
`auth:login`/`auth:logout`. The event bus still handles the "already
mounted and something just happened" case; the mount-time check handles "I
just mounted and need to know the current state." `product-app` doesn't
need this since it has no session-dependent UI today — add the same pattern
there if that changes.

This does mean three separate `GET /session` calls can fire on a full page
load with everything mounted (host, auth, profile) — a deliberate trade-off
for correctness over one extra cheap request, not an oversight.
