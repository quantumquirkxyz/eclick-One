export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "operator" | "viewer" | "agent";
}

export interface AuthTokenPair {
  accessToken: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  expiresIn?: number;
  refreshToken?: string;
  tokenType: "Bearer";
  user?: SessionUser;
}

type RefreshFn = () => Promise<AuthTokenPair>;
type ClearFn = () => void;

const REFRESH_LEEWAY_MS = 30_000;
const PROACTIVE_REFRESH_RATIO = 0.8;
const DEFAULT_REFRESH_TTL_SECONDS = 604_800;
const LOGOUT_EVENT = "eclick-one:logout";

export class SessionManager {
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;
  private accessTokenIssuedAt = 0;
  private refreshToken: string | null = null;
  private refreshTokenExpiresAt = 0;
  private hasRefreshSession = false;
  private refreshPromise: Promise<string | null> | null = null;
  private readonly logoutChannel: BroadcastChannel | null;

  constructor(private readonly refreshFn: RefreshFn, private readonly onSessionCleared?: ClearFn) {
    this.logoutChannel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(LOGOUT_EVENT);
    this.logoutChannel?.addEventListener("message", () => {
      this.clearLocalSession();
    });
  }

  setSession(tokens: AuthTokenPair): void {
    const now = Date.now();
    this.accessToken = tokens.accessToken;
    this.accessTokenIssuedAt = now;
    this.accessTokenExpiresAt = expiryMs(tokens.accessTokenExpiresAt, tokens.expiresIn, now);
    this.refreshToken = tokens.refreshToken ?? null;
    this.refreshTokenExpiresAt = expiryMs(tokens.refreshTokenExpiresAt, DEFAULT_REFRESH_TTL_SECONDS, now);
    this.hasRefreshSession = Boolean(this.refreshToken);
  }

  clearSession(): void {
    this.clearLocalSession();
    this.logoutChannel?.postMessage({ type: "logout" });
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.hasRefreshSession) return this.accessToken;
    if (Date.now() >= this.refreshTokenExpiresAt - REFRESH_LEEWAY_MS) {
      this.clearLocalSession();
      return null;
    }
    if (this.accessToken && !this.shouldRefreshAccessToken()) {
      return this.accessToken;
    }
    return this.refreshAccessToken();
  }

  async refreshAfterUnauthorized(): Promise<string | null> {
    if (!this.hasRefreshSession) return null;
    return this.refreshAccessToken();
  }

  private shouldRefreshAccessToken(): boolean {
    const now = Date.now();
    if (now >= this.accessTokenExpiresAt - REFRESH_LEEWAY_MS) return true;
    const lifetime = this.accessTokenExpiresAt - this.accessTokenIssuedAt;
    return lifetime > 0 && now - this.accessTokenIssuedAt >= lifetime * PROACTIVE_REFRESH_RATIO;
  }

  private refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.performRefresh().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async performRefresh(): Promise<string | null> {
    try {
      const next = await this.refreshFn();
      this.setSession(next);
      return next.accessToken;
    } catch {
      this.clearSession();
      return null;
    }
  }

  private clearLocalSession(): void {
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
    this.accessTokenIssuedAt = 0;
    this.refreshToken = null;
    this.refreshTokenExpiresAt = 0;
    this.hasRefreshSession = false;
    this.onSessionCleared?.();
  }
}

function expiryMs(expiresAt: string | undefined, expiresInSeconds: number | undefined, now: number): number {
  const absolute = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  if (Number.isFinite(absolute)) return absolute;
  const ttlSeconds = Number.isFinite(expiresInSeconds) && expiresInSeconds && expiresInSeconds > 0
    ? expiresInSeconds
    : DEFAULT_REFRESH_TTL_SECONDS;
  return now + ttlSeconds * 1000;
}
