import type { Environment } from "@eclick-one/shared";
import { AuthController } from "./controllers/auth-controller";
import { CommerceController } from "./controllers/commerce-controller";
import { HealthController } from "./controllers/health-controller";
import { createDatabase, type DatabaseContext } from "./database/database";
import { authMiddleware } from "./middleware/auth.middleware";
import { AuthService } from "./services/auth-service";
import { CommerceService } from "./services/commerce-service";
import { HealthService } from "./services/health-service";
import { OnChainClient } from "./onchain/OnChainClient";
import { createRouter } from "./routes";
import type { ApiConfig } from "./config";

export interface ApiApplication {
  fetch(request: Request): Promise<Response>;
  database: DatabaseContext;
}

export function createApiApplication(
  env: Environment,
  config: ApiConfig,
  database = createDatabase(env),
): ApiApplication {
  const onchain = config.onchain ? new OnChainClient(config.onchain) : null;
  const commerce = new CommerceService(database.repositories, database.mode === "mock", onchain);
  const auth = new AuthService(database.userRepository, config.auth);
  const authMiddlewareFn = authMiddleware(config.auth);

  const router = createRouter(
    new HealthController(new HealthService(database)),
    new CommerceController(commerce),
    new AuthController(auth),
    authMiddlewareFn,
  );
  return {
    fetch: withCors((request) => router.handle(request), config.corsOrigins),
    database,
  };
}

function withCors(handler: (request: Request) => Promise<Response>, origins: readonly string[]): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request.headers.get("origin") ?? "*", origins),
      });
    }
    const response = await handler(request);
    const origin = request.headers.get("origin");
    if (origin) {
      const headers = new Headers(response.headers);
      corsHeaders(origin, origins).forEach((value, key) => headers.set(key, value));
      return new Response(response.body, { status: response.status, headers });
    }
    return response;
  };
}

function corsHeaders(origin: string, origins: readonly string[]): Headers {
  const headers = new Headers();
  const allowed = origins.length === 0 || origins.includes("*") || origins.includes(origin);
  if (allowed) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-credentials", "true");
    headers.set("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    headers.set("access-control-allow-headers", "content-type, authorization");
  }
  return headers;
}
