/**
 * @mfe/http-client
 *
 * Shared axios factory so every app configures HTTP the same way (base URL,
 * cookie-based auth, normalized errors) without sharing a single axios
 * instance or any in-memory state across app boundaries.
 *
 * 3.3 BFF pattern (docs/07-security-architecture.md): there is deliberately
 * no bearer-token / Authorization-header option here. Auth is carried by the
 * backend-issued httpOnly session cookie, which the browser attaches
 * automatically — that's what `withCredentials: true` enables. No app ever
 * has a token to read, store, or leak.
 */
import axios, { type AxiosError, type AxiosInstance } from "axios";

export interface ApiError {
  status: number | null;
  message: string;
  code?: string;
  details?: unknown;
}

export interface HttpClientConfig {
  /** Base URL for this app's API, e.g. import.meta.env.VITE_API_BASE_URL */
  baseURL: string;
  timeoutMs?: number;
  /** Called when a response comes back 401 (e.g. to trigger a logout event). */
  onUnauthorized?: () => void;
  extraHeaders?: Record<string, string>;
}

export function createHttpClient(config: HttpClientConfig): AxiosInstance {
  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeoutMs ?? 15000,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      ...config.extraHeaders,
    },
  });

  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const apiError = normalizeError(error);
      if (apiError.status === 401) {
        config.onUnauthorized?.();
      }
      return Promise.reject(apiError);
    }
  );

  return instance;
}

function normalizeError(error: AxiosError): ApiError {
  if (error.response) {
    const data = error.response.data as { message?: string; code?: string } | undefined;
    return {
      status: error.response.status,
      message: data?.message ?? error.message ?? "Request failed",
      code: data?.code,
      details: error.response.data,
    };
  }
  if (error.request) {
    return { status: null, message: "No response received from server", code: "NETWORK_ERROR" };
  }
  return { status: null, message: error.message ?? "Unexpected request error" };
}
