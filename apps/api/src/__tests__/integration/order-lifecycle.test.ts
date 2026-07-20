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

describe("order lifecycle integration", async () => {
  let headers: Record<string, string> = {};
  beforeAll(async () => { headers = await authHeader(); });
  const app = createApp();

  test("completes full order lifecycle from creation to invoicing", async () => {
    const createResponse = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 2,
          direccion: "Lifecycle test",
          fecha_pedido: "2025-06-01T10:00:00.000Z",
          etiqueta: "lifecycle-test",
          tipo_duracion: "48h",
        }),
      }),
    );
    expect(createResponse.status).toBe(201);
    const order = await createResponse.json();
    expect(order.estado).toBe("generado");

    const transitionToProcess = await app.fetch(
      new Request(`http://localhost/api/v1/orders/${order.codigo_pedido}/status`, {
        method: "PATCH",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ estado: "proceso" }),
      }),
    );
    expect(transitionToProcess.status).toBe(200);
    const inProcess = await transitionToProcess.json();
    expect(inProcess.estado).toBe("proceso");

    const paymentResponse = await app.fetch(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          codigo_pedido: order.codigo_pedido,
          monto_pagado: order.monto,
          fecha_pago: "2025-06-01T12:00:00.000Z",
          tipo_tarjeta: "CR",
          referencia: "LIFECYCLE-1",
        }),
      }),
    );
    expect(paymentResponse.status).toBe(201);

    const transitionToDelivered = await app.fetch(
      new Request(`http://localhost/api/v1/orders/${order.codigo_pedido}/status`, {
        method: "PATCH",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ estado: "entregado" }),
      }),
    );
    expect(transitionToDelivered.status).toBe(200);
    const delivered = await transitionToDelivered.json();
    expect(delivered.estado).toBe("entregado");
    expect(delivered.pagado).toBe(true);
  });

  test("transitions order to cancelled", async () => {
    const createResponse = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 1,
          direccion: "Cancel test",
          fecha_pedido: "2025-06-01T10:00:00.000Z",
          etiqueta: "cancel-test",
          tipo_duracion: "48h",
        }),
      }),
    );
    const order = await createResponse.json();

    const response = await app.fetch(
      new Request(`http://localhost/api/v1/orders/${order.codigo_pedido}/status`, {
        method: "PATCH",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ estado: "cancelado" }),
      }),
    );
    expect(response.status).toBe(200);
    const updated = await response.json();
    expect(updated.estado).toBe("cancelado");
  });

  test("blocks invalid status transitions", async () => {
    const createResponse = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 1,
          direccion: "Transition test",
          fecha_pedido: "2025-06-01T10:00:00.000Z",
          etiqueta: "transition-test",
          tipo_duracion: "48h",
        }),
      }),
    );
    const order = await createResponse.json();

    const response = await app.fetch(
      new Request(`http://localhost/api/v1/orders/${order.codigo_pedido}/status`, {
        method: "PATCH",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ estado: "facturado" }),
      }),
    );
    expect(response.status).toBe(500);
  });

  test("returns 404 for non-existent order in lifecycle", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/orders/NONEXISTENT/status", {
        method: "PATCH",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ estado: "proceso" }),
      }),
    );
    expect(response.status).toBe(404);
  });
});
