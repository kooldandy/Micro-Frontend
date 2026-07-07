import { createHttpClient } from "@mfe/http-client";
import { emit } from "@mfe/event-bus";

// Falls back to the documented default if VITE_API_BASE_URL isn't set (e.g.
// no .env file yet) — see apps/profile/.env.example.
export const profileApi = createHttpClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/profile",
  onUnauthorized: () => emit("auth:logout"),
});
