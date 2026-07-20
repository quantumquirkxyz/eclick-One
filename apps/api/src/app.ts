import type { Environment } from "@eclick-one/shared";
import { AuthController } from "./controllers/auth-controller";
import { CommerceController } from "./controllers/commerce-controller";
import { HealthController } from "./controllers/health-controller";
import { createDatabase, type DatabaseContext } from "./database/database";
import { withCors } from "./http/cors";
import { authMiddleware, requireRole } from "./middleware/auth.middleware";
import { createRouter } from "./routes";
import { AuthService } from "./services/auth-service";
import { CommerceService } from "./services/commerce-service";
import { HealthService } from "./services/health-service";
import { OnChainClient } from "./onchain/OnChainClient";
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
    requireRole("admin", "operator", "viewer", "agent"),
    requireRole("admin", "operator"),
    requireRole("admin"),
  );
  return {
    fetch: withCors((request) => router.handle(request), config.corsOrigins),
    database,
  };
}
