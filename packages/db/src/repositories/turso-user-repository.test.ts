import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { TursoClient } from "../client/turso-client";
import { loadMigrationFiles, migrateUp } from "../migrations/runner";
import { TursoUserRepository } from "./turso-user-repository";

const migrationsDir = new URL("../../migrations", import.meta.url).pathname;

let client: TursoClient;
let repository: TursoUserRepository;

beforeEach(async () => {
  client = new TursoClient({
    url: ":memory:",
    resilience: {
      poolMin: 1,
      poolMax: 2,
      connectionTimeoutMs: 1_000,
      queryTimeoutMs: 2_000,
      retryDelaysMs: [10],
      jitterRatio: 0,
      circuitBreakerFailures: 2,
      circuitBreakerResetMs: 50,
    },
  });
  await migrateUp(client.connection, await loadMigrationFiles(migrationsDir), { includeSeeds: true });
  repository = new TursoUserRepository(client);
});

afterEach(async () => {
  await client.close();
});

describe("TursoUserRepository", () => {
  test("creates users and loads them by email and id", async () => {
    const user = await repository.createUser({
      email: "Ana@example.com",
      nombre: "Ana",
      apellido: "Morales",
      password: "hashed-password",
      role: "admin",
    });

    expect(user).toMatchObject({
      email: "ana@example.com",
      nombre: "Ana",
      apellido: "Morales",
      passwordHash: "hashed-password",
      role: "admin",
      activo: true,
    });

    expect(await repository.findByEmail("ana@example.com")).toMatchObject({ id: user.id });
    expect(await repository.findById(user.id)).toMatchObject({ email: "ana@example.com" });
  });

  test("stores and revokes refresh tokens", async () => {
    const user = await repository.createUser({
      email: "viewer@example.com",
      nombre: "View",
      apellido: "Only",
      password: "hashed-password",
      role: "viewer",
    });

    const record = await repository.saveRefreshToken(user.id, "token-hash", "2030-01-01T00:00:00.000Z");
    expect(record).toMatchObject({
      userId: user.id,
      tokenHash: "token-hash",
      revoked: false,
    });

    await repository.revokeRefreshToken("token-hash");
    expect(await repository.findRefreshToken("token-hash")).toMatchObject({ revoked: true });
  });
});
