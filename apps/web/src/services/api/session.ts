import { apiRequest } from "./client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "operator" | "viewer" | "agent";
}

export interface AuthSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  csrfToken: string;
  user: SessionUser;
}

type Listener = (session: AuthSession | null, reason: "login" | "refresh" | "logout" | "expired") => void;

const refreshLeadRatio = 0.8;
const listeners = new Set<Listener>();
let currentSession: AuthSession | null = null;
let refreshPromise: Promise<AuthSession> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("eclick-session") : null;

channel?.addEventListener("message", (event: MessageEvent<{ type: "logout" }>) => {
  if (event.data?.type === "logout") {
    clearSession("logout", false);
  }
});

export function getAccessToken(): string | null {
  return currentSession?.accessToken ?? null;
}

export function getCsrfToken(): string | null {
  return currentSession?.csrfToken ?? readCookie("eclick_csrf");
}

export function getCurrentSession(): AuthSession | null {
  return currentSession;
}

export function subscribeToSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuthRefresh: true,
  });
  setSession(session, "login");
  return session;
}

export async function refreshSession(): Promise<AuthSession> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = apiRequest<AuthSession>("/auth/refresh", {
    method: "POST",
    skipAuthRefresh: true,
  })
    .then((session) => {
      setSession(session, "refresh");
      return session;
    })
    .catch((error) => {
      clearSession("expired", true);
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<void>("/auth/logout", {
      method: "POST",
      skipAuthRefresh: true,
    });
  } finally {
    clearSession("logout", true);
  }
}

export function setSession(session: AuthSession, reason: "login" | "refresh"): void {
  currentSession = session;
  scheduleRefresh(session);
  notify(reason);
}

export function clearSession(reason: "logout" | "expired", broadcast: boolean): void {
  currentSession = null;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  notify(reason);
  if (broadcast) channel?.postMessage({ type: "logout" });
}

function scheduleRefresh(session: AuthSession): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  const expiresAtMs = Date.parse(session.accessTokenExpiresAt);
  const remainingMs = expiresAtMs - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return;
  refreshTimer = setTimeout(() => {
    void refreshSession();
  }, Math.max(1_000, Math.floor(remainingMs * refreshLeadRatio)));
}

function notify(reason: "login" | "refresh" | "logout" | "expired"): void {
  for (const listener of listeners) listener(currentSession, reason);
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}
