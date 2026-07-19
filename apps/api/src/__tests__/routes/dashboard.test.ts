import { describe, expect, test } from "bun:test";
import { createApiApplication } from "../../app";

function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "mock" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null },
  );
}

describe("dashboard routes", () => {
  const app = createApp();

  test("returns dashboard snapshot in English", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/dashboard"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.synthetic).toBe(true);
    expect(body.metrics).toBeDefined();
    expect(body.metrics.clients).toBeGreaterThanOrEqual(0);
  });

  test("returns dashboard snapshot in Spanish", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/dashboard", {
        headers: { "accept-language": "es" },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notice).toContain("sinteticos");
  });

  test("returns metrics with expected keys", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/dashboard"));
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
    const response = await app.fetch(new Request("http://localhost/api/v1/dashboard"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.orderStatuses)).toBe(true);
    expect(body.orderStatuses.length).toBeGreaterThan(0);
  });
});
