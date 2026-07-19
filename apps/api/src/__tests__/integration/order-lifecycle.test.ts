import { describe, expect, test } from "bun:test";
import { createApiApplication } from "../../app";

function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "mock" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null },
  );
}

describe("order lifecycle integration", () => {
  const app = createApp();

  test("completes full order lifecycle from creation to invoicing", async () => {
    const createResponse = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ estado: "proceso" }),
      }),
    );
    expect(transitionToProcess.status).toBe(200);
    const inProcess = await transitionToProcess.json();
    expect(inProcess.estado).toBe("proceso");

    const paymentResponse = await app.fetch(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
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
        headers: { "content-type": "application/json" },
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
        headers: { "content-type": "application/json" },
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
        headers: { "content-type": "application/json" },
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
        headers: { "content-type": "application/json" },
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ estado: "facturado" }),
      }),
    );
    expect(response.status).toBe(500);
  });

  test("returns 404 for non-existent order in lifecycle", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/orders/NONEXISTENT/status", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ estado: "proceso" }),
      }),
    );
    expect(response.status).toBe(404);
  });
});
