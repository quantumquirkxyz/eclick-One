import { AppError } from "../errors/app-error";
import { verifyToken, type AuthConfig, type Role } from "@eclick-one/shared";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: Role;
  };
}

export function authMiddleware(config: AuthConfig) {
  return async (request: AuthenticatedRequest): Promise<Response | undefined> => {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) {
      throw new AppError("Missing or invalid authorization token.", 401, "UNAUTHORIZED");
    }

    const token = header.slice("Bearer ".length).trim();
    try {
      const payload = await verifyToken(token, config);
      request.user = { id: Number(payload.sub), email: payload.email, role: payload.role as Role };
    } catch {
      throw new AppError("Invalid or expired token.", 401, "UNAUTHORIZED");
    }
    return undefined;
  };
}

export function requireRole(...roles: Role[]) {
  return async (request: AuthenticatedRequest): Promise<Response | undefined> => {
    if (!request.user) {
      throw new AppError("Authentication required.", 401, "UNAUTHORIZED");
    }
    if (!roles.includes(request.user.role)) {
      throw new AppError("Insufficient permissions. Required one of: " + roles.join(", "), 403, "FORBIDDEN");
    }
    return undefined;
  };
}
