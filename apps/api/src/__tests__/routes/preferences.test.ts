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

describe("client preference routes", async () => {
  let headers: Record<string, string> = {};
  beforeAll(async () => { headers = await authHeader(); });
  const app = createApp();

  test("returns preference for existing client", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers/1/preference", { headers }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ codigo_producto: expect.any(Number) });
  });

  test("returns 404 for non-existent client preference", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers/99999/preference", { headers }),
    );
    expect(response.status).toBe(404);
  });

  test("returns 400 for non-integer client code", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers/abc/preference", { headers }),
    );
    expect(response.status).toBe(400);
  });
});
