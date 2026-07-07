import { createHttpClient } from "@mfe/http-client";

// Independent session check so this app doesn't have to depend on auth-app
// having mounted first to learn whether a user is signed in — see
// docs/02-state-management.md's "Known Limitation" and useSessionSync.ts.
export const sessionApi = createHttpClient({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:4000"}/api/auth`,
});
