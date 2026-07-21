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

describe("payments routes", async () => {
  let headers: Record<string, string> = {};
  beforeAll(async () => { headers = await authHeader(); });
  const app = createApp();

  test("lists all payments", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/payments", { headers }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("records a payment for an existing order with correct amount", async () => {
    const createResponse = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 2,
          direccion: "Payment test",
          fecha_pedido: "2025-01-15T10:00:00.000Z",
          etiqueta: "payment-test",
          tipo_duracion: "48h",
        }),
      }),
    );
    const order = await createResponse.json();
    const orderAmount = order.monto;

    const response = await app.fetch(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          codigo_pedido: order.codigo_pedido,
          monto_pagado: orderAmount,
          fecha_pago: "2025-01-15T12:00:00.000Z",
          tipo_tarjeta: "DB",
          referencia: "REF-001",
        }),
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.monto_pagado).toBe(orderAmount);
  });

  test("returns 409 for payment on cancelled order", async () => {
    const createResponse = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 1,
          direccion: "Cancel test",
          fecha_pedido: "2025-01-15T10:00:00.000Z",
          etiqueta: "cancel-test",
          tipo_duracion: "48h",
        }),
      }),
    );
    const order = await createResponse.json();

    await app.fetch(
      new Request(`http://localhost/api/v1/orders/${order.codigo_pedido}/status`, {
        method: "PATCH",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ estado: "cancelado" }),
      }),
    );

    const response = await app.fetch(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          codigo_pedido: order.codigo_pedido,
          monto_pagado: 35,
          fecha_pago: "2025-01-15T12:00:00.000Z",
          tipo_tarjeta: "DB",
        }),
      }),
    );
    expect(response.status).toBe(409);
  });

  test("prevents double payment on same order", async () => {
    const createResponse = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 1,
          direccion: "Double pay test",
          fecha_pedido: "2025-01-15T10:00:00.000Z",
          etiqueta: "double-pay-test",
          tipo_duracion: "48h",
        }),
      }),
    );
    const order = await createResponse.json();

    await app.fetch(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          codigo_pedido: order.codigo_pedido,
          monto_pagado: order.monto,
          fecha_pago: "2025-01-15T12:00:00.000Z",
          tipo_tarjeta: "DB",
        }),
      }),
    );

    const secondResponse = await app.fetch(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          codigo_pedido: order.codigo_pedido,
          monto_pagado: order.monto,
          fecha_pago: "2025-01-15T12:00:00.000Z",
          tipo_tarjeta: "DB",
        }),
      }),
    );
    expect(secondResponse.status).toBe(409);
  });

  test("returns 404 when recording payment for non-existent order", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          codigo_pedido: "PA-SYN-9999",
          monto_pagado: 35,
          fecha_pago: "2025-01-15T12:00:00.000Z",
          tipo_tarjeta: "DB",
        }),
      }),
    );
    expect(response.status).toBe(404);
  });

  test("returns 400 for invalid payment body", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ codigo_pedido: "PA-SYN-0001" }),
      }),
    );
    expect(response.status).toBe(400);
  });
});
