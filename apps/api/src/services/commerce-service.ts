import type {
  Client,
  CommerceRepositories,
  Inventory,
  NewClient,
  NewOrder,
  NewPayment,
  Order,
  OrderStatus,
  Payment,
  Product,
  ProductPreference,
  Province,
} from "@eclick-one/domain";
import {
  assertClientCanGenerateOrder,
  assertOrderDateAllowed,
  assertOrderDeliveryAllowed,
  assertOrderPaymentAmount,
  assertOrderTransitionAllowed,
  assertPaymentReference,
  isOrderStatus,
  amountForQuantity,
} from "@eclick-one/domain";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../errors/app-error";
import { apiText, type ApiLocale } from "../i18n";
import type { OnChainClient } from "../onchain/OnChainClient";

export interface DashboardSnapshot {
  readonly kind: "dashboard";
  synthetic: boolean;
  notice: string;
  metrics: {
    clients: number;
    products: number;
    orders: number;
    currentOrders: number;
    collected: number;
    notPazYSalvo: number;
    atRiskOrders: number;
  };
  orderStatuses: readonly { status: OrderStatus; count: number }[];
  ordersByMonth: readonly { month: string; orders: number }[];
  paymentsByMonth: readonly { month: string; payments: number; amount: number }[];
  inventorySummary: readonly {
    codigo_producto: number;
    nombre: string;
    ventas: number;
    bodega: number;
    reservado: number;
    disponible: number;
  }[];
  topProducts: readonly {
    codigo_producto: number;
    nombre: string;
    cantidad: number;
    pedidos: number;
  }[];
  nonCompliantClients: readonly { codigo_cliente: number; nombre: string; apellido: string }[];
  atRiskOrders: readonly {
    codigo_pedido: string;
    codigo_cliente: number;
    estado: OrderStatus;
    hoursOpen: number;
  }[];
  preferencesByClient: readonly {
    codigo_cliente: number;
    nombre: string;
    apellido: string;
    preference: ProductPreference | null;
  }[];
}

export class CommerceService {
  constructor(
    private readonly repositories: CommerceRepositories,
    private readonly synthetic: boolean,
    private readonly onchain: OnChainClient | null,
  ) {}

  listProvinces(): Promise<readonly Province[]> {
    return this.repositories.listProvinces();
  }

  listClients(): Promise<readonly Client[]> {
    return this.repositories.listClients();
  }

  async createClient(input: NewClient): Promise<Client> {
    assertProvinceShape(input.provincia);
    assertText(input.nombre, "nombre");
    assertText(input.apellido, "apellido");
    assertText(input.identificacion, "identificacion");
    return this.callRepository(() => this.repositories.createClient(input));
  }

  listProducts(): Promise<readonly Product[]> {
    return this.repositories.listProducts();
  }

  listInventory(): Promise<readonly Inventory[]> {
    return this.repositories.listInventory();
  }

  listOrders(): Promise<readonly Order[]> {
    return this.repositories.listOrders();
  }

  listCurrentOrders(): Promise<readonly Order[]> {
    return this.repositories.listCurrentOrders();
  }

  listPayments(): Promise<readonly Payment[]> {
    return this.repositories.listPayments();
  }

  async getClientPreference(code: number): Promise<ProductPreference | null> {
    const client = await this.ensureClient(code);
    return this.callRepository(() => this.repositories.getClientPreference(client.codigo_cliente));
  }

