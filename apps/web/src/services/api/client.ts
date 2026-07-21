import { getCurrentLocale } from "../../i18n";
import { SessionManager, type AuthTokenPair } from "./session";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const API_TIMEOUT_MS = 10000;
const STORAGE_ACCESS_KEY = "eclick-one-access-token";
const STORAGE_REFRESH_KEY = "eclick-one-refresh-token";
const STORAGE_USER_KEY = "eclick-one-user";

export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
    readonly source: "api" | "network" | "runtime" = "api",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ApiError = AppError;

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await sendApiRequest(path, init, await getRequestAccessToken());
  if (response.status === 401) {
    const refreshedAccessToken = await sessionManager.refreshAfterUnauthorized();
    if (refreshedAccessToken) {
      const retry = await sendApiRequest(path, init, refreshedAccessToken);
      return parseApiResponse<T>(retry);
    }
    clearApiSession();
  }
  return parseApiResponse<T>(response);
}

export function setApiSession(tokens: AuthTokenPair): void {
  sessionManager.setSession(tokens);
}

export function clearApiSession(): void {
  sessionManager.clearSession();
}

async function getRequestAccessToken(): Promise<string | null> {
  const sessionAccessToken = await sessionManager.getAccessToken();
  if (sessionAccessToken) return sessionAccessToken;
  return hydrateStoredApiSession();
}

async function sendApiRequest(
  path: string,
  init: RequestInit,
  accessToken: string | null,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Accept-Language", getCurrentLocale());
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(joinUrl(path), {
      ...init,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (error) {
    throw normalizeAppError(error);
  } finally {
    clearTimeout(timeout);
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const error = isErrorPayload(payload) ? payload.error : null;
    throw new AppError(
      error?.message ?? `API request failed with status ${response.status}.`,
      response.status,
      error?.code,
      error?.details,
      "api",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const sessionManager: SessionManager = new SessionManager(refreshAuthSession, clearPersistedAuth);

async function refreshAuthSession(): Promise<AuthTokenPair> {
  return rawApiRequest<AuthTokenPair>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: sessionManager.getRefreshToken() }),
  });
}

function hydrateStoredApiSession(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  const accessToken = localStorage.getItem(STORAGE_ACCESS_KEY);
  const refreshToken = localStorage.getItem(STORAGE_REFRESH_KEY);
  if (!accessToken) return null;
  if (refreshToken) {
    sessionManager.setSession({ accessToken, refreshToken, tokenType: "Bearer" });
  }
  return accessToken;
}

function clearPersistedAuth(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_ACCESS_KEY);
  localStorage.removeItem(STORAGE_REFRESH_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
}

async function rawApiRequest<T>(path: string, init: RequestInit): Promise<T> {
  return parseApiResponse(await sendApiRequest(path, init, null));
}

export function normalizeAppError(error: unknown, fallbackMessage?: string): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return new AppError(message("offline"), 0, "NETWORK_OFFLINE", error, "network");
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AppError(message("timeout"), 408, "NETWORK_TIMEOUT", error, "network");
  }
  if (error instanceof Error) {
    return new AppError(error.message || fallbackMessage || message("generic"), 0, "NETWORK_UNAVAILABLE", error, "network");
  }
  return new AppError(fallbackMessage || message("generic"), 0, "UNKNOWN_ERROR", error, "runtime");
}

function isErrorPayload(value: unknown): value is { error: { message?: string; code?: string; details?: unknown } } {
  if (!value || typeof value !== "object" || !("error" in value)) {
    return false;
  }
  const error = (value as { error?: unknown }).error;
  return Boolean(error) && typeof error === "object";
}

function joinUrl(path: string): string {
  const base = String(API_BASE_URL).replace(/\/+$/, "");
  if (base.startsWith("http://") || base.startsWith("https://")) {
    return new URL(path, `${base}/`).toString();
  }
  if (base === "/api/v1") {
    return path.startsWith("/api/v1") ? path : `/api/v1${path.startsWith("/") ? path : `/${path}`}`;
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function message(key: keyof typeof clientMessages.en): string {
  return clientMessages[getCurrentLocale()][key];
}

const clientMessages = {
  en: {
    offline: "You are offline. Reconnect to continue.",
    timeout: "The request timed out. Please try again.",
    generic: "The request could not be completed.",
  },
  es: {
    offline: "No hay conexion. Reconectese para continuar.",
    timeout: "La solicitud excedio el tiempo de espera. Intente de nuevo.",
    generic: "No se pudo completar la solicitud.",
  },
} as const;
