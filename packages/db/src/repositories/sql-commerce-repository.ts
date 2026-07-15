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
  ProductPreference,
  Province,
} from "@eclick-one/domain";
import sql, { type ConnectionPool, type Request, type Transaction } from "mssql";
import type { AzureSqlClient } from "../client/azure-sql-client";

type SqlRow = Record<string, unknown>;

export class SqlProcedureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SqlProcedureError";
  }
}

/**
 * Azure SQL adapter for the academic schema.
 *
 * Business writes deliberately cross the stored-procedure boundary. This keeps
 * code generation, payment dates, inventory movement, history and trigger
 * enforcement inside SQL Server, where the schema owner maintains them.
 */
export class SqlCommerceRepository implements CommerceRepositories {
  constructor(private readonly client: AzureSqlClient) {}

  async listProvinces(): Promise<readonly Province[]> {
    const { recordset } = await (await this.client.getPool()).request().query<SqlRow>(
      "SELECT id_provincia, nombre, prefijo FROM dbo.PROVINCIA ORDER BY nombre",
    );
    return recordset.map((row) => ({
      id: String(required(row, "id_provincia")),
      codigo: String(required(row, "prefijo")),
      nombre: String(required(row, "nombre")),
      prefijo: String(required(row, "prefijo")),
    }));
  }

  async listClients(): Promise<readonly Client[]> {
    const { recordset } = await (await this.client.getPool()).request().query<SqlRow>(CLIENTS_QUERY);
    return recordset.map(mapClient);
  }

  async findClientByCode(code: number): Promise<Client | null> {
    const { recordset } = await (await this.client.getPool()).request().input("id_cliente", code).query<SqlRow>(
      `${CLIENTS_QUERY} WHERE c.id_cliente = @id_cliente`,
    );
    return recordset[0] ? mapClient(recordset[0]) : null;
  }

  async createClient(input: NewClient): Promise<Client> {
    const idProvincia = parseProvinceId(input.provincia);
    const request = (await this.client.getPool())
      .request()
      .input("nombre", input.nombre)
      .input("apellido", input.apellido)
      .input("tipo_identificacion", identificationType(input.identificacion))
      .input("numero_identificacion", identificationNumber(input.identificacion))
      .input("id_provincia", idProvincia);
    const result = await executeProcedure(request, "dbo.p_registrar_o_buscar_cliente");
    const idCliente = resultId(result.recordset[0], ["id_cliente", "codigo_cliente"]);
    if (idCliente === null) {
      throw new Error("dbo.p_registrar_o_buscar_cliente did not return id_cliente.");
    }

    // The database owns card registration, so silently inventing a number would
    // corrupt data. The UI may provide a fictional/test number explicitly.
    if (input.numero_tarjeta) {
      await executeProcedure(
        (await this.client.getPool()).request()
          .input("id_cliente", idCliente)
          .input("numero_tarjeta", input.numero_tarjeta)
          .input("tipo_tarjeta", input.tipo_tarjeta),
        "dbo.p_registrar_tarjeta",
      );
    }
    return this.requireClient(idCliente);
  }

  async getClientPreference(code: number): Promise<ProductPreference | null> {
    const result = await executeProcedure(
      (await this.client.getPool()).request().input("id_cliente", code),
      "dbo.p_preferencia_cliente",
    );
    const row = result.recordset[0];
    if (!row) return null;
    const product = resultId(row, ["id_producto", "codigo_producto"]);
    if (product === null) return null;
    return {
      codigo_producto: product,
      cant_solicitudes: numberValue(row, ["cant_solicitudes", "cantidad_pedidos", "pedidos"], 0),
      cantidad_total: numberValue(row, ["cantidad_total", "total_unidades", "cantidad"], 0),
    };
  }

