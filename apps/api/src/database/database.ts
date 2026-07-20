import {
  type DbResilienceMetrics,
  MockCommerceRepository,
  MockUserRepository,
  TursoClient,
  TursoCommerceRepository,
  tursoConfigFromEnv,
} from "@eclick-one/db";
import type { CommerceRepositories, UserRepository } from "@eclick-one/domain";
import type { Environment } from "@eclick-one/shared";

export type RepositoryMode = "mock" | "turso";

export interface DatabaseContext {
  repositories: CommerceRepositories;
  userRepository: UserRepository;
  mode: RepositoryMode;
  ping(): Promise<void>;
  close(): Promise<void>;
  metrics(): DbResilienceMetrics | null;
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
    userRepository: new MockUserRepository(),
    mode: "mock",
    async ping() {},
    async close() {},
    metrics: () => null,
  };
}

function createTursoDatabase(env: Environment): DatabaseContext {
  const client = new TursoClient(tursoConfigFromEnv(env));
  return {
    repositories: new TursoCommerceRepository(client),
    userRepository: {
      findByEmail: async () => null,
      findById: async () => null,
      createUser: async () => { throw new Error("User repository not implemented for Turso."); },
      saveRefreshToken: async () => { throw new Error("User repository not implemented for Turso."); },
      findRefreshToken: async () => null,
      revokeRefreshToken: async () => {},
    },
    mode: "turso",
    ping: () => client.ping(),
    close: () => client.close(),
    metrics: () => client.metrics(),
  };
}
