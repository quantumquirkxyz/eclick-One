import { describe, expect, test } from "bun:test";
import { createApiApplication } from "./app";

function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "mock", JWT_SECRET: "test-secret" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null, auth: { jwtSecret: "test-secret", accessTokenTtlSeconds: 900, refreshTokenTtlSeconds: 604800 } },
  );
}

async function registerAndLogin(app: ReturnType<typeof createApiApplication>): Promise<string> {
  const registerResponse = await app.fetch(
    new Request("http://localhost/api/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", nombre: "Test", apellido: "User", password: "secure-password-123" }),
    }),
  );
  expect(registerResponse.status).toBe(201);
  const registerBody = await registerResponse.json() as { accessToken: string };
  return registerBody.accessToken;
}

describe("API application", () => {
  test("returns a shallow health check", async () => {
    const app = createApp();
    const response = await app.fetch(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", repositoryMode: "mock", uptime: expect.any(Number) });
  });

  test("returns 401 for protected routes without token", async () => {
    const app = createApp();
    const response = await app.fetch(new Request("http://localhost/api/v1/dashboard"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  test("returns dashboard data with valid token", async () => {
    const app = createApp();
    const token = await registerAndLogin(app);
    const response = await app.fetch(
      new Request("http://localhost/api/v1/dashboard", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ synthetic: true });
  });

  test("returns a structured 404", async () => {
    const app = createApp();
    const token = await registerAndLogin(app);
    const response = await app.fetch(
      new Request("http://localhost/api/v1/missing", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  test("rejects non-object JSON bodies", async () => {
    const app = createApp();
    const token = await registerAndLogin(app);
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: "\"oops\"",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "BAD_REQUEST" } });
  });

  test("rejects oversized JSON bodies before parsing", async () => {
    const app = createApp();
    const token = await registerAndLogin(app);
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "70001",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre: "A" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "BAD_REQUEST" } });
  });
});