  async listProducts(): Promise<readonly Product[]> {
    const { recordset } = await (await this.client.getPool()).request().query<SqlRow>(
      "SELECT id_producto, nombre, activo FROM dbo.PRODUCTO ORDER BY id_producto",
    );
    return recordset.map((row) => ({
      codigo_producto: numberValue(row, ["id_producto"]),
      nombre: String(required(row, "nombre")),
      // PRODUCTO has no category in the supplied schema. Keep a stable label
      // so the existing UI remains compatible without fabricating categories.
      categoria: "General",
      activo: booleanValue(row, "activo", true),
    }));
  }

  async listInventory(): Promise<readonly Inventory[]> {
    const { recordset } = await (await this.client.getPool()).request().query<SqlRow>(
      "SELECT id_producto, cantidad_ventas, cantidad_bodega, cantidad_reservada FROM dbo.INVENTARIO ORDER BY id_producto",
    );
    return recordset.map((row) => ({
      codigo_producto: numberValue(row, ["id_producto"]),
      cant_ventas: numberValue(row, ["cantidad_ventas"]),
      cant_bodega: numberValue(row, ["cantidad_bodega"]),
      cant_reservado: numberValue(row, ["cantidad_reservada"]),
    }));
  }

  async listOrders(): Promise<readonly Order[]> {
    const { recordset } = await (await this.client.getPool()).request().query<SqlRow>(
      "SELECT * FROM dbo.vw_historial_pedidos ORDER BY fecha_solicitud DESC",
    );
    return uniqueOrders(recordset.map(mapOrder));
  }

  async listCurrentOrders(): Promise<readonly Order[]> {
    const { recordset } = await (await this.client.getPool()).request().query<SqlRow>(
      "SELECT * FROM dbo.vw_pedidos_actuales ORDER BY fecha_solicitud DESC",
    );
    return uniqueOrders(recordset.map(mapOrder));
  }

  async createOrder(input: NewOrder): Promise<Order> {
    const contractId = await this.findActiveContract(input.codigo_cliente);
    const transaction = new sql.Transaction(await this.client.getPool());
    try {
      await transaction.begin();
      const created = await executeProcedure(
        transaction.request()
          .input("id_contrato", contractId)
          .input("direccion_entrega", input.direccion)
          .input("id_pedido_anterior", sql.Int, null),
        "dbo.p_crear_pedido",
      );
      const idPedido = resultId(created.recordset[0], ["id_pedido"]);
      const codigo = stringValue(created.recordset[0], ["codigo_pedido"]);
      if (idPedido === null && !codigo) {
        throw new Error("dbo.p_crear_pedido did not return the created order identifier.");
      }
      const detailId = idPedido ?? await this.findOrderIdByCode(transaction, codigo!);
      await executeProcedure(
        transaction.request()
          .input("id_pedido", detailId)
          .input("id_producto", input.codigo_producto)
          .input("cantidad", input.cantidad),
        "dbo.p_agregar_detalle_pedido",
      );
      const createdCode = codigo ?? await this.findOrderCodeById(transaction, detailId);
      await transaction.commit();
      return this.requireOrder(createdCode);
    } catch (error) {
      await transaction.rollback().catch(() => {});
      throw error;
    }
  }

  async transitionOrderStatus(input: OrderStatusTransition): Promise<Order> {
    const pool = await this.client.getPool();
    const idPedido = await this.findOrderIdByCode(pool, input.codigo_pedido);
    await executeProcedure(
      pool.request()
        .input("id_pedido", idPedido)
        .input("nuevo_estado", input.estado)
        .input("observacion", sql.NVarChar(250), null),
      "dbo.p_cambiar_estado_pedido",
    );
    return this.requireOrder(input.codigo_pedido);
  }

  async listPayments(): Promise<readonly Payment[]> {
    const { recordset } = await (await this.client.getPool()).request().query<SqlRow>(
      "SELECT * FROM dbo.vw_pagos_clientes ORDER BY fecha_pago DESC, id_pago DESC",
    );
    return uniquePayments(recordset.map(mapPayment));
  }

