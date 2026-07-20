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

describe("customers routes", async () => {
  let headers: Record<string, string> = {};
  beforeAll(async () => { headers = await authHeader(); });
  const app = createApp();

  test("lists all customers via /customers", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/customers", { headers }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test("lists all customers via /clientes", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/clientes", { headers }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test("creates a new customer", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          nombre: "Test",
          apellido: "User",
          identificacion: "TEST-123",
          provincia: { codigo: "PA", nombre: "Panama", prefijo: "PA" },
          tipo_tarjeta: "DB",
          paz_y_salvo: true,
        }),
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ nombre: "Test", apellido: "User" });
  });

  test("returns 400 for missing required fields on create", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ nombre: "Test" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  test("returns 400 for empty required string fields", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          nombre: "",
          apellido: "User",
          identificacion: "TEST-456",
          provincia: { codigo: "PA", nombre: "Panama", prefijo: "PA" },
          tipo_tarjeta: "DB",
          paz_y_salvo: true,
        }),
      }),
    );
    expect(response.status).toBe(400);
  });

  test("returns 400 for non-object JSON body", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: '"not-an-object"',
      }),
    );
    expect(response.status).toBe(400);
  });
});
