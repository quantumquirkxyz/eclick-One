import { describe, expect, test } from "bun:test";
import { TursoClient, tursoConfigFromEnv } from "./turso-client";

describe("tursoConfigFromEnv", () => {
  test("accepts a local file database without auth token", () => {
    expect(
      tursoConfigFromEnv({
        TURSO_DATABASE_URL: "file:local.db",
      }),
    ).toMatchObject({ url: "file:local.db", resilience: { poolMin: 2, poolMax: 10, connectionTimeoutMs: 5_000, queryTimeoutMs: 10_000 } });
  });

  test("requires auth token for remote Turso databases", () => {
    expect(() =>
      tursoConfigFromEnv({
        TURSO_DATABASE_URL: "libsql://example.turso.io",
      }),
    ).toThrow("TURSO_AUTH_TOKEN");
  });

  test("returns remote configuration when both URL and token exist", () => {
    expect(
      tursoConfigFromEnv({
        TURSO_DATABASE_URL: "libsql://example.turso.io",
        TURSO_AUTH_TOKEN: "secret",
      }),
    ).toMatchObject({ url: "libsql://example.turso.io", authToken: "secret" });
  });

  test("accepts explicit resilience configuration", () => {
    expect(
      tursoConfigFromEnv({
        TURSO_DATABASE_URL: "file:local.db",
        TURSO_POOL_MIN: "1",
        TURSO_POOL_MAX: "4",
        TURSO_CONNECTION_TIMEOUT_MS: "2500",
        TURSO_QUERY_TIMEOUT_MS: "9000",
      }),
    ).toMatchObject({ resilience: { poolMin: 1, poolMax: 4, connectionTimeoutMs: 2_500, queryTimeoutMs: 9_000 } });
  });
});

describe("TursoClient", () => {
  test("reports resilience metrics and closes cleanly", async () => {
    const client = new TursoClient(tursoConfigFromEnv({ TURSO_DATABASE_URL: ":memory:" }));
    await client.ping();
    expect(client.metrics()).toMatchObject({ state: "closed", poolMin: 2, poolMax: 10 });
    await client.close();
  });
});
