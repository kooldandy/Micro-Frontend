/**
 * @mfe/event-bus
 *
 * Cross-microfrontend communication layer built on native, safe browser
 * `CustomEvent`s dispatched on `window`. This is the ONLY sanctioned channel
 * for one app to talk to another — no shared Redux store, no direct imports
 * between app boundaries. See docs/02-state-management.md.
 */

export interface EventPayloadMap {
  // No token here on purpose — the BFF pattern (docs/07-security-architecture.md,
  // Tier 3.3) means no app ever holds a client-visible auth token to pass along.
  "auth:login": { userId: string };
  "auth:logout": undefined;
  "auth:token-refreshed": { token: string };
  "profile:updated": { userId: string; changes: Record<string, unknown> };
  "product:added-to-cart": { productId: string; quantity: number };
  "host:navigate": { path: string };
}

export type MfeEventName = keyof EventPayloadMap;

export const MFE_EVENTS = {
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_TOKEN_REFRESHED: "auth:token-refreshed",
  PROFILE_UPDATED: "profile:updated",
  PRODUCT_ADDED_TO_CART: "product:added-to-cart",
  HOST_NAVIGATE: "host:navigate",
} as const satisfies Record<string, MfeEventName>;

type EmitArgs<K extends MfeEventName> = EventPayloadMap[K] extends undefined
  ? [name: K]
  : [name: K, detail: EventPayloadMap[K]];

/** Dispatches a typed CustomEvent on `window` so any mounted app can react. */
export function emit<K extends MfeEventName>(...args: EmitArgs<K>): void {
  const [name, detail] = args;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Subscribes to a typed event; returns an unsubscribe function. */
export function on<K extends MfeEventName>(
  name: K,
  handler: (detail: EventPayloadMap[K]) => void
): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<EventPayloadMap[K]>).detail);
  };
  window.addEventListener(name, listener as EventListener);
  return () => window.removeEventListener(name, listener as EventListener);
}

/** Subscribes to a single occurrence of an event, then auto-unsubscribes. */
export function once<K extends MfeEventName>(
  name: K,
  handler: (detail: EventPayloadMap[K]) => void
): () => void {
  const off = on(name, (detail) => {
    off();
    handler(detail);
  });
  return off;
}