  async createOrder(input: NewOrder): Promise<Order> {
    const client = await this.ensureClient(input.codigo_cliente);
    await this.ensureProduct(input.codigo_producto);
    if (this.synthetic) {
      assertClientCanGenerateOrder(client.paz_y_salvo);
      assertOrderDateAllowed(input.fecha_pedido);
    }
    assertPositiveText(input.direccion, "direccion");
    assertPositiveText(input.etiqueta, "etiqueta");
    assertPositiveText(input.tipo_duracion, "tipo_duracion");
    if (!Number.isInteger(input.cantidad) || input.cantidad < 1) {
      throw new BadRequestError("cantidad must be a positive integer.");
    }
    if (input.fecha_entrega && this.synthetic) {
      assertIsoDate(input.fecha_entrega, "fecha_entrega");
      if (new Date(input.fecha_entrega).getTime() < new Date(input.fecha_pedido).getTime()) {
        throw new BadRequestError("fecha_entrega cannot be earlier than fecha_pedido.");
      }
    }
    const order = await this.callRepository(() => this.repositories.createOrder(input));
    if (this.onchain) {
      const amount = amountForQuantity(input.cantidad);
      await this.onchain.createOrderOnChain(order.codigo_pedido, order.codigo_cliente, order.codigo_producto, order.cantidad, amount).catch((error) => {
        console.error("On-chain createOrder failed (non-fatal):", error);
      });
    }
    return order;
  }

  async recordPayment(input: NewPayment): Promise<Payment> {
    const order = await this.ensureOrder(input.codigo_pedido);
    assertIsoDate(input.fecha_pago, "fecha_pago");
    assertPositiveText(input.codigo_pedido, "codigo_pedido");
    assertPositiveMoney(input.monto_pagado, "monto_pagado");
    assertPaymentReference(input.referencia);
    if (this.synthetic) {
      if (!isOrderStatus(order.estado)) {
        throw new BadRequestError("Order status is not allowed.");
      }
      if (order.estado === "cancelado") {
        throw new ConflictError("Cannot register a payment for a cancelled order.");
      }
      if (order.pagado) {
        throw new ConflictError("Order is already paid.");
      }
      assertOrderPaymentAmount(order.monto, input.monto_pagado);
    }
    const payment = await this.callRepository(() => this.repositories.recordPayment(input));
    if (this.onchain) {
      await this.onchain.recordPaymentOnChain(order.codigo_pedido, input.monto_pagado).catch((error) => {
        console.error("On-chain recordPayment failed (non-fatal):", error);
      });
    }
    return payment;
  }

  async transitionOrderStatus(input: { codigo_pedido: string; estado: OrderStatus }): Promise<Order> {
    if (this.synthetic) {
      const order = await this.ensureOrder(input.codigo_pedido);
      if (!isOrderStatus(input.estado)) {
        throw new BadRequestError("Order status is not allowed.");
      }
      assertOrderTransitionAllowed(order, input.estado);
      if (input.estado === "entregado") {
        assertOrderDeliveryAllowed(order);
      }
      if (input.estado === "facturado" && !order.pagado) {
        throw new ConflictError("Cannot invoice an unpaid order.");
      }
    }
    const updatedOrder = await this.callRepository(() =>
      this.repositories.transitionOrderStatus({
        codigo_pedido: input.codigo_pedido,
        estado: input.estado,
      }),
    );
    if (this.onchain) {
      const onChainMethod = this.getOnChainTransitionMethod(input.estado);
      if (onChainMethod) {
        await onChainMethod(input.codigo_pedido).catch((error) => {
          console.error(`On-chain status transition to ${input.estado} failed (non-fatal):`, error);
        });
      }
    }
    return updatedOrder;
  }

  async getOrderOnChainStatus(codigoPedido: string): Promise<{ onChain: boolean; status: number | null; txHash?: string }> {
    if (!this.onchain) {
      return { onChain: false, status: null };
    }
    try {
      const status = await this.onchain.getOrderStatusOnChain(codigoPedido);
      return { onChain: true, status };
    } catch {
      return { onChain: false, status: null };
    }
  }

  private getOnChainTransitionMethod(estado: OrderStatus): ((orderCode: string) => Promise<string>) | null {
    switch (estado) {
      case "proceso": return (code) => this.onchain!.transitionToInProcess(code);
      case "entregado": return (code) => this.onchain!.transitionToDelivered(code);
      case "facturado": return (code) => this.onchain!.transitionToInvoiced(code);
      case "cancelado": return (code) => this.onchain!.cancelOrderOnChain(code);
      default: return null;
    }
  }

