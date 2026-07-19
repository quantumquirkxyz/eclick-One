import { AppError } from "../errors/app-error";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "operator" | "viewer" | "agent";
}

export interface SessionConfig {
  jwtSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  rateLimitWindowSeconds: number;
  rateLimitMaxAttempts: number;
  secureCookies: boolean;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  csrfToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: SessionUser;
}

interface RefreshSession {
  user: SessionUser;
  expiresAtMs: number;
}

interface JwtPayload extends SessionUser {
  jti: string;
  exp: number;
}

const DEMO_USER: SessionUser = {
  id: "demo-operator",
  email: "operator@eclick.one",
  name: "Demo Operator",
  role: "operator",
};

export class RateLimitError extends AppError {
  constructor() {
    super("Too many authentication attempts.", 429, "RATE_LIMITED");
    this.name = "RateLimitError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication failed.") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class SessionService {
  private readonly refreshSessions = new Map<string, RefreshSession>();
  private readonly revokedAccessTokenIds = new Set<string>();
  private readonly rateLimitBuckets = new Map<string, number[]>();

  constructor(private readonly config: SessionConfig) {}

  async login(email: string, password: string, rateLimitKey: string): Promise<AuthTokens> {
    this.assertWithinRateLimit(rateLimitKey);
    if (email.trim().toLowerCase() !== DEMO_USER.email || password !== "password") {
      throw new UnauthorizedError();
    }
    return this.createTokenPair(DEMO_USER);
  }

  async refresh(refreshToken: string | null, csrfCookie: string | null, csrfHeader: string | null, rateLimitKey: string): Promise<AuthTokens> {
    this.assertWithinRateLimit(rateLimitKey);
    if (!refreshToken || !csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new UnauthorizedError("Refresh session is invalid.");
    }

    this.cleanupExpiredSessions();
    const tokenHash = await sha256Base64Url(refreshToken);
    const session = this.refreshSessions.get(tokenHash);
    if (!session || session.expiresAtMs <= Date.now()) {
      this.refreshSessions.delete(tokenHash);
      throw new UnauthorizedError("Refresh session is invalid.");
    }

    // Refresh tokens are single-use. Rotating them prevents replay if one leaks.
    this.refreshSessions.delete(tokenHash);
    return this.createTokenPair(session.user);
  }

  async logout(refreshToken: string | null, accessToken: string | null): Promise<void> {
    if (refreshToken) {
      this.refreshSessions.delete(await sha256Base64Url(refreshToken));
    }
    if (accessToken) {
      const payload = decodeJwtPayload(accessToken);
      if (payload?.jti) this.revokedAccessTokenIds.add(payload.jti);
    }
    this.cleanupExpiredSessions();
  }

  async verifyAccessToken(accessToken: string): Promise<SessionUser> {
    const payload = await verifyJwt(accessToken, this.config.jwtSecret);
    if (this.revokedAccessTokenIds.has(payload.jti)) {
      throw new UnauthorizedError("Access token has been revoked.");
    }
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  }

  cleanupExpiredSessions(nowMs = Date.now()): void {
    for (const [tokenHash, session] of this.refreshSessions.entries()) {
      if (session.expiresAtMs <= nowMs) this.refreshSessions.delete(tokenHash);
    }
  }

  private async createTokenPair(user: SessionUser): Promise<AuthTokens> {
    const nowMs = Date.now();
    const accessTokenExpiresAtMs = nowMs + this.config.accessTokenTtlSeconds * 1000;
    const refreshTokenExpiresAtMs = nowMs + this.config.refreshTokenTtlSeconds * 1000;
    const refreshToken = randomBase64Url(48);
    const csrfToken = randomBase64Url(24);
    const accessToken = await signJwt(
      {
        ...user,
        jti: crypto.randomUUID(),
        exp: Math.floor(accessTokenExpiresAtMs / 1000),
      },
      this.config.jwtSecret,
    );

    this.refreshSessions.set(await sha256Base64Url(refreshToken), {
      user,
      expiresAtMs: refreshTokenExpiresAtMs,
    });
    this.cleanupExpiredSessions(nowMs);

    return {
      accessToken,
      accessTokenExpiresAt: new Date(accessTokenExpiresAtMs).toISOString(),
      csrfToken,
      refreshToken,
      refreshTokenExpiresAt: new Date(refreshTokenExpiresAtMs).toISOString(),
      user,
    };
  }

  private assertWithinRateLimit(key: string): void {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindowSeconds * 1000;
    const attempts = (this.rateLimitBuckets.get(key) ?? []).filter((attempt) => attempt > windowStart);
    if (attempts.length >= this.config.rateLimitMaxAttempts) {
      this.rateLimitBuckets.set(key, attempts);
      throw new RateLimitError();
    }
    attempts.push(now);
    this.rateLimitBuckets.set(key, attempts);
  }
}

export function createRefreshCookie(tokens: AuthTokens, config: SessionConfig): string {
  return cookieHeader("eclick_refresh", tokens.refreshToken, {
    httpOnly: true,
    secure: config.secureCookies,
    maxAgeSeconds: config.refreshTokenTtlSeconds,
    sameSite: "Strict",
    path: "/api/v1/auth",
  });
}

export function createCsrfCookie(tokens: AuthTokens, config: SessionConfig): string {
  return cookieHeader("eclick_csrf", tokens.csrfToken, {
    httpOnly: false,
    secure: config.secureCookies,
    maxAgeSeconds: config.refreshTokenTtlSeconds,
    sameSite: "Strict",
    path: "/",
  });
}

export function clearSessionCookies(config: SessionConfig): string[] {
  return [
    cookieHeader("eclick_refresh", "", { httpOnly: true, secure: config.secureCookies, maxAgeSeconds: 0, sameSite: "Strict", path: "/api/v1/auth" }),
    cookieHeader("eclick_csrf", "", { httpOnly: false, secure: config.secureCookies, maxAgeSeconds: 0, sameSite: "Strict", path: "/" }),
  ];
}

export function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) return rawValue.join("=") || null;
  }
  return null;
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
}

function cookieHeader(name: string, value: string, options: { httpOnly: boolean; secure: boolean; maxAgeSeconds: number; sameSite: "Strict"; path: string }): string {
  const parts = [`${name}=${value}`, `Max-Age=${options.maxAgeSeconds}`, `Path=${options.path}`, `SameSite=${options.sameSite}`];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmacSha256(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
}

async function verifyJwt(token: string, secret: string): Promise<JwtPayload> {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) throw new UnauthorizedError();
  const expected = await hmacSha256(`${header}.${body}`, secret);
  if (signature !== expected) throw new UnauthorizedError();
  const payload = decodeJwtPayload(token);
  if (!payload || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedError();
  }
  return payload;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const body = token.split(".")[1];
  if (!body) return null;
  try {
    return JSON.parse(base64UrlDecode(body)) as JwtPayload;
  } catch {
    return null;
  }
}

async function hmacSha256(input: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return base64UrlFromBytes(new Uint8Array(signature));
}

async function sha256Base64Url(input: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return base64UrlFromBytes(new Uint8Array(hash));
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlFromBytes(bytes);
}

function base64UrlEncode(input: string): string {
  return base64UrlFromBytes(new TextEncoder().encode(input));
}

function base64UrlDecode(input: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(toBase64(input)), (char) => char.charCodeAt(0)));
}

function base64UrlFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function toBase64(input: string): string {
  const padded = input.replaceAll("-", "+").replaceAll("_", "/");
  return padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "=");
}
