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

describe("concurrent requests", async () => {
  let headers: Record<string, string> = {};
  beforeAll(async () => { headers = await authHeader(); });
  const app = createApp();

  test("handles concurrent health checks", async () => {
    const requests = Array.from({ length: 10 }, () =>
      app.fetch(new Request("http://localhost/api/v1/health")),
    );
    const responses = await Promise.all(requests);
    for (const response of responses) {
      expect(response.status).toBe(200);
    }
  });

  test("handles concurrent dashboard requests", async () => {
    const requests = Array.from({ length: 10 }, () =>
      app.fetch(new Request("http://localhost/api/v1/dashboard", { headers })),
    );
    const responses = await Promise.all(requests);
    for (const response of responses) {
      expect(response.status).toBe(200);
    }
  });

  test("handles concurrent order creation", async () => {
    const requests = Array.from({ length: 5 }, (_, i) =>
      app.fetch(
        new Request("http://localhost/api/v1/orders", {
          method: "POST",
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify({
            codigo_cliente: 1,
            codigo_producto: 1000,
            cantidad: 1,
            direccion: `Concurrent test ${i}`,
            fecha_pedido: "2025-06-01T10:00:00.000Z",
            etiqueta: `concurrent-${i}`,
            tipo_duracion: "48h",
          }),
        }),
      ),
    );
    const responses = await Promise.all(requests);
    for (const response of responses) {
      expect(response.status).toBe(201);
    }
  });

  test("handles concurrent payment recordings", async () => {
    const createResponse = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 1,
          direccion: "Concurrent pay test",
          fecha_pedido: "2025-06-01T10:00:00.000Z",
          etiqueta: "concurrent-pay",
          tipo_duracion: "48h",
        }),
      }),
    );
    const order = await createResponse.json();

    const requests = Array.from({ length: 3 }, () =>
      app.fetch(
        new Request("http://localhost/api/v1/payments", {
          method: "POST",
          headers: { ...headers, "content-type": "application/json" },
          body: JSON.stringify({
            codigo_pedido: order.codigo_pedido,
            monto_pagado: order.monto,
            fecha_pago: "2025-06-01T12:00:00.000Z",
            tipo_tarjeta: "DB",
          }),
        }),
      ),
    );
    const responses = await Promise.all(requests);
    const statuses = await Promise.all(responses.map((r) => r.status));
    expect(statuses.every((s) => s === 201)).toBe(true);
  });
});