  async recordPayment(input: NewPayment): Promise<Payment> {
    const order = await this.requireOrder(input.codigo_pedido);
    const client = await this.requireClient(order.codigo_cliente);
    const cardId = await this.findActiveCard(client.codigo_cliente, input.tipo_tarjeta);
    const pool = await this.client.getPool();
    const result = await executeProcedure(
      pool.request()
        .input("id_pedido", await this.findOrderIdByCode(pool, input.codigo_pedido))
        .input("id_plan", await this.findPlanId(order.codigo_cliente))
        .input("id_tarjeta", cardId)
        .input("monto", input.monto_pagado)
        .input("fecha_pago", new Date(input.fecha_pago)),
      "dbo.p_registrar_pago",
    );
    const row = result.recordset[0];
    const idPago = resultId(row, ["id_pago"]);
    if (idPago !== null) {
      const payment = (await this.listPayments()).find((item) => item.id_pago === idPago);
      if (payment) return payment;
    }
    const payment = (await this.listPayments()).find((item) => item.codigo_pedido === input.codigo_pedido);
    if (!payment) throw new Error("dbo.p_registrar_pago completed without a readable payment result.");
    return payment;
  }

  private async requireClient(code: number): Promise<Client> {
    const client = await (await this.client.getPool()).request().input("id_cliente", code).query<SqlRow>(
      `${CLIENTS_QUERY} WHERE c.id_cliente = @id_cliente`,
    );
    if (!client.recordset[0]) throw new Error(`Client ${code} was not found after SQL operation.`);
    return mapClient(client.recordset[0]);
  }

  private async findActiveContract(clientCode: number): Promise<number> {
    const result = await (await this.client.getPool()).request().input("id_cliente", clientCode).query<SqlRow>(
      "SELECT TOP 1 id_contrato FROM dbo.CONTRATO WHERE id_cliente = @id_cliente AND activo = 1 ORDER BY fecha_inicio DESC, id_contrato DESC",
    );
    const id = resultId(result.recordset[0], ["id_contrato"]);
    if (id === null) throw new Error("The client has no active contract.");
    return id;
  }

  private async findActiveCard(clientCode: number, type: string): Promise<number> {
    const result = await (await this.client.getPool()).request()
      .input("id_cliente", clientCode)
      .input("tipo_tarjeta", type)
      .query<SqlRow>("SELECT TOP 1 id_tarjeta FROM dbo.TARJETA WHERE id_cliente = @id_cliente AND tipo_tarjeta = @tipo_tarjeta AND activa = 1 ORDER BY id_tarjeta DESC");
    const id = resultId(result.recordset[0], ["id_tarjeta"]);
    if (id === null) throw new Error("The client has no active card of the requested type.");
    return id;
  }

  private async findPlanId(clientCode: number): Promise<number> {
    const result = await (await this.client.getPool()).request().input("id_cliente", clientCode).query<SqlRow>(
      "SELECT TOP 1 c.id_plan FROM dbo.CONTRATO c WHERE c.id_cliente = @id_cliente AND c.activo = 1 ORDER BY c.fecha_inicio DESC, c.id_contrato DESC",
    );
    const id = resultId(result.recordset[0], ["id_plan"]);
    if (id === null) throw new Error("The client has no active plan.");
    return id;
  }

  private async findOrderIdByCode(source: ConnectionPool | Transaction, code: string): Promise<number> {
    const result = await source.request().input("codigo_pedido", code).query<SqlRow>(
      "SELECT id_pedido FROM dbo.PEDIDO WHERE codigo_pedido = @codigo_pedido",
    );
    const id = resultId(result.recordset[0], ["id_pedido"]);
    if (id === null) throw new Error(`Order ${code} was not found.`);
    return id;
  }

