import { describe, expect, test } from "bun:test";
import { createApiApplication } from "./app";

const app = createApiApplication(
  { REPOSITORY_MODE: "mock" },
  { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null },
);

describe("API application", () => {
  test("returns a shallow health check", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", repositoryMode: "mock", uptime: expect.any(Number) });
  });

  test("marks dashboard data as synthetic", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/dashboard"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ synthetic: true });
  });

  test("returns a structured 404", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/missing"));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  test("rejects non-object JSON bodies", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "\"oops\"",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "BAD_REQUEST" } });
  });

  test("rejects oversized JSON bodies before parsing", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "1000001",
        },
        body: JSON.stringify({ nombre: "A" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "BAD_REQUEST" } });
  });

  test("rejects JSON mutation requests without JSON content type", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "BAD_REQUEST",
        details: { fields: [{ field: "content-type" }] },
      },
    });
  });

  test("rejects unsupported accept-language values", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/dashboard", {
        headers: { "accept-language": "fr-FR" },
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "BAD_REQUEST",
        details: { fields: [{ field: "accept-language" }] },
      },
    });
  });

  test("returns field-level validation errors in Spanish", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: {
          "accept-language": "es",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          codigo_pedido: "oops",
          monto_pagado: -1,
          fecha_pago: "not-a-date",
          tipo_tarjeta: "BAD",
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: {
        code: "BAD_REQUEST",
        message: "La validacion fallo.",
        details: {
          fields: [
            { field: "codigo_pedido", message: "codigo_pedido debe ser un codigo de pedido valido." },
            { field: "monto_pagado", message: "monto_pagado debe ser un monto positivo." },
            { field: "fecha_pago", message: "fecha_pago debe ser una fecha ISO valida." },
            { field: "tipo_tarjeta" },
          ],
        },
      },
    });
  });

  test("sanitizes customer string input before persistence", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nombre: "  <Ada>  ",
          apellido: "Lovelace",
          identificacion: "ID-123",
          provincia: { codigo: "PA", nombre: "Panama", prefijo: "PA" },
          tipo_tarjeta: "CR",
          paz_y_salvo: true,
          email: "ada@example.com",
          phone: "+507 6000-0000",
        }),
      }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      nombre: "&lt;Ada&gt;",
      apellido: "Lovelace",
      email: "ada@example.com",
    });
  });
});