  async getDashboard(locale: ApiLocale = "en"): Promise<DashboardSnapshot> {
    const [clients, products, inventory, orders, payments, currentOrders] = await Promise.all([
      this.repositories.listClients(),
      this.repositories.listProducts(),
      this.repositories.listInventory(),
      this.repositories.listOrders(),
      this.repositories.listPayments(),
      this.repositories.listCurrentOrders(),
    ]);
    const preferencesByClient = await Promise.all(
      clients.map(async (client) => {
        const preference = await this.repositories
          .getClientPreference(client.codigo_cliente)
          .catch(() => null);
        return {
          codigo_cliente: client.codigo_cliente,
          nombre: client.nombre,
          apellido: client.apellido,
          preference,
        };
      }),
    );

    const monthlyPayments = new Map<string, { payments: number; amount: number }>();
    const monthlyOrders = new Map<string, number>();
    for (const payment of payments) {
      const month = payment.fecha_pago.slice(0, 7);
      const current = monthlyPayments.get(month) ?? { payments: 0, amount: 0 };
      monthlyPayments.set(month, {
        payments: current.payments + 1,
        amount: current.amount + payment.monto_pagado,
      });
    }

    const statusCount = new Map<OrderStatus, number>();
    const productTotals = new Map<number, { cantidad: number; pedidos: number }>();
    for (const order of orders) {
      statusCount.set(order.estado, (statusCount.get(order.estado) ?? 0) + 1);
      trackMonthlyOrder(order.fecha_pedido, monthlyOrders);
      const current = productTotals.get(order.codigo_producto) ?? { cantidad: 0, pedidos: 0 };
      productTotals.set(order.codigo_producto, {
        cantidad: current.cantidad + order.cantidad,
        pedidos: current.pedidos + 1,
      });
    }

    const inventorySummary = inventory
      .map((stock) => {
        const product = products.find((item) => item.codigo_producto === stock.codigo_producto);
        return {
          codigo_producto: stock.codigo_producto,
          nombre: product?.nombre ?? `Product ${stock.codigo_producto}`,
          ventas: stock.cant_ventas,
          bodega: stock.cant_bodega,
          reservado: stock.cant_reservado,
          disponible: stock.cant_bodega - stock.cant_reservado,
        };
      })
      .sort((left, right) => right.ventas - left.ventas);

    const topProducts = [...productTotals.entries()]
      .map(([codigo_producto, totals]) => ({
        codigo_producto,
        nombre: products.find((item) => item.codigo_producto === codigo_producto)?.nombre ?? `Product ${codigo_producto}`,
        cantidad: totals.cantidad,
        pedidos: totals.pedidos,
      }))
      .sort((left, right) => right.cantidad - left.cantidad || right.pedidos - left.pedidos);

    const nonCompliantClients = clients.filter((client) => !client.paz_y_salvo);
    const atRiskOrders = currentOrders
      .filter((order) => order.estado === "proceso")
      .map((order) => ({
        codigo_pedido: order.codigo_pedido,
        codigo_cliente: order.codigo_cliente,
        estado: order.estado,
        hoursOpen: Math.max(0, Math.floor((Date.now() - Date.parse(order.fecha_pedido)) / 3_600_000)),
      }))
      .sort((left, right) => right.hoursOpen - left.hoursOpen);

    return {
      kind: "dashboard",
      synthetic: this.synthetic,
      notice: this.synthetic ? apiText(locale, "dashboardMock") : apiText(locale, "dashboardSql"),
      metrics: {
        clients: clients.length,
        products: products.length,
        orders: orders.length,
        currentOrders: currentOrders.length,
        collected: payments.reduce((total, payment) => total + payment.monto_pagado, 0),
        notPazYSalvo: nonCompliantClients.length,
        atRiskOrders: atRiskOrders.length,
      },
      orderStatuses: [...statusCount.entries()].map(([status, count]) => ({ status, count })),
      ordersByMonth: [...monthlyOrders.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([month, ordersCount]) => ({ month, orders: ordersCount })),
      paymentsByMonth: [...monthlyPayments.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([month, value]) => ({ month, payments: value.payments, amount: value.amount })),
      inventorySummary,
      topProducts,
      nonCompliantClients: nonCompliantClients.map((client) => ({
        codigo_cliente: client.codigo_cliente,
        nombre: client.nombre,
        apellido: client.apellido,
      })),
      atRiskOrders,
      preferencesByClient,
    };
  }

