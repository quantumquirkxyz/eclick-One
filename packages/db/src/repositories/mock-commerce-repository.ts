import type {
  Client,
  CommerceRepositories,
  Inventory,
  Order,
  Payment,
  Product,
  Province,
} from "@eclick-one/domain";

// Every value in this adapter is synthetic and exists only to exercise the MVP.
const provinces: readonly Province[] = [
  { id: "PA", codigo: "PA", nombre: "Panamá", prefijo: "PA" },
  { id: "CH", codigo: "CH", nombre: "Chiriquí", prefijo: "CH" },
  { id: "CO", codigo: "CO", nombre: "Colón", prefijo: "CO" },
  { id: "OC", codigo: "OC", nombre: "Coclé", prefijo: "OC" },
];

const clients: readonly Client[] = [
  {
    codigo_cliente: 1,
    nombre: "Ana",
    apellido: "Morales",
    identificacion: "8-000-001",
    provincia: provinces[0]!,
    tipo_tarjeta: "CR",
    paz_y_salvo: true,
  },
  {
    codigo_cliente: 2,
    nombre: "Carlos",
    apellido: "Ríos",
    identificacion: "4-000-002",
    provincia: provinces[1]!,
    tipo_tarjeta: "DB",
    paz_y_salvo: true,
  },
  {
    codigo_cliente: 3,
    nombre: "Lucía",
    apellido: "Castillo",
    identificacion: "3-000-003",
    provincia: provinces[2]!,
    tipo_tarjeta: "CR",
    paz_y_salvo: false,
  },
];

const products: readonly Product[] = [
  { codigo_producto: 1000, nombre: "Laptop Académica", categoria: "Tecnología", activo: true },
  { codigo_producto: 1001, nombre: "Silla Ergonómica", categoria: "Oficina", activo: true },
  { codigo_producto: 1002, nombre: "Impresora Láser", categoria: "Tecnología", activo: true },
  { codigo_producto: 1003, nombre: "Kit de Papelería", categoria: "Oficina", activo: true },
];

const inventory: readonly Inventory[] = [
  { codigo_producto: 1000, cant_ventas: 19, cant_bodega: 34, cant_reservado: 4, nivel_reposicion: 12 },
  { codigo_producto: 1001, cant_ventas: 14, cant_bodega: 18, cant_reservado: 6, nivel_reposicion: 10 },
  { codigo_producto: 1002, cant_ventas: 11, cant_bodega: 8, cant_reservado: 3, nivel_reposicion: 10 },
  { codigo_producto: 1003, cant_ventas: 7, cant_bodega: 24, cant_reservado: 2, nivel_reposicion: 5 },
];

const orders: readonly Order[] = [
  {
    codigo_pedido: "PA-SYN-0001",
    codigo_cliente: 1,
    codigo_producto: 1000,
    cantidad: 2,
    monto: 70,
    etiqueta: "pedido-web",
    direccion: "Dirección sintética 101, Panamá",
    fecha_pedido: "2024-12-29T14:00:00.000Z",
    fecha_entrega: "2024-12-31T14:00:00.000Z",
    estado: "facturado",
    tipo_duracion: "48h",
    pagado: true,
  },
  {
    codigo_pedido: "CH-SYN-0002",
    codigo_cliente: 2,
    codigo_producto: 1001,
    cantidad: 1,
    monto: 50,
    etiqueta: "pedido-web",
    direccion: "Dirección sintética 202, Chiriquí",
    fecha_pedido: "2024-12-30T16:00:00.000Z",
    estado: "proceso",
    tipo_duracion: "48h",
    pagado: false,
  },
  {
    codigo_pedido: "CO-SYN-0003",
    codigo_cliente: 1,
    codigo_producto: 1002,
    cantidad: 3,
    monto: 90,
    etiqueta: "pedido-web",
    direccion: "Dirección sintética 303, Colón",
    fecha_pedido: "2024-12-31T18:00:00.000Z",
    fecha_entrega: "2025-01-02T18:00:00.000Z",
    estado: "entregado",
    tipo_duracion: "48h",
    pagado: true,
  },
];

const payments: readonly Payment[] = [
  { id_pago: 1, codigo_pedido: "PA-SYN-0001", monto_pagado: 70, tipo_tarjeta: "CR", fecha_pago: "2024-12-29T15:00:00.000Z", referencia: "SYN-PAGO-001" },
  { id_pago: 2, codigo_pedido: "CO-SYN-0003", monto_pagado: 90, tipo_tarjeta: "DB", fecha_pago: "2024-12-31T18:15:00.000Z", referencia: "SYN-PAGO-002" },
];

export class MockCommerceRepository implements CommerceRepositories {
  async listProvinces(): Promise<readonly Province[]> {
    return structuredClone(provinces);
  }

  async listClients(): Promise<readonly Client[]> {
    return structuredClone(clients);
  }

  async findClientByCode(code: number): Promise<Client | null> {
    return structuredClone(clients.find((client) => client.codigo_cliente === code) ?? null);
  }

  async listProducts(): Promise<readonly Product[]> {
    return structuredClone(products);
  }

  async listInventory(): Promise<readonly Inventory[]> {
    return structuredClone(inventory);
  }

  async listOrders(): Promise<readonly Order[]> {
    return structuredClone(orders);
  }

  async listPayments(): Promise<readonly Payment[]> {
    return structuredClone(payments);
  }
}
