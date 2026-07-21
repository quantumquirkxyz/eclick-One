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
  province("PA", "Panama"),
  province("CH", "Chiriqui"),
  province("CO", "Colon"),
  province("OC", "Cocle"),
  province("HE", "Herrera"),
  province("LS", "Los Santos"),
  province("VE", "Veraguas"),
  province("BT", "Bocas del Toro"),
  province("DA", "Darien"),
  province("WP", "West Panama"),
];

const seedClients: Client[] = [
  client(1, "Ana", "Morales", "8-000-001", "PA", "CR", true, "ana.morales@demo.eclick.one", "+507 6000-1001"),
  client(2, "Carlos", "Rios", "4-000-002", "CH", "DB", true, "carlos.rios@demo.eclick.one", "+507 6000-1002"),
  client(3, "Lucia", "Castillo", "3-000-003", "CO", "CR", false, "lucia.castillo@demo.eclick.one", "+507 6000-1003"),
  client(4, "Miguel", "Santos", "7-000-004", "OC", "DB", true, "miguel.santos@demo.eclick.one", "+507 6000-1004"),
  client(5, "Patricia", "Gomez", "6-000-005", "HE", "CR", true, "patricia.gomez@demo.eclick.one", "+507 6000-1005"),
  client(6, "Javier", "Quintero", "5-000-006", "LS", "DB", false, "javier.quintero@demo.eclick.one", "+507 6000-1006"),
  client(7, "Mariela", "Pineda", "9-000-007", "VE", "CR", true, "mariela.pineda@demo.eclick.one", "+507 6000-1007"),
  client(8, "Roberto", "Diaz", "2-000-008", "BT", "DB", true, "roberto.diaz@demo.eclick.one", "+507 6000-1008"),
  client(9, "Elena", "Navarro", "1-000-009", "DA", "CR", false, "elena.navarro@demo.eclick.one", "+507 6000-1009"),
  client(10, "Tomas", "Peralta", "8-000-010", "WP", "DB", true, "tomas.peralta@demo.eclick.one", "+507 6000-1010"),
  client(11, "Daniela", "Sucre", "4-000-011", "PA", "CR", true, "daniela.sucre@demo.eclick.one", "+507 6000-1011"),
  client(12, "Ricardo", "Vega", "3-000-012", "CH", "DB", true, "ricardo.vega@demo.eclick.one", "+507 6000-1012"),
  client(13, "Sofia", "Mendoza", "7-000-013", "CO", "CR", false, "sofia.mendoza@demo.eclick.one", "+507 6000-1013"),
  client(14, "Andres", "Tejada", "6-000-014", "VE", "DB", true, "andres.tejada@demo.eclick.one", "+507 6000-1014"),
  client(15, "Beatriz", "Arauz", "5-000-015", "WP", "CR", true, "beatriz.arauz@demo.eclick.one", "+507 6000-1015"),
];

const seedProducts: Product[] = [
  product(1000, "Academic Laptop", "Technology"),
  product(1001, "Ergonomic Chair", "Office"),
  product(1002, "Laser Printer", "Technology"),
  product(1003, "Stationery Kit", "Office"),
  product(1004, "Point of Sale Tablet", "Technology"),
  product(1005, "Receipt Printer", "Retail"),
  product(1006, "Warehouse Scanner", "Logistics"),
  product(1007, "Thermal Labels Pack", "Logistics"),
  product(1008, "Router Mesh Pro", "Technology"),
  product(1009, "Smart Camera Dome", "Security"),
  product(1010, "Access Badge Reader", "Security"),
  product(1011, "Office Desk XL", "Office"),
  product(1012, "Inventory Shelving Kit", "Logistics"),
  product(1013, "Customer Welcome Bundle", "Retail"),
  product(1014, "Portable Payment Terminal", "Retail"),
  product(1015, "Solar UPS Backup", "Technology"),
  product(1016, "Door Sensor Pack", "Security"),
  product(1017, "Courier Tote Set", "Logistics"),
  product(1018, "Notebook Premium Set", "Office"),
  product(1019, "Smart Display Kiosk", "Retail"),
];

