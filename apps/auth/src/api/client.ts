import { createHttpClient } from "@mfe/http-client";
import { emit } from "@mfe/event-bus";

// Falls back to the documented default if VITE_API_BASE_URL isn't set (e.g.
// no .env file yet) — see apps/auth/.env.example.
export const authApi = createHttpClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/auth",
  onUnauthorized: () => emit("auth:logout"),
});
