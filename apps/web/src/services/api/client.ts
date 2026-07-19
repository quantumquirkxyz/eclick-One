import { getCurrentLocale } from "../../i18n";
import { getAccessToken, getCsrfToken, refreshSession } from "./session";

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
  init: AuthRequestInit = {},
): Promise<T> {
  const { skipAuthRefresh, ...requestInit } = init as AuthRequestInit;
  const response = await sendRequest(path, requestInit);
  if (response.status === 401 && !skipAuthRefresh) {
    await refreshSession();
    return parseResponse<T>(await sendRequest(path, requestInit));
  }
  return parseResponse<T>(response);
}

interface AuthRequestInit extends RequestInit {
  skipAuthRefresh?: boolean;
}

async function sendRequest(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Accept-Language", getCurrentLocale());
  const accessToken = getAccessToken();
  const csrfToken = getCsrfToken();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(joinUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let payload: { error?: { message?: string; code?: string; details?: unknown } } | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw new ApiError(
      payload?.error?.message ?? `API request failed with status ${response.status}.`,
      response.status,
      payload?.error?.code,
      payload?.error?.details,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
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
