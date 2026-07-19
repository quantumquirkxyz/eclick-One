import { describe, expect, test } from "bun:test";
import { createApiApplication } from "../../app";

function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "mock" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null },
  );
}

describe("client preference routes", () => {
  const app = createApp();

  test("returns preference for existing client", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers/1/preference"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ codigo_producto: expect.any(Number) });
  });

  test("returns 404 for non-existent client preference", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers/99999/preference"),
    );
    expect(response.status).toBe(404);
  });

  test("returns 400 for non-integer client code", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers/abc/preference"),
    );
    expect(response.status).toBe(400);
  });
});
