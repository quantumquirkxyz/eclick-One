import { describe, expect, test } from "bun:test";
import { createApiApplication } from "../../app";

function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "mock" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null },
  );
}

describe("reports routes", () => {
  const app = createApp();

  test("returns reports in English", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/reports"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.synthetic).toBe(true);
    expect(body.sections).toBeDefined();
    expect(body.sections.length).toBeGreaterThan(0);
    expect(body.sections[0].title).toBe("Orders by status");
  });

  test("returns reports in Spanish", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/reports", {
        headers: { "accept-language": "es" },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sections[0].title).toBe("Pedidos por estado");
  });

  test("includes generatedAt timestamp", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/reports"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.generatedAt).toBeDefined();
    expect(new Date(body.generatedAt).getTime()).not.toBeNaN();
  });

  test("includes inventory section", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/reports"));
    expect(response.status).toBe(200);
    const body = await response.json();
    const inventorySection = body.sections.find((s: any) => s.key === "inventory");
    expect(inventorySection).toBeDefined();
    expect(inventorySection.rows.length).toBeGreaterThan(0);
  });
});
