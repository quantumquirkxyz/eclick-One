import { describe, expect, test } from "bun:test";
import { createApiApplication } from "../../app";

function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "mock" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null },
  );
}

describe("customers routes", () => {
  const app = createApp();

  test("lists all customers via /customers", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/customers"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test("lists all customers via /clientes", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/clientes"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test("creates a new customer", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nombre: "Test" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  test("returns 400 for empty required string fields", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
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
        headers: { "content-type": "application/json" },
        body: '"not-an-object"',
      }),
    );
    expect(response.status).toBe(400);
  });
});
