import { beforeAll, describe, expect, test } from "bun:test";
import { createAuthConfig, signAccessToken } from "@eclick-one/shared";
import { createApiApplication } from "../../app";

const auth = createAuthConfig({ JWT_SECRET: "test-secret-that-must-be-at-least-32-characters-long!!" });
async function authHeader(): Promise<{ Authorization: string }> {
  const token = await signAccessToken(
    { sub: "0", email: "test@example.com", type: "access", role: "admin" },
    auth,
  );
  return { Authorization: `Bearer ${token}` };
}
function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "mock" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null, auth },
  );
}

describe("products routes", async () => {
  let headers: Record<string, string> = {};
  beforeAll(async () => { headers = await authHeader(); });
  const app = createApp();

  test("returns all products", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/products", { headers }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test("returns products with expected fields", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/products", { headers }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body[0]).toMatchObject({
      codigo_producto: expect.any(Number),
      nombre: expect.any(String),
      categoria: expect.any(String),
    });
  });
});
