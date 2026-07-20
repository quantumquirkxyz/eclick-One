import type { AuthTokens, LoginRequest, RegisterRequest, RefreshRequest } from "@eclick-one/domain";
import type { ControllerResult } from "./controller";
import { BadRequestError } from "../errors/app-error";
import type { AuthService } from "../services/auth-service";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (request: Request): Promise<ControllerResult<AuthTokens>> => {
    const body = await readJsonObject<RegisterRequest>(request);
    if (!body.email || !body.nombre || !body.apellido || !body.password) {
      throw new BadRequestError("email, nombre, apellido, and password are required.");
    }
    if (body.password.length < 8) {
      throw new BadRequestError("password must be at least 8 characters.");
    }
    const tokens = await this.service.register(body);
    return { status: 201, body: tokens };
  };

  login = async (request: Request): Promise<ControllerResult<AuthTokens>> => {
    const body = await readJsonObject<LoginRequest>(request);
    if (!body.email || !body.password) {
      throw new BadRequestError("email and password are required.");
    }
    const tokens = await this.service.login(body);
    return { status: 200, body: tokens };
  };

  refresh = async (request: Request): Promise<ControllerResult<AuthTokens>> => {
    const body = await readJsonObject<RefreshRequest>(request);
    if (!body.refreshToken) {
      throw new BadRequestError("refreshToken is required.");
    }
    const tokens = await this.service.refresh(body);
    return { status: 200, body: tokens };
  };

  logout = async (request: Request): Promise<ControllerResult<null>> => {
    const body = await readJsonObject<{ refreshToken: string }>(request);
    if (!body.refreshToken) {
      throw new BadRequestError("refreshToken is required.");
    }
    await this.service.logout(body.refreshToken);
    return { status: 204, body: null };
  };

  verify = async (request: AuthenticatedRequest): Promise<ControllerResult<{ user: { id: number; email: string; nombre: string; apellido: string } }>> => {
    const user = request.user;
    if (!user) throw new BadRequestError("Not authenticated.");
    const fullUser = await this.service.validateUser(user.id);
    if (!fullUser) throw new BadRequestError("User not found.");
    return {
      body: {
        user: { id: fullUser.id, email: fullUser.email, nombre: fullUser.nombre, apellido: fullUser.apellido },
      },
    };
  };
}

async function readJsonObject<T>(request: Request): Promise<T> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > 64_000) {
    throw new BadRequestError("Request body is too large.");
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON.");
  }
  if (!isPlainObject(body)) {
    throw new BadRequestError("Request body must be a JSON object.");
  }
  return body as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