  private async findOrderCodeById(source: ConnectionPool | Transaction, id: number): Promise<string> {
    const result = await source.request().input("id_pedido", id).query<SqlRow>(
      "SELECT codigo_pedido FROM dbo.PEDIDO WHERE id_pedido = @id_pedido",
    );
    const code = stringValue(result.recordset[0], ["codigo_pedido"]);
    if (!code) throw new Error(`Order ${id} was not assigned codigo_pedido.`);
    return code;
  }

  private async requireOrder(code: string): Promise<Order> {
    const pool = await this.client.getPool();
    for (const view of ["dbo.vw_pedidos_actuales", "dbo.vw_historial_pedidos"]) {
      const result = await pool.request().input("codigo_pedido", code).query<SqlRow>(
        `SELECT TOP 1 * FROM ${view} WHERE codigo_pedido = @codigo_pedido ORDER BY fecha_solicitud DESC`,
      );
      if (result.recordset[0]) return mapOrder(result.recordset[0]);
    }
    throw new Error(`Order ${code} was not found after SQL operation.`);
  }
}

const CLIENTS_QUERY = `
SELECT
  c.id_cliente,
  c.nombre,
  c.apellido,
  c.tipo_identificacion,
  c.numero_identificacion,
  p.id_provincia,
  p.nombre AS provincia_nombre,
  p.prefijo AS provincia_prefijo,
  COALESCE(card.tipo_tarjeta, 'DB') AS tipo_tarjeta,
  CAST(CASE WHEN EXISTS (
    SELECT 1
    FROM dbo.CONTRATO ct
    JOIN dbo.PEDIDO pd ON pd.id_contrato = ct.id_contrato
    WHERE ct.id_cliente = c.id_cliente
      AND pd.estado <> 'CANCELADO'
      AND NOT EXISTS (
        SELECT 1 FROM dbo.PAGO pg
        WHERE pg.id_pedido = pd.id_pedido AND pg.estado_pago = 'APROBADO'
      )
  ) THEN 0 ELSE 1 END AS bit) AS paz_y_salvo
FROM dbo.CLIENTE c
JOIN dbo.PROVINCIA p ON p.id_provincia = c.id_provincia
OUTER APPLY (
  SELECT TOP 1 t.tipo_tarjeta
  FROM dbo.TARJETA t
  WHERE t.id_cliente = c.id_cliente AND t.activa = 1
  ORDER BY t.id_tarjeta DESC
) card`;

async function executeProcedure(request: Request, name: string) {
  try {
    return await request.execute(name);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SqlProcedureError(message.slice(0, 500));
  }
}

function mapClient(row: SqlRow): Client {
  return {
    codigo_cliente: numberValue(row, ["id_cliente", "codigo_cliente"]),
    nombre: String(required(row, "nombre")),
    apellido: String(required(row, "apellido")),
    identificacion: `${String(row.tipo_identificacion ?? "")}:${String(row.numero_identificacion ?? row.identificacion ?? "")}`,
    provincia: {
      id: String(required(row, "id_provincia", "provincia_codigo")),
      codigo: String(required(row, "provincia_prefijo", "prefijo")),
      nombre: String(required(row, "provincia_nombre")),
      prefijo: String(required(row, "provincia_prefijo", "prefijo")),
    },
    tipo_tarjeta: cardType(row.tipo_tarjeta),
    paz_y_salvo: booleanValue(row, "paz_y_salvo", true),
  };
}

