import {
  MockCommerceRepository,
  TursoClient,
  TursoCommerceRepository,
  tursoConfigFromEnv,
} from "@eclick-one/db";
import type { CommerceRepositories } from "@eclick-one/domain";
import type { Environment } from "@eclick-one/shared";

export type RepositoryMode = "mock" | "turso";

export interface DatabaseContext {
  repositories: CommerceRepositories;
  mode: RepositoryMode;
  ping(): Promise<void>;
  close(): Promise<void>;
}

export function createDatabase(env: Environment): DatabaseContext {

  const rawMode = env.REPOSITORY_MODE?.trim().toLowerCase() || "mock";
  if (rawMode !== "mock" && rawMode !== "turso") {
    throw new Error("REPOSITORY_MODE must be either mock or turso.");
  }

  if (rawMode === "mock") {
    return createMockDatabase();
  }

  return createTursoDatabase(env);
}

function createMockDatabase(): DatabaseContext {
  return {
    repositories: new MockCommerceRepository(),
    mode: "mock",
    async ping() {},
    async close() {},
  };
}

function createTursoDatabase(env: Environment): DatabaseContext {
  const client = new TursoClient(tursoConfigFromEnv(env));
  return {
    repositories: new TursoCommerceRepository(client),
    mode: "turso",
    ping: () => client.ping(),
    close: () => client.close(),
  };
}
