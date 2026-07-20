import { BadRequestError, TooManyRequestsError, UnauthorizedError } from "../errors/app-error";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "operator" | "viewer" | "agent";
}

export interface AuthTokenPair {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  tokenType: "Bearer";
  user: AuthUser;
}

export interface AuthSessionConfig {
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  authRateLimitAttempts: number;
  authRateLimitWindowSeconds: number;
  jwtSecret: string;
}

interface RefreshRecord {
  tokenHash: string;
  user: AuthUser;
  expiresAt: number;
  revoked: boolean;
}

interface RateLimitRecord {
  attempts: number;
  resetsAt: number;
}

const encoder = new TextEncoder();

export class AuthSessionService {
  private readonly refreshSessions = new Map<string, RefreshRecord>();
  private readonly revokedRefreshHashes = new Map<string, number>();
  private readonly rateLimits = new Map<string, RateLimitRecord>();
  private readonly signingKeyPromise: Promise<CryptoKey>;

  constructor(private readonly config: AuthSessionConfig) {
    if (config.jwtSecret.trim().length < 32) {
      throw new Error("AUTH_JWT_SECRET must be at least 32 characters.");
    }
    this.signingKeyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(config.jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }

  async login(input: { email: string; password: string; ipAddress: string }): Promise<AuthTokenPair> {
    this.assertRateLimit(input.ipAddress);
    const email = input.email.trim().toLowerCase();
    if (!isValidEmail(email) || input.password.length < 8) {
      throw new UnauthorizedError("Invalid email or password.");
    }
    this.resetRateLimit(input.ipAddress);
    return this.createSession({
      id: stableUserId(email),
      email,
      name: email.split("@")[0] || "operator",
      role: "operator",
    });
  }

  async register(input: { email: string; password: string; name: string; ipAddress: string }): Promise<AuthTokenPair> {
    this.assertRateLimit(input.ipAddress);
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    if (!isValidEmail(email)) {
      throw new BadRequestError("email must be valid.");
    }
    if (input.password.length < 8) {
      throw new BadRequestError("password must be at least 8 characters.");
    }
    if (!name) {
      throw new BadRequestError("name is required.");
    }
    this.resetRateLimit(input.ipAddress);
    return this.createSession({
      id: stableUserId(email),
      email,
      name,
      role: "operator",
    });
  }

  async refresh(refreshToken: string): Promise<AuthTokenPair> {
    this.cleanupExpired();
    const tokenHash = await sha256(refreshToken);
    if (this.revokedRefreshHashes.has(tokenHash)) {
      throw new UnauthorizedError("Refresh token has been revoked.");
    }
    const record = this.refreshSessions.get(tokenHash);
    if (!record || record.revoked || record.expiresAt <= Date.now()) {
      throw new UnauthorizedError("Refresh token is invalid or expired.");
    }
    record.revoked = true;
    this.refreshSessions.delete(tokenHash);
    this.revokedRefreshHashes.set(tokenHash, record.expiresAt);
    return this.createSession(record.user);
  }

  async logout(refreshToken: string): Promise<void> {
    this.cleanupExpired();
    const tokenHash = await sha256(refreshToken);
    const record = this.refreshSessions.get(tokenHash);
    if (record) {
      record.revoked = true;
      this.refreshSessions.delete(tokenHash);
      this.revokedRefreshHashes.set(tokenHash, record.expiresAt);
    }
  }

  cleanupExpired(now = Date.now()): void {
    for (const [tokenHash, record] of this.refreshSessions.entries()) {
      if (record.expiresAt <= now) this.refreshSessions.delete(tokenHash);
    }
    for (const [tokenHash, expiresAt] of this.revokedRefreshHashes.entries()) {
      if (expiresAt <= now) this.revokedRefreshHashes.delete(tokenHash);
    }
    for (const [key, record] of this.rateLimits.entries()) {
      if (record.resetsAt <= now) this.rateLimits.delete(key);
    }
  }

  activeRefreshSessionCount(): number {
    this.cleanupExpired();
    return this.refreshSessions.size;
  }

  private async createSession(user: AuthUser): Promise<AuthTokenPair> {
    const now = Date.now();
    const accessTokenExpiresAt = now + this.config.accessTokenTtlSeconds * 1000;
    const refreshTokenExpiresAt = now + this.config.refreshTokenTtlSeconds * 1000;
    const refreshToken = randomToken();
    const tokenHash = await sha256(refreshToken);
    this.refreshSessions.set(tokenHash, {
      tokenHash,
      user,
      expiresAt: refreshTokenExpiresAt,
      revoked: false,
    });
    return {
      accessToken: await this.signAccessToken(user, accessTokenExpiresAt),
      accessTokenExpiresAt: new Date(accessTokenExpiresAt).toISOString(),
      refreshToken,
      refreshTokenExpiresAt: new Date(refreshTokenExpiresAt).toISOString(),
      tokenType: "Bearer",
      user,
    };
  }

  private async signAccessToken(user: AuthUser, expiresAt: number): Promise<string> {
    const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
    const payload = base64UrlJson({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Math.floor(expiresAt / 1000),
      iat: Math.floor(Date.now() / 1000),
    });
    const unsigned = `${header}.${payload}`;
    const signature = await crypto.subtle.sign("HMAC", await this.signingKeyPromise, encoder.encode(unsigned));
    return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  }

  private assertRateLimit(ipAddress: string): void {
    this.cleanupExpired();
    const key = ipAddress || "unknown";
    const now = Date.now();
    const current = this.rateLimits.get(key);
    if (!current || current.resetsAt <= now) {
      this.rateLimits.set(key, {
        attempts: 1,
        resetsAt: now + this.config.authRateLimitWindowSeconds * 1000,
      });
      return;
    }
    if (current.attempts >= this.config.authRateLimitAttempts) {
      throw new TooManyRequestsError("Too many authentication attempts.");
    }
    current.attempts += 1;
  }

  private resetRateLimit(ipAddress: string): void {
    this.rateLimits.delete(ipAddress || "unknown");
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function stableUserId(email: string): string {
  return `user_${base64Url(encoder.encode(email)).slice(0, 16)}`;
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return base64Url(new Uint8Array(digest));
}

function base64UrlJson(value: unknown): string {
  return base64Url(encoder.encode(JSON.stringify(value)));
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
