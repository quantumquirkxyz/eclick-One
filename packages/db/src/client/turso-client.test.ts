import { describe, expect, test } from "bun:test";
import { tursoConfigFromEnv } from "./turso-client";

describe("tursoConfigFromEnv", () => {
  test("accepts a local file database without auth token", () => {
    expect(
      tursoConfigFromEnv({
        TURSO_DATABASE_URL: "file:local.db",
      }),
    ).toEqual({ url: "file:local.db" });
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
    ).toEqual({ url: "libsql://example.turso.io", authToken: "secret" });
  });
});
