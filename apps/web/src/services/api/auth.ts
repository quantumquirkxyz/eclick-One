import { apiRequest, clearApiSession, setApiSession } from "./client";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType?: "Bearer";
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  nombre: string;
  apellido: string;
  password: string;
}

const STORAGE_ACCESS_KEY = "eclick-one-access-token";
const STORAGE_REFRESH_KEY = "eclick-one-refresh-token";
const STORAGE_USER_KEY = "eclick-one-user";

export interface StoredUser {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  role: "admin" | "operator" | "viewer" | "agent";
}

export const authApi = {
  async login(input: LoginInput): Promise<AuthTokens> {
    return apiRequest<AuthTokens>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async register(input: RegisterInput): Promise<AuthTokens> {
    return apiRequest<AuthTokens>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    return apiRequest<AuthTokens>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await apiRequest<null>("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Silently ignore logout errors
    }
  },
};

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(STORAGE_ACCESS_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_REFRESH_KEY);
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(STORAGE_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(STORAGE_ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(STORAGE_REFRESH_KEY, tokens.refreshToken);
  setApiSession({ ...tokens, tokenType: tokens.tokenType ?? "Bearer" });
}

export function saveUser(user: StoredUser): void {
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  clearApiSession();
  localStorage.removeItem(STORAGE_ACCESS_KEY);
  localStorage.removeItem(STORAGE_REFRESH_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
}
