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

describe("payment flow integration", async () => {
  let headers: Record<string, string> = {};
  beforeAll(async () => { headers = await authHeader(); });
  const app = createApp();

  test("records payment and marks order as paid", async () => {
    const createResponse = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
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
        headers: { ...headers, "content-type": "application/json" },
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

    const ordersResponse = await app.fetch(new Request("http://localhost/api/v1/orders", { headers }));
    const orders = await ordersResponse.json();
    const updatedOrder = orders.find((o: { codigo_pedido: string }) => o.codigo_pedido === order.codigo_pedido);
    expect(updatedOrder.pagado).toBe(true);
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
        headers: { ...headers, "content-type": "application/json" },
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
        headers: { ...headers, "content-type": "application/json" },
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
        headers: { ...headers, "content-type": "application/json" },
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
