import { getCurrentLocale } from "../../i18n";

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
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Accept-Language", getCurrentLocale());
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(joinUrl(path), {
    ...init,
    headers,
  });
  if (!response.ok) {
    let payload: any = null;
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
