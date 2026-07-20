import { getCurrentLocale } from "../../i18n";
import { SessionManager, type AuthTokenPair } from "./session";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await sendApiRequest(path, init, await sessionManager.getAccessToken());
  if (response.status === 401) {
    const refreshedAccessToken = await sessionManager.refreshAfterUnauthorized();
    if (refreshedAccessToken) {
      const retry = await sendApiRequest(path, init, refreshedAccessToken);
      return parseApiResponse<T>(retry);
    }
    sessionManager.clearSession();
  }
  return parseApiResponse<T>(response);
}

export function setApiSession(tokens: AuthTokenPair): void {
  sessionManager.setSession(tokens);
}

export function clearApiSession(): void {
  sessionManager.clearSession();
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
  return fetch(joinUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
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
    throw new ApiError(
      error?.message ?? `API request failed with status ${response.status}.`,
      response.status,
      error?.code,
      error?.details,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const sessionManager = new SessionManager(async () =>
  rawApiRequest<AuthTokenPair>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({}),
  }),
);

async function rawApiRequest<T>(path: string, init: RequestInit): Promise<T> {
  return parseApiResponse(await sendApiRequest(path, init, null));
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
