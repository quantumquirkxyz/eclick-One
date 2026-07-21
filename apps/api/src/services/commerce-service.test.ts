import { describe, expect, test } from "bun:test";
import { MockCommerceRepository } from "@eclick-one/db";
import { CommerceService } from "./commerce-service";

function createService(): CommerceService {
  return new CommerceService(new MockCommerceRepository(), true, null);
}

describe("commerce service", () => {
  test("creates orders in mock mode", async () => {
    const service = createService();
    const before = await service.listOrders();
    const order = await service.createOrder({
      codigo_cliente: 1,
      codigo_producto: 1000,
      cantidad: 2,
      direccion: "New address",
      fecha_pedido: "2026-07-20T10:00:00.000Z",
      etiqueta: "pedido-web",
      tipo_duracion: "48h",
    });

    expect(order.codigo_pedido).toBe(`PA-SYN-${String(before.filter((item) => item.codigo_pedido.startsWith("PA-SYN-")).length + 1).padStart(4, "0")}`);
    expect(order.monto).toBe(70);
    expect(order.estado).toBe("generado");
  });

  test("blocks order creation when the client is not paz y salvo", async () => {
    const service = createService();
    await expect(
      service.createOrder({
        codigo_cliente: 3,
        codigo_producto: 1000,
        cantidad: 1,
        direccion: "New address",
        fecha_pedido: "2024-12-31T10:00:00.000Z",
        etiqueta: "pedido-web",
        tipo_duracion: "48h",
      }),
    ).rejects.toThrow("paz y salvo");
  });

  test("records payments and updates the order to paid", async () => {
    const service = createService();
    const created = await service.createOrder({
      codigo_cliente: 2,
      codigo_producto: 1001,
      cantidad: 1,
      direccion: "Branch office",
      fecha_pedido: "2026-07-20T09:00:00.000Z",
      etiqueta: "payment-test-order",
      tipo_duracion: "48h",
    });
    const payment = await service.recordPayment({
      codigo_pedido: created.codigo_pedido,
      monto_pagado: 50,
      fecha_pago: "2026-07-20T18:00:00.000Z",
      tipo_tarjeta: "DB",
      referencia: "PAGO-001",
    });

    expect(payment.id_pago).toBeGreaterThan(0);
    const orders = await service.listOrders();
    expect(orders.find((order) => order.codigo_pedido === created.codigo_pedido)?.pagado).toBe(true);
  });

  test("rejects payments with incorrect amounts", async () => {
    const service = createService();
    const created = await service.createOrder({
      codigo_cliente: 2,
      codigo_producto: 1001,
      cantidad: 1,
      direccion: "Branch office",
      fecha_pedido: "2026-07-20T09:00:00.000Z",
      etiqueta: "payment-mismatch-order",
      tipo_duracion: "48h",
    });
    await expect(
      service.recordPayment({
        codigo_pedido: created.codigo_pedido,
        monto_pagado: 99,
        fecha_pago: "2026-07-20T18:00:00.000Z",
        tipo_tarjeta: "DB",
      }),
    ).rejects.toThrow("Payment amount must match");
  });

  test("rejects invalid order transitions", async () => {
    const service = createService();
    await expect(
      service.transitionOrderStatus({
        codigo_pedido: "PA-SYN-0001",
        estado: "proceso",
      }),
    ).rejects.toThrow("Cannot transition");
  });

  test("rejects delivery when the order is unpaid", async () => {
    const service = createService();
    const unpaidOrder = await service.createOrder({
      codigo_cliente: 11,
      codigo_producto: 1014,
      cantidad: 1,
      direccion: "Pending delivery test",
      fecha_pedido: "2026-07-20T08:00:00.000Z",
      etiqueta: "delivery-unpaid-order",
      tipo_duracion: "48h",
    });
    await service.transitionOrderStatus({
      codigo_pedido: unpaidOrder.codigo_pedido,
      estado: "proceso",
    });
    await expect(
      service.transitionOrderStatus({
        codigo_pedido: unpaidOrder.codigo_pedido,
        estado: "entregado",
      }),
    ).rejects.toThrow("paid");
  });

  test("returns client preference after three matching orders", async () => {
    const service = createService();
    await service.createOrder({
      codigo_cliente: 1,
      codigo_producto: 1000,
      cantidad: 1,
      direccion: "Preference Street 1",
      fecha_pedido: "2026-07-18T10:00:00.000Z",
      etiqueta: "preference-order-1",
      tipo_duracion: "48h",
    });
    await service.createOrder({
      codigo_cliente: 1,
      codigo_producto: 1000,
      cantidad: 3,
      direccion: "Preference Street 2",
      fecha_pedido: "2026-07-19T10:00:00.000Z",
      etiqueta: "preference-order-2",
      tipo_duracion: "48h",
    });
    await expect(service.getClientPreference(1)).resolves.toEqual({
      codigo_producto: 1000,
      cant_solicitudes: 3,
      cantidad_total: 6,
    });
  });

  test("lists current orders only", async () => {
    const service = createService();
    const current = await service.listCurrentOrders();
    expect(current.length).toBeGreaterThan(0);
    expect(current.every((order) => order.estado === "generado" || order.estado === "proceso")).toBe(true);
  });

  test("excludes day 31 from monthly order reports", async () => {
    const service = createService();
    const dashboard = await service.getDashboard();
    expect(dashboard.ordersByMonth).toEqual([
      { month: "2026-03", orders: 8 },
      { month: "2026-04", orders: 8 },
      { month: "2026-05", orders: 9 },
    ]);
  });
});
