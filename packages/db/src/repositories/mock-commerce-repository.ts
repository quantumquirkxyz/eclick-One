import {
  amountForQuantity,
  calculateDeliveryDate,
  selectProductPreference,
  type Client,
  type CommerceRepositories,
  type Inventory,
  type NewClient,
  type NewOrder,
  type NewPayment,
  type Order,
  type OrderStatusTransition,
  type Payment,
  type Product,
  type ProductPreference,
  type Province,
} from "@eclick-one/domain";

const seedProvinces: Province[] = [
  { id: "PA", codigo: "PA", nombre: "Panama", prefijo: "PA" },
  { id: "CH", codigo: "CH", nombre: "Chiriqui", prefijo: "CH" },
  { id: "CO", codigo: "CO", nombre: "Colon", prefijo: "CO" },
  { id: "OC", codigo: "OC", nombre: "Cocle", prefijo: "OC" },
];

const seedClients: Client[] = [
  {
    codigo_cliente: 1,
    nombre: "Ana",
    apellido: "Morales",
    identificacion: "8-000-001",
    provincia: seedProvinces[0]!,
    tipo_tarjeta: "CR",
    paz_y_salvo: true,
  },
  {
    codigo_cliente: 2,
    nombre: "Carlos",
    apellido: "Rios",
    identificacion: "4-000-002",
    provincia: seedProvinces[1]!,
    tipo_tarjeta: "DB",
    paz_y_salvo: true,
  },
  {
    codigo_cliente: 3,
    nombre: "Lucia",
    apellido: "Castillo",
    identificacion: "3-000-003",
    provincia: seedProvinces[2]!,
    tipo_tarjeta: "CR",
    paz_y_salvo: false,
  },
];

const seedProducts: Product[] = [
  { codigo_producto: 1000, nombre: "Academic Laptop", categoria: "Technology", activo: true },
  { codigo_producto: 1001, nombre: "Ergonomic Chair", categoria: "Office", activo: true },
  { codigo_producto: 1002, nombre: "Laser Printer", categoria: "Technology", activo: true },
  { codigo_producto: 1003, nombre: "Stationery Kit", categoria: "Office", activo: true },
];

const seedInventory: Inventory[] = [
  { codigo_producto: 1000, cant_ventas: 19, cant_bodega: 34, cant_reservado: 4, nivel_reposicion: 12 },
  { codigo_producto: 1001, cant_ventas: 14, cant_bodega: 18, cant_reservado: 6, nivel_reposicion: 10 },
  { codigo_producto: 1002, cant_ventas: 11, cant_bodega: 8, cant_reservado: 3, nivel_reposicion: 10 },
  { codigo_producto: 1003, cant_ventas: 7, cant_bodega: 24, cant_reservado: 2, nivel_reposicion: 5 },
];

const seedOrders: Order[] = [
  {
    codigo_pedido: "PA-SYN-0001",
    codigo_cliente: 1,
    codigo_producto: 1000,
    cantidad: 2,
    monto: amountForQuantity(2),
    etiqueta: "pedido-web",
    direccion: "Synthetic address 101, Panama",
    fecha_pedido: "2024-12-29T14:00:00.000Z",
    fecha_entrega: "2024-12-31T15:00:00.000Z",
    estado: "facturado",
    tipo_duracion: "48h",
    pagado: true,
  },
  {
    codigo_pedido: "PA-SYN-0002",
    codigo_cliente: 1,
    codigo_producto: 1000,
    cantidad: 1,
    monto: amountForQuantity(1),
    etiqueta: "pedido-web",
    direccion: "Synthetic address 102, Panama",
    fecha_pedido: "2024-12-30T10:00:00.000Z",
    fecha_entrega: "2025-01-01T11:00:00.000Z",
    estado: "entregado",
    tipo_duracion: "48h",
    pagado: true,
  },
  {
    codigo_pedido: "PA-SYN-0003",
    codigo_cliente: 1,
    codigo_producto: 1000,
    cantidad: 3,
    monto: amountForQuantity(3),
    etiqueta: "pedido-web",
    direccion: "Synthetic address 103, Panama",
    fecha_pedido: "2024-12-31T12:00:00.000Z",
    estado: "proceso",
    tipo_duracion: "48h",
    pagado: false,
  },
  {
    codigo_pedido: "CH-SYN-0004",
    codigo_cliente: 2,
    codigo_producto: 1001,
    cantidad: 1,
    monto: amountForQuantity(1),
    etiqueta: "pedido-web",
    direccion: "Synthetic address 202, Chiriqui",
    fecha_pedido: "2024-12-30T16:00:00.000Z",
    estado: "proceso",
    tipo_duracion: "48h",
    pagado: false,
  },
  {
    codigo_pedido: "CO-SYN-0005",
    codigo_cliente: 3,
    codigo_producto: 1002,
    cantidad: 2,
    monto: amountForQuantity(2),
    etiqueta: "pedido-web",
    direccion: "Synthetic address 303, Colon",
    fecha_pedido: "2024-12-31T18:00:00.000Z",
    fecha_entrega: "2025-01-02T18:00:00.000Z",
    estado: "generado",
    tipo_duracion: "48h",
    pagado: false,
  },
];

