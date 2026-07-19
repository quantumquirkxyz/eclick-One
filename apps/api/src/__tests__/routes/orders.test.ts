import { describe, expect, test } from "bun:test";
import { createApiApplication } from "../../app";

function createApp() {
  return createApiApplication(
    { REPOSITORY_MODE: "mock" },
    { host: "0.0.0.0", port: 3000, corsOrigins: ["http://localhost:5173"], onchain: null },
  );
}

describe("orders routes", () => {
  const app = createApp();

  test("lists all orders", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/orders"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test("lists current orders", async () => {
    const response = await app.fetch(new Request("http://localhost/api/v1/orders/current"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("creates a valid order", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 2,
          direccion: "Test street",
          fecha_pedido: "2025-01-15T10:00:00.000Z",
          etiqueta: "test-order",
          tipo_duracion: "48h",
        }),
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.codigo_cliente).toBe(1);
    expect(body.estado).toBe("generado");
  });

  test("returns 404 when creating order for non-existent client", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 99999,
          codigo_producto: 1000,
          cantidad: 1,
          direccion: "Test",
          fecha_pedido: "2025-01-15T10:00:00.000Z",
          etiqueta: "test",
          tipo_duracion: "48h",
        }),
      }),
    );
    expect(response.status).toBe(404);
  });

  test("returns 404 when creating order for non-existent product", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 99999,
          cantidad: 1,
          direccion: "Test",
          fecha_pedido: "2025-01-15T10:00:00.000Z",
          etiqueta: "test",
          tipo_duracion: "48h",
        }),
      }),
    );
    expect(response.status).toBe(404);
  });

  test("returns 400 for invalid order body", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ direccion: "Test" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  test("returns 500 for order date in the past", async () => {
    const response = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 1,
          direccion: "Test",
          fecha_pedido: "2020-01-01T10:00:00.000Z",
          etiqueta: "test",
          tipo_duracion: "48h",
        }),
      }),
    );
    expect(response.status).toBe(500);
  });

  test("transitions order status to in-process", async () => {
    const createResponse = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 1,
          direccion: "Test",
          fecha_pedido: "2025-01-15T10:00:00.000Z",
          etiqueta: "test-transition",
          tipo_duracion: "48h",
        }),
      }),
    );
    const order = await createResponse.json();
    expect(order.estado).toBe("generado");

    const response = await app.fetch(
      new Request(`http://localhost/api/v1/orders/${order.codigo_pedido}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ estado: "proceso" }),
      }),
    );
    expect(response.status).toBe(200);
    const updated = await response.json();
    expect(updated.estado).toBe("proceso");
  });

  test("returns 400 for invalid status value", async () => {
    const createResponse = await app.fetch(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codigo_cliente: 1,
          codigo_producto: 1000,
          cantidad: 1,
          direccion: "Test",
          fecha_pedido: "2025-01-15T10:00:00.000Z",
          etiqueta: "test-invalid-status",
          tipo_duracion: "48h",
        }),
      }),
    );
    const order = await createResponse.json();

    const response = await app.fetch(
      new Request(`http://localhost/api/v1/orders/${order.codigo_pedido}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ estado: "invalid_status" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  test("returns 404 when transitioning non-existent order", async () => {
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
