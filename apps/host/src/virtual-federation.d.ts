// Ambient declaration for @originjs/vite-plugin-federation's internal
// runtime module. Verified against the installed package's source
// (node_modules/@originjs/vite-plugin-federation/dist/index.mjs) before
// relying on it — see docs/07-security-architecture.md, Tier 2, for why:
// this is what lets the host repoint a remote at a signed, token-bearing
// URL at call time instead of the static URL baked in at build time.
declare module "virtual:__federation__" {
  export function __federation_method_setRemote(
    remoteName: string,
    remoteConfig: {
      url: string | (() => Promise<string>);
      format: "esm" | "systemjs" | "var";
      from: "vite" | "webpack";
    }
  ): void;
  export function __federation_method_getRemote(remoteName: string, componentName: string): Promise<unknown>;
}
