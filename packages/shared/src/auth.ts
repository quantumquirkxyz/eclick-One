import { SignJWT, jwtVerify } from "jose";

export type Role = "admin" | "operator" | "viewer" | "agent";

export interface JwtPayload {
  sub: string;
  email: string;
  type: "access" | "refresh";
  role: Role;
  [key: string]: unknown;
}

export interface AuthConfig {
  jwtSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function createAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  const secret = env.JWT_SECRET?.trim();
  if (!secret) throw new Error("Missing required environment variable: JWT_SECRET");
  const accessTtl = Number(env.JWT_ACCESS_TTL ?? "900");
  const refreshTtl = Number(env.JWT_REFRESH_TTL ?? "604800");
  return {
    jwtSecret: secret,
    accessTokenTtlSeconds: Number.isFinite(accessTtl) && accessTtl > 0 ? accessTtl : 900,
    refreshTokenTtlSeconds: Number.isFinite(refreshTtl) && refreshTtl > 0 ? refreshTtl : 604800,
  };
}

export async function signAccessToken(payload: JwtPayload, config: AuthConfig): Promise<string> {
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + config.accessTokenTtlSeconds);
  return jwt.sign(new TextEncoder().encode(config.jwtSecret));
}

export async function signRefreshToken(payload: JwtPayload, config: AuthConfig): Promise<string> {
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + config.refreshTokenTtlSeconds);
  return jwt.sign(new TextEncoder().encode(config.jwtSecret));
}

export async function verifyToken(token: string, config: AuthConfig): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(config.jwtSecret));
  return payload as unknown as JwtPayload;
}

export async function issueTokens(userId: number, email: string, role: Role, config: AuthConfig): Promise<TokenPair> {
  const payload = { sub: String(userId), email, role, jti: crypto.randomUUID() };
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ ...payload, type: "access" }, config),
    signRefreshToken({ ...payload, type: "refresh" }, config),
  ]);
  return { accessToken, refreshToken, expiresIn: config.accessTokenTtlSeconds };
}
