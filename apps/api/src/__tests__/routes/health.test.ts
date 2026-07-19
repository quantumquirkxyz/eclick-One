import { describe, expect, test } from "bun:test";
import { createApiApplication } from "../../app";

function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "mock" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null },
  );
}

describe("health routes", () => {
  const app = createApp();

  test("returns 200 on shallow health check", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: "ok" });
  });

  test("returns 200 on deep health check", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/health?deep=true"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: "ok" });
  });

  test("returns shallow health without query params", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.repositoryMode).toBe("mock");
  });

  test("returns uptime as a number", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(typeof body.uptime).toBe("number");
  });
});