function mapOrder(row: SqlRow): Order {
  const requested = numberValue(row, ["cantidad", "total_unidades"], 1);
  const date = dateValue(row, ["fecha_solicitud", "fecha_pedido"]);
  return {
    codigo_pedido: String(required(row, "codigo_pedido")),
    codigo_cliente: numberValue(row, ["id_cliente", "codigo_cliente"]),
    codigo_producto: numberValue(row, ["id_producto", "codigo_producto"], 0),
    cantidad: requested,
    monto: numberValue(row, ["monto_esperado", "monto", "monto_pagado"], 0),
    etiqueta: String(row.etiqueta ?? row.id_etiqueta ?? "pedido"),
    direccion: String(required(row, "direccion_entrega", "direccion")),
    fecha_pedido: date.toISOString(),
    ...(row.fecha_entrega == null ? {} : { fecha_entrega: new Date(String(row.fecha_entrega)).toISOString() }),
    estado: orderStatus(row.estado ?? row.estado_nuevo),
    tipo_duracion: String(row.tipo_duracion ?? row.plan_nombre ?? row.nombre_plan ?? "plan"),
    pagado: row.pagado == null ? paymentState(row) : Boolean(row.pagado),
  };
}

function mapPayment(row: SqlRow): Payment {
  return {
    id_pago: numberValue(row, ["id_pago"]),
    codigo_pedido: String(required(row, "codigo_pedido")),
    monto_pagado: numberValue(row, ["monto", "monto_pagado"]),
    fecha_pago: dateValue(row, ["fecha_pago"]).toISOString(),
    tipo_tarjeta: cardType(row.tipo_tarjeta),
    ...(row.referencia == null ? {} : { referencia: String(row.referencia) }),
  };
}

function uniqueOrders(orders: readonly Order[]): readonly Order[] {
  return [...new Map(orders.map((order) => [order.codigo_pedido, order])).values()];
}

function uniquePayments(payments: readonly Payment[]): readonly Payment[] {
  return [...new Map(payments.map((payment) => [payment.id_pago, payment])).values()];
}

function parseProvinceId(province: Province): number {
  const id = Number(province.id);
  if (!Number.isInteger(id) || id < 1) throw new Error("provincia.id must contain the numeric id_provincia.");
  return id;
}

function identificationType(value: string): string {
  const [type] = value.split(":", 2);
  return type?.trim().toUpperCase() === "PASAPORTE" ? "PASAPORTE" : "CEDULA";
}

function identificationNumber(value: string): string {
  const parts = value.split(":", 2);
  return (parts.length === 2 ? parts[1] : parts[0])!.trim();
}

function resultId(row: SqlRow | undefined, keys: readonly string[]): number | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && Number.isInteger(Number(value))) return Number(value);
  }
  return null;
}

function stringValue(row: SqlRow | undefined, keys: readonly string[]): string | null {
  if (!row) return null;
  for (const key of keys) if (row[key] !== undefined && row[key] !== null) return String(row[key]);
  return null;
}

function required(row: SqlRow, ...keys: string[]): unknown {
  for (const key of keys) if (row[key] !== undefined && row[key] !== null) return row[key];
  throw new Error(`SQL result is missing required column: ${keys.join(" or ")}.`);
}

function numberValue(row: SqlRow, keys: readonly string[], fallback = 0): number {
  const value = keys.map((key) => row[key]).find((item) => item !== undefined && item !== null);
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function booleanValue(row: SqlRow, key: string, fallback: boolean): boolean {
  const value = row[key];
  if (value === undefined || value === null) return fallback;
  return value === true || value === 1 || value === "1" || value === "true";
}

function dateValue(row: SqlRow, keys: readonly string[]): Date {
  const value = keys.map((key) => row[key]).find((item) => item !== undefined && item !== null);
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error(`SQL result contains an invalid date for ${keys.join(" or ")}.`);
  return date;
}

function cardType(value: unknown): Client["tipo_tarjeta"] {
  return String(value).toUpperCase() === "CR" ? "CR" : "DB";
}

function orderStatus(value: unknown): Order["estado"] {
  const status = String(value).toLowerCase();
  if (status === "proceso" || status === "entregado" || status === "cancelado" || status === "facturado") return status;
  return "generado";
}

function paymentState(row: SqlRow): boolean {
  return String(row.estado_pago ?? "").toUpperCase() === "APROBADO";
}
