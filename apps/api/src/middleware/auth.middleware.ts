import { AppError } from "../errors/app-error";
import { verifyToken, type AuthConfig } from "@eclick-one/shared";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
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
      request.user = { id: Number(payload.sub), email: payload.email };
    } catch {
      throw new AppError("Invalid or expired token.", 401, "UNAUTHORIZED");
    }
    return undefined;
  };
}
