import { describe, expect, test } from "bun:test";
import { azureSqlConfigFromEnv } from "./azure-sql-client";

describe("azureSqlConfigFromEnv", () => {
  const baseEnv = {
    AZURE_SQL_SERVER: "eclick-server1.database.windows.net",
    AZURE_SQL_DATABASE: "bd_eclick",
    AZURE_SQL_USER: "app_eclick",
    AZURE_SQL_PASSWORD: "test-only-secret",
  };

  test("uses encrypted Azure SQL defaults and MVP resilience settings", () => {
    const config = azureSqlConfigFromEnv(baseEnv);

    expect(config.server).toBe(baseEnv.AZURE_SQL_SERVER);
    expect(config.port).toBe(1433);
    expect(config.database).toBe(baseEnv.AZURE_SQL_DATABASE);
    expect(config.options?.encrypt).toBe(true);
    expect(config.options?.trustServerCertificate).toBe(false);
    expect(config.connectionTimeout).toBe(5_000);
    expect(config.requestTimeout).toBe(10_000);
    expect(config.pool?.min).toBe(2);
    expect(config.pool?.max).toBe(10);
    expect(config.resilience.circuitBreakerFailures).toBe(5);
    expect(config.resilience.circuitBreakerResetMs).toBe(30_000);
  });

  test("accepts explicit timeout and pool settings", () => {
    const config = azureSqlConfigFromEnv({
      ...baseEnv,
      AZURE_SQL_CONNECTION_TIMEOUT_MS: "30000",
      AZURE_SQL_QUERY_TIMEOUT_MS: "45000",
      AZURE_SQL_POOL_MAX: "5",
      AZURE_SQL_POOL_MIN: "1",
    });

    expect(config.connectionTimeout).toBe(30_000);
    expect(config.requestTimeout).toBe(45_000);
    expect(config.pool?.max).toBe(5);
    expect(config.pool?.min).toBe(1);
  });

  test("rejects unsafe transport and timeout configuration", () => {
    expect(() => azureSqlConfigFromEnv({ ...baseEnv, AZURE_SQL_ENCRYPT: "false" })).toThrow(
      "AZURE_SQL_ENCRYPT",
    );
    expect(() => azureSqlConfigFromEnv({ ...baseEnv, AZURE_SQL_CONNECTION_TIMEOUT_MS: "499" })).toThrow(
      "AZURE_SQL_CONNECTION_TIMEOUT_MS",
    );
  });
});
