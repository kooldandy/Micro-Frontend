// Ambient module declarations for the federated remotes. The actual modules
// only resolve at runtime via @originjs/vite-plugin-federation; these
// declarations exist purely so TypeScript can typecheck the dynamic
// `import("authApp/App")`-style calls in App.tsx.
declare module "authApp/App" {
  import type { ComponentType } from "react";
  const App: ComponentType;
  export default App;
}

declare module "profileApp/App" {
  import type { ComponentType } from "react";
  const App: ComponentType;
  export default App;
}

declare module "productApp/App" {
  import type { ComponentType } from "react";
  const App: ComponentType;
  export default App;
}
