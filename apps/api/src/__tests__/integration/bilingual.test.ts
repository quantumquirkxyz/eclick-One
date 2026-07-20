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

describe("bilingual responses", async () => {
  let headers: Record<string, string> = {};
  beforeAll(async () => { headers = await authHeader(); });
  const app = createApp();

  test("returns English error for English accept-language", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers/abc/preference", {
        headers: { ...headers, "accept-language": "en" },
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toBe("codigo_cliente must be an integer.");
  });

  test("returns Spanish error for Spanish accept-language", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers/abc/preference", {
        headers: { ...headers, "accept-language": "es" },
      }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toBe("codigo_cliente debe ser un entero.");
  });

  test("returns Spanish dashboard notice", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/dashboard", {
        headers: { ...headers, "accept-language": "es" },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notice).toContain("sinteticos");
  });

  test("returns English dashboard notice by default", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/dashboard", { headers }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notice).toContain("Synthetic");
  });

  test("returns Spanish reports headers", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/reports", {
        headers: { ...headers, "accept-language": "es" },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    const orderStatusSection = body.sections.find((s: any) => s.key === "order-status");
    expect(orderStatusSection.title).toBe("Pedidos por estado");
  });

  test("returns English reports headers by default", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/reports", { headers }));
    expect(response.status).toBe(200);
    const body = await response.json();
    const orderStatusSection = body.sections.find((s: any) => s.key === "order-status");
    expect(orderStatusSection.title).toBe("Orders by status");
  });
});
