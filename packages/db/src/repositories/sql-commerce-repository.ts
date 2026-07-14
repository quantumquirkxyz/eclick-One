import type {
  Client,
  CommerceRepositories,
  Inventory,
  NewClient,
  NewOrder,
  NewPayment,
  Order,
  OrderStatusTransition,
  Payment,
  Product,
  Province,
} from "@eclick-one/domain";
import type { AzureSqlClient } from "../client/azure-sql-client";

type ProvinceRow = { code: string; name: string };
type ClientRow = { codigo_cliente: number; nombre: string; apellido: string; identificacion: string; provincia_codigo: string; provincia_nombre: string; provincia_prefijo: string; tipo_tarjeta: Client["tipo_tarjeta"]; paz_y_salvo: boolean };
type ProductRow = { codigo_producto: number; nombre: string; categoria: string; activo: boolean | null };
type InventoryRow = { codigo_producto: number; cant_ventas: number; cant_bodega: number; cant_reservado: number; nivel_reposicion: number | null };
type OrderRow = { codigo_pedido: string; codigo_cliente: number; codigo_producto: number; cantidad: number; monto: number; etiqueta: string; direccion: string; fecha_pedido: Date; fecha_entrega: Date | null; estado: Order["estado"]; tipo_duracion: string; pagado: boolean | null };
type PaymentRow = { id_pago: number; codigo_pedido: string; monto_pagado: number; fecha_pago: Date; tipo_tarjeta: Payment["tipo_tarjeta"]; referencia: string | null };

/** Read-only phase-one adapter for the stable views documented in docs/db-contract.md. */
export class SqlCommerceRepository implements CommerceRepositories {
  constructor(private readonly client: AzureSqlClient) {}

  async listProvinces(): Promise<readonly Province[]> {
    const pool = await this.client.getPool();
    const { recordset } = await pool.request().query<ProvinceRow>(
      "SELECT code, name FROM app.vw_provinces ORDER BY name",
    );
    return recordset.map((row) => ({
      id: row.code,
      codigo: row.code,
      nombre: row.name,
      prefijo: row.code,
    }));
  }

  async listClients(): Promise<readonly Client[]> {
    const pool = await this.client.getPool();
    const { recordset } = await pool.request().query<ClientRow>(
      "SELECT codigo_cliente, nombre, apellido, identificacion, provincia_codigo, provincia_nombre, provincia_prefijo, tipo_tarjeta, paz_y_salvo FROM app.vw_clients ORDER BY codigo_cliente",
    );
    return recordset.map(mapClient);
  }

  async findClientByCode(code: number): Promise<Client | null> {
    const pool = await this.client.getPool();
    const { recordset } = await pool
      .request()
      .input("code", code)
      .query<ClientRow>(
        "SELECT codigo_cliente, nombre, apellido, identificacion, provincia_codigo, provincia_nombre, provincia_prefijo, tipo_tarjeta, paz_y_salvo FROM app.vw_clients WHERE codigo_cliente = @code",
      );
    const row = recordset[0];
    return row ? mapClient(row) : null;
  }

  async createClient(_input: NewClient): Promise<Client> {
    throw new Error("Operación no disponible hasta integrar Azure SQL");
  }

  async getClientPreference(_code: number): Promise<import("@eclick-one/domain").ProductPreference | null> {
    throw new Error("Operación no disponible hasta integrar Azure SQL");
  }

  async listProducts(): Promise<readonly Product[]> {
    const pool = await this.client.getPool();
    const { recordset } = await pool.request().query<ProductRow>(
      "SELECT codigo_producto, nombre, categoria, activo FROM app.vw_products ORDER BY codigo_producto",
    );
    return recordset.map((row) => ({
      codigo_producto: row.codigo_producto,
      nombre: row.nombre,
      categoria: row.categoria,
      ...(row.activo === null ? {} : { activo: row.activo }),
    }));
  }

  async listInventory(): Promise<readonly Inventory[]> {
    const pool = await this.client.getPool();
    const { recordset } = await pool.request().query<InventoryRow>(
      "SELECT codigo_producto, cant_ventas, cant_bodega, cant_reservado, nivel_reposicion FROM app.vw_inventory ORDER BY codigo_producto",
    );
    return recordset.map((row) => ({
      codigo_producto: row.codigo_producto,
      cant_ventas: row.cant_ventas,
      cant_bodega: row.cant_bodega,
      cant_reservado: row.cant_reservado,
      ...(row.nivel_reposicion === null ? {} : { nivel_reposicion: row.nivel_reposicion }),
    }));
  }

  async listOrders(): Promise<readonly Order[]> {
    const pool = await this.client.getPool();
    const { recordset } = await pool.request().query<OrderRow>(
      "SELECT codigo_pedido, codigo_cliente, codigo_producto, cantidad, monto, etiqueta, direccion, fecha_pedido, fecha_entrega, estado, tipo_duracion, pagado FROM app.vw_orders ORDER BY fecha_pedido DESC",
    );
    return recordset.map((row) => ({
      codigo_pedido: row.codigo_pedido,
      codigo_cliente: row.codigo_cliente,
      codigo_producto: row.codigo_producto,
      cantidad: row.cantidad,
      monto: Number(row.monto),
      etiqueta: row.etiqueta,
      direccion: row.direccion,
      fecha_pedido: row.fecha_pedido.toISOString(),
      ...(row.fecha_entrega === null ? {} : { fecha_entrega: row.fecha_entrega.toISOString() }),
      estado: row.estado,
      tipo_duracion: row.tipo_duracion,
      ...(row.pagado === null ? {} : { pagado: row.pagado }),
    }));
  }

  async listCurrentOrders(): Promise<readonly Order[]> {
    const orders = await this.listOrders();
    return orders.filter((order) => order.estado === "generado" || order.estado === "proceso");
  }

  async createOrder(_input: NewOrder): Promise<Order> {
    throw new Error("Operación no disponible hasta integrar Azure SQL");
  }

  async transitionOrderStatus(_input: OrderStatusTransition): Promise<Order> {
    throw new Error("Operación no disponible hasta integrar Azure SQL");
  }

  async listPayments(): Promise<readonly Payment[]> {
    const pool = await this.client.getPool();
    const { recordset } = await pool.request().query<PaymentRow>(
      "SELECT id_pago, codigo_pedido, monto_pagado, fecha_pago, tipo_tarjeta, referencia FROM app.vw_payments ORDER BY fecha_pago DESC, id_pago DESC",
    );
    return recordset.map((row) => ({
      id_pago: row.id_pago,
      codigo_pedido: row.codigo_pedido,
      monto_pagado: Number(row.monto_pagado),
      fecha_pago: row.fecha_pago.toISOString(),
      tipo_tarjeta: row.tipo_tarjeta,
      ...(row.referencia === null ? {} : { referencia: row.referencia }),
    }));
  }

  async recordPayment(_input: NewPayment): Promise<Payment> {
    throw new Error("Operación no disponible hasta integrar Azure SQL");
  }
}

function mapClient(row: ClientRow): Client {
  return {
    codigo_cliente: row.codigo_cliente,
    nombre: row.nombre,
    apellido: row.apellido,
    identificacion: row.identificacion,
    provincia: {
      id: row.provincia_codigo,
      codigo: row.provincia_codigo,
      nombre: row.provincia_nombre,
      prefijo: row.provincia_prefijo,
    },
    tipo_tarjeta: row.tipo_tarjeta,
    paz_y_salvo: row.paz_y_salvo,
  };
}
