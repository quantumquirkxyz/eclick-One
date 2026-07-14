import type { Environment } from "@eclick-one/shared";
import { CommerceController } from "./controllers/commerce-controller";
import { HealthController } from "./controllers/health-controller";
import { createDatabase, type DatabaseContext } from "./database/database";
import { withCors } from "./http/cors";
import { createRouter } from "./routes";
import { CommerceService } from "./services/commerce-service";
import { HealthService } from "./services/health-service";

export interface ApiApplication {
  fetch(request: Request): Promise<Response>;
  database: DatabaseContext;
}

export function createApiApplication(
  env: Environment,
  allowedOrigins: readonly string[],
  database = createDatabase(env),
): ApiApplication {
  const commerce = new CommerceService(database.repositories, database.mode === "mock");
  const router = createRouter(
    new HealthController(new HealthService(database)),
    new CommerceController(commerce),
  );
  return {
    fetch: withCors((request) => router.handle(request), allowedOrigins),
    database,
  };
}
