import { BadRequestError } from "../errors/app-error";
import type { AuthSessionService } from "../services/auth-session-service";
import type { ControllerResult } from "./controller";

export class AuthController {
  constructor(private readonly sessions: AuthSessionService) {}

  login = async (request: Request): Promise<ControllerResult> => {
    const body = await readJsonObject<{ email?: unknown; password?: unknown }>(request);
    assertString(body.email, "email");
    assertString(body.password, "password");
    const session = await this.sessions.login({
      email: body.email,
      password: body.password,
      ipAddress: ipAddressFromRequest(request),
    });
    return {
      status: 200,
      body: publicSessionBody(session),
      headers: refreshCookieHeader(request, session.refreshToken, session.refreshTokenExpiresAt),
    };
  };

  register = async (request: Request): Promise<ControllerResult> => {
    const body = await readJsonObject<{ email?: unknown; password?: unknown; name?: unknown }>(request);
    assertString(body.email, "email");
    assertString(body.password, "password");
    assertString(body.name, "name");
    const session = await this.sessions.register({
      email: body.email,
      password: body.password,
      name: body.name,
      ipAddress: ipAddressFromRequest(request),
    });
    return {
      status: 201,
      body: publicSessionBody(session),
      headers: refreshCookieHeader(request, session.refreshToken, session.refreshTokenExpiresAt),
    };
  };

  refresh = async (request: Request): Promise<ControllerResult> => {
    const refreshToken = await refreshTokenFromRequest(request);
    const session = await this.sessions.refresh(refreshToken);
    return {
      body: publicSessionBody(session),
      headers: refreshCookieHeader(request, session.refreshToken, session.refreshTokenExpiresAt),
    };
  };

  logout = async (request: Request): Promise<ControllerResult> => {
    const refreshToken = await refreshTokenFromRequest(request);
    await this.sessions.logout(refreshToken);
    return { status: 204, body: null, headers: clearRefreshCookieHeader(request) };
  };
}

async function readJsonObject<T>(request: Request): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestError("Request body must be a JSON object.");
  }
  return body as T;
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestError(`${field} must be a non-empty string.`);
  }
}

function ipAddressFromRequest(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "local";
}

async function refreshTokenFromRequest(request: Request): Promise<string> {
  const cookieToken = cookieValue(request, "eclick_refresh_token");
  if (cookieToken) return cookieToken;
  const body = await readJsonObject<{ refreshToken?: unknown }>(request);
  assertString(body.refreshToken, "refreshToken");
  return body.refreshToken;
}

function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rawValue.join("="));
  }
  return null;
}

function publicSessionBody<T extends { refreshToken: string; refreshTokenExpiresAt: string }>(
  session: T,
): Omit<T, "refreshToken"> {
  const { refreshToken: _refreshToken, ...publicSession } = session;
  return publicSession;
}

function refreshCookieHeader(request: Request, refreshToken: string, expiresAt: string): HeadersInit {
  const maxAge = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  return {
    "Set-Cookie": [
      `eclick_refresh_token=${encodeURIComponent(refreshToken)}`,
      "HttpOnly",
      "Path=/api/v1/auth",
      "SameSite=Lax",
      `Max-Age=${maxAge}`,
      isSecureRequest(request) ? "Secure" : "",
    ].filter(Boolean).join("; "),
  };
}

function clearRefreshCookieHeader(request: Request): HeadersInit {
  return {
    "Set-Cookie": [
      "eclick_refresh_token=",
      "HttpOnly",
      "Path=/api/v1/auth",
      "SameSite=Lax",
      "Max-Age=0",
      isSecureRequest(request) ? "Secure" : "",
    ].filter(Boolean).join("; "),
  };
}

function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}
