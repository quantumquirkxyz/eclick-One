import { describe, expect, test } from "bun:test";
import { MockCommerceRepository } from "@eclick-one/db";
import { CommerceService } from "./commerce-service";

function createService(): CommerceService {
  return new CommerceService(new MockCommerceRepository(), true);
}

describe("commerce service", () => {
  test("creates orders in mock mode", async () => {
    const service = createService();
    const order = await service.createOrder({
      codigo_cliente: 1,
      codigo_producto: 1000,
      cantidad: 2,
      direccion: "Dirección nueva",
      fecha_pedido: "2024-12-31T10:00:00.000Z",
      etiqueta: "pedido-web",
      tipo_duracion: "48h",
    });

    expect(order.codigo_pedido).toBe("PA-SYN-0004");
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
        direccion: "Dirección nueva",
        fecha_pedido: "2024-12-31T10:00:00.000Z",
        etiqueta: "pedido-web",
        tipo_duracion: "48h",
      }),
    ).rejects.toThrow("paz y salvo");
  });

  test("records payments and updates the order to paid", async () => {
    const service = createService();
    const payment = await service.recordPayment({
      codigo_pedido: "CH-SYN-0004",
      monto_pagado: 50,
      fecha_pago: "2024-12-30T18:00:00.000Z",
      tipo_tarjeta: "DB",
      referencia: "PAGO-001",
    });

    expect(payment.id_pago).toBe(3);
    const orders = await service.listOrders();
    expect(orders.find((order) => order.codigo_pedido === "CH-SYN-0004")?.pagado).toBe(true);
  });

  test("rejects payments with incorrect amounts", async () => {
    const service = createService();
    await expect(
      service.recordPayment({
        codigo_pedido: "CH-SYN-0004",
        monto_pagado: 99,
        fecha_pago: "2024-12-30T18:00:00.000Z",
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
    await expect(
      service.transitionOrderStatus({
        codigo_pedido: "PA-SYN-0003",
        estado: "entregado",
      }),
    ).rejects.toThrow("paid");
  });

  test("returns client preference after three matching orders", async () => {
    const service = createService();
    await expect(service.getClientPreference(1)).resolves.toEqual({
      codigo_producto: 1000,
      cant_solicitudes: 3,
      cantidad_total: 6,
    });
  });

  test("lists current orders only", async () => {
    const service = createService();
    const current = await service.listCurrentOrders();
    expect(current.map((order) => order.estado)).toEqual(["proceso", "proceso", "generado"]);
  });

  test("excludes day 31 from monthly order reports", async () => {
    const service = createService();
    const dashboard = await service.getDashboard();
    expect(dashboard.ordersByMonth).toEqual([{ month: "2024-12", orders: 3 }]);
  });
});
