import type { ReactNode } from "react";

/**
 * Tier 3 runtime handshake (docs/07-security-architecture.md).
 *
 * IMPORTANT — read before relying on this for anything sensitive: this is an
 * integrity/provenance signal, NOT a confidentiality boundary. The token
 * below ships in every app's client bundle, so anyone who downloads the
 * bundle can read it. What this DOES raise the bar against is a foreign page
 * casually `import()`-ing one of our exposed remotes into an execution
 * context that never ran one of our own bootstraps (host or standalone) —
 * a copy-paste/embed scenario, not a determined attacker who has already
 * read our source.
 */
const SHELL_CONTEXT_KEY = "__MFE_SHELL_CONTEXT__";
const DEV_DEFAULT_SHELL_TOKEN = "mfe-shell-v1-3f8b2c91d4a07e6f";

function getShellToken(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_MFE_SHELL_TOKEN || DEV_DEFAULT_SHELL_TOKEN;
}

/**
 * Called by every app's own `main.tsx` — the host AND each MFE's standalone
 * entry point — so this is "I am running inside one of our own bootstraps,"
 * not "I am specifically the host." Idempotent so repeated calls (HMR,
 * StrictMode) never throw on the `configurable: false` re-definition.
 */
export function markTrustedShell(): void {
  const w = window as unknown as Record<string, unknown>;
  if (SHELL_CONTEXT_KEY in w) return;
  Object.defineProperty(w, SHELL_CONTEXT_KEY, {
    value: getShellToken(),
    writable: false,
    configurable: false,
    enumerable: false,
  });
}

export function isTrustedShell(): boolean {
  const w = window as unknown as Record<string, unknown>;
  return w[SHELL_CONTEXT_KEY] === getShellToken();
}

/** Wraps a federated remote's exposed root so it refuses to render outside a trusted bootstrap. */
export function TrustedShellGate({ children }: { children: ReactNode }) {
  if (!isTrustedShell()) {
    console.error("[CRITICAL] Security Exception: MFE execution environment validation failed.");
    return (
      <div style={{ padding: 20, color: "#b91c1c", textAlign: "center" }}>
        <h3>Execution Environment Error</h3>
        <p>This application component is unauthorized to run in this context.</p>
      </div>
    );
  }
  return <>{children}</>;
}
