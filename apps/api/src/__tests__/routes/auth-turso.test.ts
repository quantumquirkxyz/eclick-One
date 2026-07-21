import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  loadMigrationFiles,
  migrateUp,
  TursoClient,
  TursoCommerceRepository,
  TursoUserRepository,
} from "@eclick-one/db";
import { createAuthConfig } from "@eclick-one/shared";
import { createApiApplication } from "../../app";
import type { DatabaseContext } from "../../database/database";

const auth = createAuthConfig({ JWT_SECRET: "test-secret-that-must-be-at-least-32-characters-long!!" });
const migrationsDir = new URL("../../../../../packages/db/migrations", import.meta.url).pathname;

let client: TursoClient;
let database: DatabaseContext;

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
  database = {
    repositories: new TursoCommerceRepository(client),
    userRepository: new TursoUserRepository(client),
    mode: "turso",
    ping: () => client.ping(),
    close: () => client.close(),
    metrics: () => client.metrics(),
  };
});

afterEach(async () => {
  await database.close();
});

function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "turso", TURSO_DATABASE_URL: ":memory:" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null, auth },
    database,
  );
}

describe("auth routes with turso repositories", () => {
  test("registers, verifies, refreshes, and logs out a user", async () => {
    const app = createApp();

    const registerResponse = await app.fetch(new Request("http://localhost/api/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "operator@example.com",
        nombre: "Ana",
        apellido: "Morales",
        password: "secure-password-123",
      }),
    }));
    expect(registerResponse.status).toBe(201);
    const registered = await registerResponse.json();
    const registeredTokens = {
      accessToken: String((registered as Record<string, unknown>).accessToken),
      refreshToken: String((registered as Record<string, unknown>).refreshToken),
      expiresIn: Number((registered as Record<string, unknown>).expiresIn),
    };
    expect(registered).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      expiresIn: 900,
    });

    const loginResponse = await app.fetch(new Request("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "operator@example.com",
        password: "secure-password-123",
      }),
    }));
    expect(loginResponse.status).toBe(200);
    expect(await loginResponse.json()).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });

    const refreshResponse = await app.fetch(new Request("http://localhost/api/v1/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: registeredTokens.refreshToken }),
    }));
    expect(refreshResponse.status).toBe(200);
    const refreshed = await refreshResponse.json();
    const refreshedTokens = {
      accessToken: String((refreshed as Record<string, unknown>).accessToken),
      refreshToken: String((refreshed as Record<string, unknown>).refreshToken),
      expiresIn: Number((refreshed as Record<string, unknown>).expiresIn),
    };
    expect(refreshedTokens.refreshToken).toEqual(expect.any(String));
    expect(refreshedTokens.refreshToken).not.toBe(registeredTokens.refreshToken);

    const logoutResponse = await app.fetch(new Request("http://localhost/api/v1/auth/logout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshedTokens.refreshToken }),
    }));
    expect(logoutResponse.status).toBe(204);

    const revokedResponse = await app.fetch(new Request("http://localhost/api/v1/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshedTokens.refreshToken }),
    }));
    expect(revokedResponse.status).toBe(401);
    expect(await revokedResponse.json()).toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });

  test("answers deep health checks against turso", async () => {
    const app = createApp();
    const response = await app.fetch(new Request("http://localhost/api/v1/health?deep=true"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ok",
      repositoryMode: "turso",
    });
  });
});
