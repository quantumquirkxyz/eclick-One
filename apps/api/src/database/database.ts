import {
  AzureSqlClient,
  MockCommerceRepository,
  SqlCommerceRepository,
  azureSqlConfigFromEnv,
} from "@eclick-one/db";
import type { CommerceRepositories } from "@eclick-one/domain";
import type { Environment } from "@eclick-one/shared";

export type RepositoryMode = "mock" | "sql";

export interface DatabaseContext {
  repositories: CommerceRepositories;
  mode: RepositoryMode;
  ping(): Promise<void>;
  close(): Promise<void>;
}

export function createDatabase(env: Environment): DatabaseContext {
  const rawMode = env.REPOSITORY_MODE?.trim().toLowerCase() || "mock";
  if (rawMode !== "mock" && rawMode !== "sql") {
    throw new Error("REPOSITORY_MODE must be either mock or sql.");
  }

  if (rawMode === "mock") {
    return {
      repositories: new MockCommerceRepository(),
      mode: "mock",
      async ping() {},
      async close() {},
    };
  }

  const client = new AzureSqlClient(azureSqlConfigFromEnv(env));
  return {
    repositories: new SqlCommerceRepository(client),
    mode: "sql",
    ping: () => client.ping(),
    close: () => client.close(),
  };
}