const seedPayments: Payment[] = [
  {
    id_pago: 1,
    codigo_pedido: "PA-SYN-0001",
    monto_pagado: 70,
    tipo_tarjeta: "CR",
    fecha_pago: "2024-12-29T15:00:00.000Z",
    referencia: "SYN-PAY-001",
  },
  {
    id_pago: 2,
    codigo_pedido: "PA-SYN-0002",
    monto_pagado: 50,
    tipo_tarjeta: "DB",
    fecha_pago: "2024-12-30T11:00:00.000Z",
    referencia: "SYN-PAY-002",
  },
];

export class MockCommerceRepository implements CommerceRepositories {
  private readonly provinces = structuredClone(seedProvinces);
  private readonly clients = structuredClone(seedClients);
  private readonly products = structuredClone(seedProducts);
  private readonly inventory = structuredClone(seedInventory);
  private readonly orders = structuredClone(seedOrders);
  private readonly payments = structuredClone(seedPayments);

  async listProvinces(): Promise<readonly Province[]> {
    return structuredClone(this.provinces);
  }

  async listClients(): Promise<readonly Client[]> {
    return structuredClone(this.clients);
  }

  async findClientByCode(code: number): Promise<Client | null> {
    return structuredClone(this.clients.find((client) => client.codigo_cliente === code) ?? null);
  }

  async createClient(input: NewClient): Promise<Client> {
    const nextCode = Math.max(...this.clients.map((client) => client.codigo_cliente), 0) + 1;
    const client: Client = {
      codigo_cliente: nextCode,
      nombre: input.nombre,
      apellido: input.apellido,
      identificacion: input.identificacion,
      provincia: structuredClone(input.provincia),
      tipo_tarjeta: input.tipo_tarjeta,
      paz_y_salvo: input.paz_y_salvo,
      ...(input.email ? { email: input.email } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
    };
    this.clients.push(client);
    return structuredClone(client);
  }

  async getClientPreference(code: number): Promise<ProductPreference | null> {
    const requests = this.orders
      .filter((order) => order.codigo_cliente === code)
      .map((order) => ({ codigo_producto: order.codigo_producto, cantidad: order.cantidad }));
    return selectProductPreference(requests);
  }

  async listProducts(): Promise<readonly Product[]> {
    return structuredClone(this.products);
  }

  async listInventory(): Promise<readonly Inventory[]> {
    return structuredClone(this.inventory);
  }

  async listOrders(): Promise<readonly Order[]> {
    return structuredClone(this.orders);
  }

  async listCurrentOrders(): Promise<readonly Order[]> {
    return structuredClone(
      this.orders.filter((order) => order.estado === "generado" || order.estado === "proceso"),
    );
  }

  async createOrder(input: NewOrder): Promise<Order> {
    const client = this.clients.find((item) => item.codigo_cliente === input.codigo_cliente);
    if (!client) {
      throw new Error("Client does not exist.");
    }
    const product = this.products.find((item) => item.codigo_producto === input.codigo_producto);
    if (!product) {
      throw new Error("Product does not exist.");
    }
    const nextSequence = nextOrderSequence(this.orders, client.provincia.prefijo);
    const order: Order = {
      codigo_pedido: `${client.provincia.prefijo}-SYN-${String(nextSequence).padStart(4, "0")}`,
      codigo_cliente: input.codigo_cliente,
      codigo_producto: input.codigo_producto,
      cantidad: input.cantidad,
      monto: amountForQuantity(input.cantidad),
      etiqueta: input.etiqueta,
      direccion: input.direccion,
      fecha_pedido: input.fecha_pedido,
      ...(input.fecha_entrega ? { fecha_entrega: input.fecha_entrega } : {}),
      estado: "generado",
      tipo_duracion: input.tipo_duracion,
      pagado: false,
    };
    this.orders.push(order);
    return structuredClone(order);
  }

  async transitionOrderStatus(input: OrderStatusTransition): Promise<Order> {
    const order = this.orders.find((item) => item.codigo_pedido === input.codigo_pedido);
    if (!order) {
      throw new Error("Order does not exist.");
    }
    order.estado = input.estado;
    if (input.estado === "entregado" && !order.fecha_entrega) {
      const payment = [...this.payments].reverse().find((item) => item.codigo_pedido === order.codigo_pedido);
      if (payment) {
        order.fecha_entrega = calculateDeliveryDate(payment.fecha_pago);
      }
    }
    return structuredClone(order);
  }

  async listPayments(): Promise<readonly Payment[]> {
    return structuredClone(this.payments);
  }

  async recordPayment(input: NewPayment): Promise<Payment> {
    const nextId = Math.max(...this.payments.map((payment) => payment.id_pago), 0) + 1;
    const payment: Payment = {
      id_pago: nextId,
      codigo_pedido: input.codigo_pedido,
      monto_pagado: input.monto_pagado,
      fecha_pago: input.fecha_pago,
      tipo_tarjeta: input.tipo_tarjeta,
      ...(input.referencia ? { referencia: input.referencia } : {}),
    };
    this.payments.push(payment);
    const order = this.orders.find((item) => item.codigo_pedido === input.codigo_pedido);
    if (order) {
      order.pagado = true;
      if (order.estado === "generado") {
        order.estado = "proceso";
        if (!order.fecha_entrega) {
          order.fecha_entrega = calculateDeliveryDate(input.fecha_pago);
        }
      }
    }
    return structuredClone(payment);
  }
}

function nextOrderSequence(orders: readonly Order[], prefix: string): number {
  const codes = orders
    .filter((order) => order.codigo_pedido.startsWith(`${prefix}-SYN-`))
    .map((order) => Number(order.codigo_pedido.slice(`${prefix}-SYN-`.length)));
  return Math.max(...codes, 0) + 1;
}
