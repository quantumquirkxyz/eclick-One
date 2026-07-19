import { describe, expect, test } from "bun:test";
import { createApiApplication } from "./app";

const app = createApiApplication(
  { REPOSITORY_MODE: "mock" },
  {
    host: "0.0.0.0",
    port: 3000,
    corsOrigins: ["http://localhost:5173"],
    onchain: null,
    auth: {
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604_800,
      authRateLimitAttempts: 5,
      authRateLimitWindowSeconds: 60,
      jwtSecret: "test-auth-secret-with-at-least-thirty-two-characters",
    },
  },
);

describe("API application", () => {
  test("returns a shallow health check", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", repositoryMode: "mock", uptime: expect.any(Number) });
  });

  test("marks dashboard data as synthetic", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/dashboard"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ synthetic: true });
  });

  test("returns a structured 404", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/missing"));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  test("rejects non-object JSON bodies", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "\"oops\"",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "BAD_REQUEST" } });
  });

  test("rejects oversized JSON bodies before parsing", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "70001",
        },
        body: JSON.stringify({ nombre: "A" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "BAD_REQUEST" } });
  });

  test("rotates refresh tokens and rejects reuse", async () => {
    const login = await app.fetch(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "operator@example.com", password: "password123" }),
      }),
    );
    expect(login.status).toBe(200);
    const first = await login.json() as { refreshToken?: string };
    expect(first.refreshToken).toBeUndefined();
    const firstCookie = login.headers.get("set-cookie");
    expect(firstCookie).toContain("HttpOnly");

    const refresh = await app.fetch(
      new Request("http://localhost/api/v1/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: cookiePair(firstCookie) },
        body: JSON.stringify({}),
      }),
    );
    expect(refresh.status).toBe(200);
    const second = await refresh.json() as { refreshToken?: string };
    expect(second.refreshToken).toBeUndefined();
    const secondCookie = refresh.headers.get("set-cookie");
    expect(secondCookie).toContain("HttpOnly");
    expect(cookiePair(secondCookie)).not.toBe(cookiePair(firstCookie));

    const replay = await app.fetch(
      new Request("http://localhost/api/v1/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: cookiePair(firstCookie) },
        body: JSON.stringify({}),
      }),
    );
    expect(replay.status).toBe(401);
    expect(await replay.json()).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  test("logs out by revoking the refresh token", async () => {
    const login = await app.fetch(
      new Request("http://localhost/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "new@example.com", password: "password123", name: "New Operator" }),
      }),
    );
    expect(login.status).toBe(201);
    const session = await login.json() as { refreshToken?: string };
    expect(session.refreshToken).toBeUndefined();
    const cookie = login.headers.get("set-cookie");

    const logout = await app.fetch(
      new Request("http://localhost/api/v1/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: cookiePair(cookie) },
        body: JSON.stringify({}),
      }),
    );
    expect(logout.status).toBe(204);

    const refresh = await app.fetch(
      new Request("http://localhost/api/v1/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: cookiePair(cookie) },
        body: JSON.stringify({}),
      }),
    );
    expect(refresh.status).toBe(401);
  });
});

function cookiePair(setCookie: string | null): string {
  if (!setCookie) throw new Error("Expected Set-Cookie header.");
  return setCookie.split(";")[0]!;
}
