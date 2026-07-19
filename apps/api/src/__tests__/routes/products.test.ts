import { describe, expect, test } from "bun:test";
import { createApiApplication } from "../../app";

function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "mock" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null },
  );
}

describe("products routes", () => {
  const app = createApp();

  test("returns all products", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/products"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test("returns products with expected fields", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/products"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body[0]).toMatchObject({
      codigo_producto: expect.any(Number),
      nombre: expect.any(String),
      categoria: expect.any(String),
    });
  });
});
