import { describe, expect, test } from "bun:test";
import { createAuthConfig } from "@eclick-one/shared";
import { createApiApplication } from "../../app";

const auth = createAuthConfig({ JWT_SECRET: "test-secret-that-must-be-at-least-32-characters-long!!" });

function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "mock" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null, auth },
  );
}

describe("docs routes", () => {
  const app = createApp();

  test("serves the OpenAPI spec", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/openapi.yaml"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/yaml");
    expect(await response.text()).toContain("openapi: 3.1.0");
  });

  test("serves the documentation UI", async () => {
    const response = await app.fetch(new Request("http://localhost/docs"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const body = await response.text();
    expect(body).toContain("redoc");
    expect(body).toContain("/api/v1/openapi.yaml");
  });

  test("redirects /api/v1/docs to /docs", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/docs"));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/docs");
  });
});
