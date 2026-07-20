import { beforeAll, describe, expect, test } from "bun:test";
import { createAuthConfig, signAccessToken } from "@eclick-one/shared";
import { createApiApplication } from "../../app";

const auth = createAuthConfig({ JWT_SECRET: "test-secret-that-must-be-at-least-32-characters-long!!" });
async function authHeader(): Promise<{ Authorization: string }> {
  const token = await signAccessToken(
    { sub: "0", email: "test@example.com", type: "access" },
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

describe("dashboard routes", async () => {
  let headers: Record<string, string> = {};
  beforeAll(async () => { headers = await authHeader(); });
  const app = createApp();

  test("returns dashboard snapshot in English", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/dashboard", { headers }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.synthetic).toBe(true);
    expect(body.metrics).toBeDefined();
    expect(body.metrics.clients).toBeGreaterThanOrEqual(0);
  });

  test("returns dashboard snapshot in Spanish", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/dashboard", {
        headers: { ...headers, "accept-language": "es" },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notice).toContain("sinteticos");
  });

  test("returns metrics with expected keys", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/dashboard", { headers }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.metrics).toMatchObject({
      clients: expect.any(Number),
      products: expect.any(Number),
      orders: expect.any(Number),
      currentOrders: expect.any(Number),
      collected: expect.any(Number),
      notPazYSalvo: expect.any(Number),
      atRiskOrders: expect.any(Number),
    });
  });

  test("returns order statuses breakdown", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/dashboard", { headers }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.orderStatuses)).toBe(true);
    expect(body.orderStatuses.length).toBeGreaterThan(0);
  });
});
