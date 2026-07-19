import { describe, expect, test } from "bun:test";
import { createApiApplication } from "../../app";

function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "mock" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null },
  );
}

describe("payment flow integration", () => {
  const app = createApp();

  test("records payment and marks order as paid", async () => {
    const createResponse = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 1,
          direccion: "Payment flow test",
          fecha_pedido: "2025-06-01T10:00:00.000Z",
          etiqueta: "payment-flow",
          tipo_duracion: "48h",
        }),
      }),
    );
    const order = await createResponse.json();

    const paymentResponse = await app.fetch(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo_pedido: order.codigo_pedido,
          monto_pagado: order.monto,
          fecha_pago: "2025-06-01T12:00:00.000Z",
          tipo_tarjeta: "DB",
          referencia: "FLOW-1",
        }),
      }),
    );
    expect(paymentResponse.status).toBe(201);
    const payment = await paymentResponse.json();
    expect(payment.monto_pagado).toBe(order.monto);

    const ordersResponse = await app.fetch(new Request("http://localhost/api/v1/orders"));
    const orders = await ordersResponse.json();
    const updatedOrder = orders.find((o: { codigo_pedido: string }) => o.codigo_pedido === order.codigo_pedido);
    expect(updatedOrder.pagado).toBe(true);
  });

  test("returns 409 for payment on cancelled order", async () => {
    const createResponse = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 1,
          direccion: "Cancel pay test",
          fecha_pedido: "2025-06-01T10:00:00.000Z",
          etiqueta: "cancel-pay-test",
          tipo_duracion: "48h",
        }),
      }),
    );
    const order = await createResponse.json();

    await app.fetch(
      new Request(`http://localhost/api/v1/orders/${order.codigo_pedido}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ estado: "cancelado" }),
      }),
    );

    const response = await app.fetch(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo_pedido: order.codigo_pedido,
          monto_pagado: 35,
          fecha_pago: "2025-06-01T12:00:00.000Z",
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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 1,
          direccion: "Double pay test",
          fecha_pedido: "2025-06-01T10:00:00.000Z",
          etiqueta: "double-pay-test",
          tipo_duracion: "48h",
        }),
      }),
    );
    const order = await createResponse.json();

    await app.fetch(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo_pedido: order.codigo_pedido,
          monto_pagado: order.monto,
          fecha_pago: "2025-06-01T12:00:00.000Z",
          tipo_tarjeta: "DB",
        }),
      }),
    );

    const secondResponse = await app.fetch(
      new Request("http://localhost/api/v1/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo_pedido: order.codigo_pedido,
          monto_pagado: order.monto,
          fecha_pago: "2025-06-01T12:00:00.000Z",
          tipo_tarjeta: "DB",
        }),
      }),
    );
    expect(secondResponse.status).toBe(409);
  });
});
