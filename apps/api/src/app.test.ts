import { describe, expect, test } from "bun:test";
import { createApiApplication } from "./app";
import type { ApiConfig } from "./config";

const config: ApiConfig = {
  host: "0.0.0.0",
  port: 3000,
  corsOrigins: ["http://localhost:5173"],
  onchain: null,
  session: {
    jwtSecret: "test-secret",
    accessTokenTtlSeconds: 60,
    refreshTokenTtlSeconds: 3600,
    rateLimitWindowSeconds: 60,
    rateLimitMaxAttempts: 5,
    secureCookies: false,
  },
};

function testApp() {
  return createApiApplication({ REPOSITORY_MODE: "mock" }, config);
}

describe("API application", () => {
  test("returns a shallow health check", async () => {
    const app = testApp();
    const response = await app.fetch(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", repositoryMode: "mock", uptime: expect.any(Number) });
  });

  test("marks dashboard data as synthetic", async () => {
    const app = testApp();
    const response = await app.fetch(new Request("http://localhost/api/v1/dashboard"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ synthetic: true });
  });

  test("returns a structured 404", async () => {
    const app = testApp();
    const response = await app.fetch(new Request("http://localhost/api/v1/missing"));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  test("rejects non-object JSON bodies", async () => {
    const app = testApp();
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
    const app = testApp();
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

  test("rotates refresh tokens and rejects replayed refresh cookies", async () => {
    const app = testApp();
    const loginResponse = await app.fetch(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "operator@eclick.one", password: "password" }),
      }),
    );
    expect(loginResponse.status).toBe(200);
    const loginCookies = setCookieHeaders(loginResponse);
    const loginBody = await loginResponse.json();
    const loginCsrfToken = loginBody.csrfToken;
    expect(loginBody).toMatchObject({ accessToken: expect.any(String), csrfToken: expect.any(String) });

    const refreshResponse = await app.fetch(
      new Request("http://localhost/api/v1/auth/refresh", {
        method: "POST",
        headers: {
          cookie: cookieHeader(loginCookies),
          "x-csrf-token": loginCsrfToken,
        },
      }),
    );
    expect(refreshResponse.status).toBe(200);
    const refreshBody = await refreshResponse.json();
    expect(refreshBody).toMatchObject({ accessToken: expect.any(String), csrfToken: expect.any(String) });

    const replayResponse = await app.fetch(
      new Request("http://localhost/api/v1/auth/refresh", {
        method: "POST",
        headers: {
          cookie: cookieHeader(loginCookies),
          "x-csrf-token": loginCsrfToken,
        },
      }),
    );
    expect(replayResponse.status).toBe(401);
    expect(await replayResponse.json()).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  test("rate limits repeated invalid login attempts", async () => {
    const app = testApp();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.fetch(
        new Request("http://localhost/api/v1/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "203.0.113.7",
          },
          body: JSON.stringify({ email: "operator@eclick.one", password: "wrong" }),
        }),
      );
      expect(response.status).toBe(401);
    }

    const limitedResponse = await app.fetch(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.7",
        },
        body: JSON.stringify({ email: "operator@eclick.one", password: "wrong" }),
      }),
    );
    expect(limitedResponse.status).toBe(429);
    expect(await limitedResponse.json()).toMatchObject({ error: { code: "RATE_LIMITED" } });
  });
});

function setCookieHeaders(response: Response): string[] {
  const headers = response.headers.getSetCookie();
  if (headers.length > 0) return headers;
  const combined = response.headers.get("set-cookie");
  return combined ? combined.split(/, (?=eclick_)/) : [];
}

function cookieHeader(headers: string[]): string {
  return headers.map((cookie) => cookie.split(";")[0]).join("; ");
}
