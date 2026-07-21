import { beforeAll, describe, expect, test } from "bun:test";
import { createAuthConfig, signAccessToken } from "@eclick-one/shared";
import { createApiApplication } from "../../app";

const auth = createAuthConfig({ JWT_SECRET: "test-secret-that-must-be-at-least-32-characters-long!!" });

async function authHeader(role: "admin" | "operator" | "viewer" | "agent"): Promise<{ Authorization: string }> {
  const token = await signAccessToken(
    { sub: "1", email: `${role}@example.com`, type: "access", role },
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

describe("route auth guards", async () => {
  const app = createApp();
  let viewerHeaders: Record<string, string> = {};

  beforeAll(async () => {
    viewerHeaders = await authHeader("viewer");
  });

  test("keeps health public", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(200);
  });

  test("returns 401 on protected routes without a token", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/dashboard"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });

  test("returns 403 when role permissions are insufficient", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: { ...viewerHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          nombre: "Viewer",
          apellido: "Blocked",
          identificacion: "TEST-403",
          provincia: { codigo: "PA", nombre: "Panama", prefijo: "PA" },
          tipo_tarjeta: "DB",
          paz_y_salvo: true,
        }),
      }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
  });
});
