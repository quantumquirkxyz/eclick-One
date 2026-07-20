import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  authApi,
  clearAuth,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  saveTokens,
  saveUser,
  type AuthTokens,
  type LoginInput,
  type RegisterInput,
  type StoredUser,
} from "../services/api/auth";
import { apiRequest } from "../services/api/client";

interface AuthContextValue {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login(input: LoginInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  getAccessToken(): string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(getStoredUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (token && !user) {
      verifyToken(token).then((u) => {
        if (u) {
          setUser(u);
          saveUser(u);
        } else {
          clearAuth();
          setUser(null);
        }
      }).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: user !== null,
    isLoading,
    async login(input) {
      const tokens = await authApi.login(input);
      saveTokens(tokens);
      const u = await verifyToken(tokens.accessToken);
      if (u) {
        setUser(u);
        saveUser(u);
      }
    },
    async register(input) {
      const tokens = await authApi.register(input);
      saveTokens(tokens);
      const u = await verifyToken(tokens.accessToken);
      if (u) {
        setUser(u);
        saveUser(u);
      }
    },
    async logout() {
      const refresh = getStoredRefreshToken();
      if (refresh) await authApi.logout(refresh);
      clearAuth();
      setUser(null);
    },
    getAccessToken() {
      return getStoredAccessToken();
    },
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}

async function verifyToken(token: string): Promise<StoredUser | null> {
  try {
    const body = await apiRequest<{ user: StoredUser }>("/api/v1/auth/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return body.user;
  } catch {
    return null;
  }
}