const seedInventory: Inventory[] = seedProducts.map((product, index) => ({
  codigo_producto: product.codigo_producto,
  cant_ventas: 6 + index * 2,
  cant_bodega: 18 + index * 3,
  cant_reservado: index % 4 === 0 ? 6 : (index % 5) + 1,
  nivel_reposicion: 6 + (index % 6),
}));

const seedOrders: Order[] = [
  order("PA-SYN-0001", 1, 1000, 2, "2026-03-03T14:00:00.000Z", "facturado", { fechaEntrega: "2026-03-05T14:00:00.000Z", pagado: true, etiqueta: "demo-enterprise-refresh", direccion: "Avenida Balboa 101, Panama" }),
  order("PA-SYN-0002", 11, 1004, 1, "2026-03-07T09:00:00.000Z", "entregado", { fechaEntrega: "2026-03-09T10:00:00.000Z", pagado: true, etiqueta: "new-customer-onboarding", direccion: "Costa del Este Torre 2, Panama" }),
  order("CH-SYN-0001", 2, 1001, 3, "2026-03-12T11:30:00.000Z", "proceso", { pagado: false, etiqueta: "branch-furniture-rollout", direccion: "Via Boquete Local 8, Chiriqui" }),
  order("CO-SYN-0001", 3, 1009, 1, "2026-03-14T15:45:00.000Z", "cancelado", { pagado: false, etiqueta: "security-audit-aborted", direccion: "Paseo Gorgas 5, Colon" }),
  order("OC-SYN-0001", 4, 1003, 5, "2026-03-18T08:15:00.000Z", "facturado", { fechaEntrega: "2026-03-20T08:15:00.000Z", pagado: true, etiqueta: "school-supplies-bulk", direccion: "Penonome Centro 44, Cocle" }),
  order("HE-SYN-0001", 5, 1011, 2, "2026-03-20T13:10:00.000Z", "entregado", { fechaEntrega: "2026-03-22T15:00:00.000Z", pagado: true, etiqueta: "backoffice-upgrade", direccion: "Chitre Plaza 12, Herrera" }),
  order("LS-SYN-0001", 6, 1014, 1, "2026-03-24T17:30:00.000Z", "generado", { pagado: false, etiqueta: "mobile-payments-pilot", direccion: "Las Tablas Mall 6, Los Santos" }),
  order("VE-SYN-0001", 7, 1012, 4, "2026-03-28T10:20:00.000Z", "proceso", { pagado: true, etiqueta: "warehouse-expansion-phase-1", direccion: "Santiago Logistica 3, Veraguas" }),
  order("BT-SYN-0001", 8, 1007, 6, "2026-04-01T09:40:00.000Z", "facturado", { fechaEntrega: "2026-04-03T09:40:00.000Z", pagado: true, etiqueta: "island-label-rollout", direccion: "Isla Colon Bodega 2, Bocas del Toro" }),
  order("DA-SYN-0001", 9, 1016, 2, "2026-04-04T14:55:00.000Z", "generado", { pagado: false, etiqueta: "border-sensor-deployment", direccion: "Meteti Oficina 1, Darien" }),
  order("WP-SYN-0001", 10, 1006, 3, "2026-04-07T07:30:00.000Z", "entregado", { fechaEntrega: "2026-04-09T07:30:00.000Z", pagado: true, etiqueta: "scanner-refresh-west", direccion: "Arraijan Hub 7, West Panama" }),
  order("PA-SYN-0003", 1, 1019, 1, "2026-04-11T11:05:00.000Z", "proceso", { pagado: true, etiqueta: "showroom-kiosk-upgrade", direccion: "Multiplaza Nivel 3, Panama" }),
  order("CH-SYN-0002", 12, 1008, 2, "2026-04-15T16:20:00.000Z", "facturado", { fechaEntrega: "2026-04-17T16:20:00.000Z", pagado: true, etiqueta: "mesh-network-rollout", direccion: "David Norte 88, Chiriqui" }),
  order("CO-SYN-0002", 13, 1013, 8, "2026-04-18T12:45:00.000Z", "cancelado", { pagado: false, etiqueta: "promo-bundles-pause", direccion: "Zona Libre Local 14, Colon" }),
  order("VE-SYN-0002", 14, 1017, 4, "2026-04-23T18:10:00.000Z", "proceso", { pagado: false, etiqueta: "courier-kit-replenishment", direccion: "Santiago Ruta 5, Veraguas" }),
  order("WP-SYN-0002", 15, 1005, 2, "2026-04-27T09:15:00.000Z", "facturado", { fechaEntrega: "2026-04-29T09:15:00.000Z", pagado: true, etiqueta: "checkout-lane-refresh", direccion: "Vista Alegre Caja 11, West Panama" }),
  order("HE-SYN-0002", 5, 1018, 7, "2026-05-02T10:50:00.000Z", "entregado", { fechaEntrega: "2026-05-04T10:50:00.000Z", pagado: true, etiqueta: "academy-notebook-promo", direccion: "Chitre Academico 9, Herrera" }),
  order("LS-SYN-0002", 6, 1010, 1, "2026-05-05T13:35:00.000Z", "proceso", { pagado: true, etiqueta: "badge-reader-rollout", direccion: "Las Tablas Torre A, Los Santos" }),
  order("BT-SYN-0002", 8, 1015, 1, "2026-05-08T08:05:00.000Z", "generado", { pagado: false, etiqueta: "backup-power-evaluation", direccion: "Bocas Centro Solar 4, Bocas del Toro" }),
  order("DA-SYN-0002", 9, 1002, 2, "2026-05-11T15:25:00.000Z", "facturado", { fechaEntrega: "2026-05-13T15:25:00.000Z", pagado: true, etiqueta: "print-center-setup", direccion: "Meteti Servicios 10, Darien" }),
  order("OC-SYN-0002", 4, 1000, 2, "2026-05-15T09:00:00.000Z", "entregado", { fechaEntrega: "2026-05-17T09:00:00.000Z", pagado: true, etiqueta: "student-lab-refresh", direccion: "Aguadulce Campus 2, Cocle" }),
  order("PA-SYN-0004", 11, 1014, 2, "2026-05-19T12:20:00.000Z", "proceso", { pagado: false, etiqueta: "retail-terminal-phase-2", direccion: "Obarrio Local 21, Panama" }),
  order("CH-SYN-0003", 2, 1016, 3, "2026-05-22T17:40:00.000Z", "generado", { pagado: false, etiqueta: "sensor-upgrade-rural", direccion: "Boquete Rural 17, Chiriqui" }),
  order("CO-SYN-0003", 3, 1006, 2, "2026-05-26T11:10:00.000Z", "cancelado", { pagado: false, etiqueta: "scanner-reassignment", direccion: "Cristobal Hub 4, Colon" }),
  order("WP-SYN-0003", 10, 1019, 1, "2026-05-29T14:00:00.000Z", "proceso", { pagado: true, etiqueta: "expo-kiosk-demo", direccion: "Arraijan Expo Hall 1, West Panama" }),
];

