// 3.4 Global scope pollution mitigation (docs/07-security-architecture.md):
// capture the real `window.fetch` before any federated remote has had a
// chance to load and monkey-patch it. Only this captured reference is used
// for the security-sensitive asset-token/manifest/integrity calls in
// remoteAssetAuth.ts — never `window.fetch` looked up again at call time.
//
// Deliberately scoped to just this one vector rather than a blanket
// `Object.freeze(Object.prototype)` at boot — freezing shared prototypes
// globally was evaluated and rejected (real risk of breaking React, Redux,
// or axios internals that legitimately extend/read those prototypes).
export const nativeFetch: typeof window.fetch = window.fetch.bind(window);
