import { BadRequestError } from "../errors/app-error";
import type { SessionConfig } from "../services/session-service";
import {
  bearerToken,
  clearSessionCookies,
  createCsrfCookie,
  createRefreshCookie,
  readCookie,
  type AuthTokens,
  type SessionService,
} from "../services/session-service";
import type { Controller, ControllerResult } from "./controller";

interface LoginRequestBody {
  email?: unknown;
  password?: unknown;
}

export class AuthController {
  constructor(
    private readonly sessions: SessionService,
    private readonly config: SessionConfig,
  ) {}

  login: Controller = async (request): Promise<ControllerResult> => {
    const body = await readLoginBody(request);
    const tokens = await this.sessions.login(body.email, body.password, clientKey(request, "login"));
    return tokenResponse(tokens, this.config);
  };

  refresh: Controller = async (request): Promise<ControllerResult> => {
    const tokens = await this.sessions.refresh(
      readCookie(request, "eclick_refresh"),
      readCookie(request, "eclick_csrf"),
      request.headers.get("x-csrf-token"),
      clientKey(request, "refresh"),
    );
    return tokenResponse(tokens, this.config);
  };

  logout: Controller = async (request): Promise<ControllerResult> => {
    await this.sessions.logout(readCookie(request, "eclick_refresh"), bearerToken(request));
    return {
      status: 204,
      body: null,
      headers: clearSessionCookies(this.config).map((value) => ["Set-Cookie", value]),
    };
  };
}

async function readLoginBody(request: Request): Promise<{ email: string; password: string }> {
  let body: LoginRequestBody;
  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    throw new BadRequestError("Request body must be valid JSON.");
  }
  if (!body || typeof body !== "object" || typeof body.email !== "string" || typeof body.password !== "string") {
    throw new BadRequestError("email and password are required.");
  }
  return { email: body.email.trim(), password: body.password };
}

function tokenResponse(tokens: AuthTokens, config: SessionConfig): ControllerResult {
  return {
    body: {
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      csrfToken: tokens.csrfToken,
      user: tokens.user,
    },
    headers: [
      ["Set-Cookie", createRefreshCookie(tokens, config)],
      ["Set-Cookie", createCsrfCookie(tokens, config)],
    ],
  };
}

function clientKey(request: Request, action: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwardedFor || request.headers.get("x-real-ip") || "local";
  return `${action}:${address}`;
}