  async getReports(locale: ApiLocale = "en"): Promise<{
    synthetic: boolean;
    generatedAt: string;
    sections: readonly { key: string; title: string; rows: readonly unknown[] }[];
  }> {
    const [dashboard, currentOrders, payments] = await Promise.all([
      this.getDashboard(locale),
      this.listCurrentOrders(),
      this.listPayments(),
    ]);
    return {
      synthetic: dashboard.synthetic,
      generatedAt: new Date().toISOString(),
      sections: [
        { key: "order-status", title: apiText(locale, "reportOrderStatus"), rows: dashboard.orderStatuses },
        { key: "orders-by-month", title: apiText(locale, "reportOrdersByMonth"), rows: dashboard.ordersByMonth },
        { key: "payments-by-month", title: apiText(locale, "reportPaymentsByMonth"), rows: dashboard.paymentsByMonth },
        { key: "inventory", title: apiText(locale, "reportInventory"), rows: dashboard.inventorySummary },
        { key: "top-products", title: apiText(locale, "reportTopProducts"), rows: dashboard.topProducts },
        { key: "current-orders", title: apiText(locale, "reportCurrentOrders"), rows: currentOrders },
        { key: "payments", title: apiText(locale, "reportPayments"), rows: payments },
      ],
    };
  }

  private async ensureClient(code: number): Promise<Client> {
    const client = await this.repositories.findClientByCode(code);
    if (!client) {
      throw new NotFoundError(`Client ${code} was not found.`);
    }
    return client;
  }

  private async ensureProduct(code: number): Promise<Product> {
    const product = (await this.repositories.listProducts()).find((item) => item.codigo_producto === code);
    if (!product) {
      throw new NotFoundError(`Product ${code} was not found.`);
    }
    return product;
  }

  private async ensureOrder(code: string): Promise<Order> {
    const order = (await this.repositories.listOrders()).find((item) => item.codigo_pedido === code);
    if (!order) {
      throw new NotFoundError(`Order ${code} was not found.`);
    }
    return order;
  }

  private async callRepository<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error && (error.name === "SqlProcedureError" || error.name === "TursoRepositoryError")) {
        throw new ConflictError(error.message);
      }
      throw error;
    }
  }
}

function trackMonthlyOrder(orderDate: string, acc: Map<string, number>): void {
  const date = new Date(orderDate);
  if (date.getUTCDate() <= 30) {
    const key = date.toISOString().slice(0, 7);
    acc.set(key, (acc.get(key) ?? 0) + 1);
  }
}

function assertProvinceShape(province: Province): void {
  if (!province || !province.codigo || !province.nombre || !province.prefijo) {
    throw new BadRequestError("provincia is required.");
  }
}

function assertText(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new BadRequestError(`${field} cannot be empty.`);
  }
}

function assertPositiveText(value: string, field: string): void {
  assertText(value, field);
}

function assertIsoDate(value: string, field: string): void {
  if (Number.isNaN(new Date(value).getTime())) {
    throw new BadRequestError(`${field} must be a valid ISO date.`);
  }
}

function assertPositiveMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new BadRequestError(`${field} must be a positive amount.`);
  }
}