const seedPayments: Payment[] = [
  payment(1, "PA-SYN-0001", "2026-03-03T15:00:00.000Z", "CR", "SYN-PAY-001"),
  payment(2, "PA-SYN-0002", "2026-03-07T12:00:00.000Z", "DB", "SYN-PAY-002"),
  payment(3, "OC-SYN-0001", "2026-03-18T11:00:00.000Z", "CR", "SYN-PAY-003"),
  payment(4, "HE-SYN-0001", "2026-03-20T16:00:00.000Z", "DB", "SYN-PAY-004"),
  payment(5, "VE-SYN-0001", "2026-03-29T09:30:00.000Z", "CR", "SYN-PAY-005"),
  payment(6, "BT-SYN-0001", "2026-04-01T11:10:00.000Z", "DB", "SYN-PAY-006"),
  payment(7, "WP-SYN-0001", "2026-04-07T10:05:00.000Z", "CR", "SYN-PAY-007"),
  payment(8, "PA-SYN-0003", "2026-04-11T13:15:00.000Z", "CR", "SYN-PAY-008"),
  payment(9, "CH-SYN-0002", "2026-04-15T19:10:00.000Z", "DB", "SYN-PAY-009"),
  payment(10, "WP-SYN-0002", "2026-04-27T10:45:00.000Z", "CR", "SYN-PAY-010"),
  payment(11, "HE-SYN-0002", "2026-05-02T12:05:00.000Z", "DB", "SYN-PAY-011"),
  payment(12, "LS-SYN-0002", "2026-05-05T15:20:00.000Z", "CR", "SYN-PAY-012"),
  payment(13, "DA-SYN-0002", "2026-05-11T17:10:00.000Z", "DB", "SYN-PAY-013"),
  payment(14, "OC-SYN-0002", "2026-05-15T11:50:00.000Z", "CR", "SYN-PAY-014"),
  payment(15, "WP-SYN-0003", "2026-05-29T16:25:00.000Z", "DB", "SYN-PAY-015"),
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

function province(codigo: string, nombre: string): Province {
  return { id: codigo, codigo, nombre, prefijo: codigo };
}

function client(
  codigo_cliente: number,
  nombre: string,
  apellido: string,
  identificacion: string,
  provinciaCodigo: string,
  tipo_tarjeta: Client["tipo_tarjeta"],
  paz_y_salvo: boolean,
  email: string,
  phone: string,
): Client {
  const provincia = seedProvinces.find((item) => item.codigo === provinciaCodigo);
  if (!provincia) {
    throw new Error(`Unknown province seed: ${provinciaCodigo}`);
  }
  return {
    codigo_cliente,
    nombre,
    apellido,
    identificacion,
    provincia,
    tipo_tarjeta,
    paz_y_salvo,
    email,
    phone,
  };
}

function product(codigo_producto: number, nombre: string, categoria: string): Product {
  return { codigo_producto, nombre, categoria, activo: true };
}

function order(
  codigo_pedido: string,
  codigo_cliente: number,
  codigo_producto: number,
  cantidad: number,
  fecha_pedido: string,
  estado: Order["estado"],
  options: {
    fechaEntrega?: string;
    pagado: boolean;
    etiqueta: string;
    direccion: string;
    tipoDuracion?: string;
  },
): Order {
  return {
    codigo_pedido,
    codigo_cliente,
    codigo_producto,
    cantidad,
    monto: amountForQuantity(cantidad),
    etiqueta: options.etiqueta,
    direccion: options.direccion,
    fecha_pedido,
    ...(options.fechaEntrega ? { fecha_entrega: options.fechaEntrega } : {}),
    estado,
    tipo_duracion: options.tipoDuracion ?? "48h",
    pagado: options.pagado,
  };
}

function payment(
  id_pago: number,
  codigo_pedido: string,
  fecha_pago: string,
  tipo_tarjeta: Payment["tipo_tarjeta"],
  referencia: string,
): Payment {
  const linkedOrder = seedOrders.find((order) => order.codigo_pedido === codigo_pedido);
  if (!linkedOrder) {
    throw new Error(`Unknown order seed for payment: ${codigo_pedido}`);
  }
  return {
    id_pago,
    codigo_pedido,
    monto_pagado: linkedOrder.monto,
    fecha_pago,
    tipo_tarjeta,
    referencia,
  };
}
