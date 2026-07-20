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

describe("reports routes", async () => {
  let headers: Record<string, string> = {};
  beforeAll(async () => { headers = await authHeader(); });
  const app = createApp();

  test("returns reports in English", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/reports", { headers }));
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
        headers: { ...headers, "accept-language": "es" },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sections[0].title).toBe("Pedidos por estado");
  });

  test("includes generatedAt timestamp", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/reports", { headers }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.generatedAt).toBeDefined();
    expect(new Date(body.generatedAt).getTime()).not.toBeNaN();
  });

  test("includes inventory section", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/reports", { headers }));
    expect(response.status).toBe(200);
    const body = await response.json();
    const inventorySection = body.sections.find((s: any) => s.key === "inventory");
    expect(inventorySection).toBeDefined();
    expect(inventorySection.rows.length).toBeGreaterThan(0);
  });
});
