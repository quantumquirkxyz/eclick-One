import { describe, expect, test } from "bun:test";
import { createApiApplication } from "./app";

const app = createApiApplication({ REPOSITORY_MODE: "mock" }, ["http://localhost:5173"]);

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
});
