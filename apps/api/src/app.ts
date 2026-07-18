import type { Environment } from "@eclick-one/shared";
import { CommerceController } from "./controllers/commerce-controller";
import { HealthController } from "./controllers/health-controller";
import { createDatabase, type DatabaseContext } from "./database/database";
import { withCors } from "./http/cors";
import { createRouter } from "./routes";
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
  const router = createRouter(
    new HealthController(new HealthService(database)),
    new CommerceController(commerce),
  );
  return {
    fetch: withCors((request) => router.handle(request), config.corsOrigins),
    database,
  };
}
