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
import {
  amountForQuantity,
  calculateDeliveryDate,
  selectProductPreference,
} from "@eclick-one/domain";
import type { Transaction } from "@libsql/client";
import type { TursoClient } from "../client/turso-client";

type SqlRow = Record<string, unknown>;

export class TursoRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TursoRepositoryError";
  }
}

export class TursoCommerceRepository implements CommerceRepositories {
  constructor(private readonly client: TursoClient) {}

  async listProvinces(): Promise<readonly Province[]> {
    const result = await this.client.execute(
      "SELECT id_provincia, nombre, prefijo FROM PROVINCIA ORDER BY nombre",
    );
    return result.rows.map((row) => ({
      id: String(required(row, "id_provincia")),
      codigo: String(required(row, "prefijo")),
      nombre: String(required(row, "nombre")),
      prefijo: String(required(row, "prefijo")),
    }));
  }

  async listClients(): Promise<readonly Client[]> {
    const result = await this.client.execute(CLIENTS_QUERY);
    return result.rows.map(mapClient);
  }

  async findClientByCode(code: number): Promise<Client | null> {
    const result = await this.client.execute({
      sql: `${CLIENTS_QUERY} WHERE c.id_cliente = ?`,
      args: [code],
    });
    return result.rows[0] ? mapClient(result.rows[0]) : null;
  }

  async createClient(input: NewClient): Promise<Client> {
    const tx = await this.client.transaction("write");
    try {
      const provinceId = parseProvinceId(input.provincia);
      const existing = await tx.execute({
        sql: `SELECT id_cliente
          FROM CLIENTE
          WHERE tipo_identificacion = ? AND numero_identificacion = ?
          LIMIT 1`,
        args: [identificationType(input.identificacion), identificationNumber(input.identificacion)],
      });
      let clientId = resultId(existing.rows[0], ["id_cliente"]);
      if (clientId === null) {
        await tx.execute({
          sql: `INSERT INTO CLIENTE (
            id_provincia, nombre, apellido, tipo_identificacion, numero_identificacion, activo
          ) VALUES (?, ?, ?, ?, ?, 1)`,
          args: [
            provinceId,
            input.nombre.trim(),
            input.apellido.trim(),
            identificationType(input.identificacion),
            identificationNumber(input.identificacion),
          ],
        });
        clientId = await lastInsertId(tx);
      }

      const cardNumber = normalizeCardNumber(input.numero_tarjeta, clientId);
      await tx.execute({
        sql: `INSERT OR IGNORE INTO TARJETA (id_cliente, numero_tarjeta, tipo_tarjeta, activa)
          VALUES (?, ?, ?, 1)`,
        args: [clientId, cardNumber, input.tipo_tarjeta],
      });
      await tx.commit();
      return await this.requireClient(clientId);
    } catch (error) {
      await safeRollback(tx);
      throw wrapError(error);
    } finally {
      tx.close();
    }
  }

  async getClientPreference(code: number): Promise<ProductPreference | null> {
    const result = await this.client.execute({
      sql: `SELECT d.id_producto, d.cantidad
        FROM DETALLE_PEDIDO d
        JOIN PEDIDO p ON p.id_pedido = d.id_pedido
        JOIN CONTRATO c ON c.id_contrato = p.id_contrato
        WHERE c.id_cliente = ?`,
      args: [code],
    });
    return selectProductPreference(
      result.rows.map((row) => ({
        codigo_producto: numberValue(row, ["id_producto"]),
        cantidad: numberValue(row, ["cantidad"]),
      })),
    );
  }

  async listProducts(): Promise<readonly Product[]> {
    const result = await this.client.execute(
      "SELECT id_producto, nombre, activo FROM PRODUCTO ORDER BY id_producto",
    );
    return result.rows.map((row) => ({
      codigo_producto: numberValue(row, ["id_producto"]),
      nombre: String(required(row, "nombre")),
      categoria: "General",
      activo: booleanValue(row, "activo", true),
    }));
  }

  async listInventory(): Promise<readonly Inventory[]> {
    const result = await this.client.execute(
      "SELECT id_producto, cantidad_ventas, cantidad_bodega, cantidad_reservada FROM INVENTARIO ORDER BY id_producto",
    );
    return result.rows.map((row) => ({
      codigo_producto: numberValue(row, ["id_producto"]),
      cant_ventas: numberValue(row, ["cantidad_ventas"]),
      cant_bodega: numberValue(row, ["cantidad_bodega"]),
      cant_reservado: numberValue(row, ["cantidad_reservada"]),
    }));
  }

  async listOrders(): Promise<readonly Order[]> {
    const result = await this.client.execute(ORDERS_QUERY);
    return result.rows.map(mapOrder);
  }

  async listCurrentOrders(): Promise<readonly Order[]> {
    const result = await this.client.execute({
      sql: `${ORDERS_QUERY} WHERE p.estado IN ('GENERADO', 'PROCESO')`,
    });
    return result.rows.map(mapOrder);
  }

  async createOrder(input: NewOrder): Promise<Order> {
    const tx = await this.client.transaction("write");
    try {
      const client = await this.requireClient(input.codigo_cliente);
      const product = await tx.execute({
        sql: `SELECT p.id_producto, p.nombre, i.cantidad_bodega, i.cantidad_reservada
          FROM PRODUCTO p
          JOIN INVENTARIO i ON i.id_producto = p.id_producto
          WHERE p.id_producto = ? AND p.activo = 1
          LIMIT 1`,
        args: [input.codigo_producto],
      });
      const productRow = product.rows[0];
      if (!productRow) throw new TursoRepositoryError("Product does not exist.");

      const available = numberValue(productRow, ["cantidad_bodega"]) - numberValue(productRow, ["cantidad_reservada"]);
      if (available < input.cantidad) {
        throw new TursoRepositoryError("No hay inventario suficiente para reservar ese producto.");
      }

      const plan = await this.requirePlanForQuantity(tx, input.cantidad);
      const contractId = await this.ensureActiveContract(tx, input.codigo_cliente, plan.id_plan, input.fecha_pedido);

      await tx.execute({
        sql: `INSERT INTO PEDIDO (
          id_contrato, id_pedido_anterior, fecha_solicitud, direccion_entrega, monto_esperado, estado
        ) VALUES (?, NULL, ?, ?, ?, 'GENERADO')`,
        args: [contractId, input.fecha_pedido, input.direccion.trim(), plan.precio],
      });
      const orderId = await lastInsertId(tx);
      const orderCode = `${client.provincia.prefijo}-${String(orderId).padStart(6, "0")}`;
      await tx.execute({
        sql: "UPDATE PEDIDO SET codigo_pedido = ? WHERE id_pedido = ?",
        args: [orderCode, orderId],
      });

      await tx.execute({
        sql: `INSERT INTO DETALLE_PEDIDO (id_pedido, id_producto, cantidad, precio_unitario)
          VALUES (?, ?, ?, ?)`,
        args: [orderId, input.codigo_producto, input.cantidad, 0],
      });
      await tx.execute({
        sql: "INSERT INTO ETIQUETA (id_pedido) VALUES (?)",
        args: [orderId],
      });
      await tx.execute({
        sql: `INSERT INTO HISTORIAL_PEDIDO (id_pedido, estado_anterior, estado_nuevo, observacion)
          VALUES (?, NULL, 'GENERADO', ?)`,
        args: [orderId, input.etiqueta.trim()],
      });
      await tx.execute({
        sql: `UPDATE INVENTARIO
          SET cantidad_reservada = cantidad_reservada + ?, fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id_producto = ?`,
        args: [input.cantidad, input.codigo_producto],
      });

      await tx.commit();
      return await this.requireOrder(orderCode);
    } catch (error) {
      await safeRollback(tx);
      throw wrapError(error);
    } finally {
      tx.close();
    }
  }

  async transitionOrderStatus(input: OrderStatusTransition): Promise<Order> {
    const tx = await this.client.transaction("write");
    try {
      const orderRow = await this.requireOrderRow(tx, input.codigo_pedido);
      const previous = String(required(orderRow, "estado"));
      const next = input.estado.toUpperCase();

      await tx.execute({
        sql: "UPDATE PEDIDO SET estado = ? WHERE id_pedido = ?",
        args: [next, numberValue(orderRow, ["id_pedido"])],
      });
      await tx.execute({
        sql: `INSERT INTO HISTORIAL_PEDIDO (id_pedido, estado_anterior, estado_nuevo)
          VALUES (?, ?, ?)`,
        args: [numberValue(orderRow, ["id_pedido"]), previous, next],
      });

      if (next === "CANCELADO") {
        await this.restoreInventory(tx, numberValue(orderRow, ["id_pedido"]));
      }
      if (next === "ENTREGADO") {
        await this.consumeInventory(tx, numberValue(orderRow, ["id_pedido"]));
      }

      await tx.commit();
      return await this.requireOrder(input.codigo_pedido);
    } catch (error) {
      await safeRollback(tx);
      throw wrapError(error);
    } finally {
      tx.close();
    }
  }

  async listPayments(): Promise<readonly Payment[]> {
    const result = await this.client.execute(
      "SELECT id_pago, codigo_pedido, monto, fecha_pago, tipo_tarjeta FROM vw_pagos_clientes ORDER BY fecha_pago DESC, id_pago DESC",
    );
    return result.rows.map(mapPayment);
  }

  async recordPayment(input: NewPayment): Promise<Payment> {
    const tx = await this.client.transaction("write");
    try {
      const orderRow = await this.requireOrderRow(tx, input.codigo_pedido);
      const orderId = numberValue(orderRow, ["id_pedido"]);
      const clientId = numberValue(orderRow, ["id_cliente"]);
      const expected = numberValue(orderRow, ["monto_esperado"]);
      if (expected !== input.monto_pagado) {
        throw new TursoRepositoryError("El monto pagado no corresponde al plan.");
      }

      const existingPayment = await tx.execute({
        sql: "SELECT id_pago FROM PAGO WHERE id_pedido = ? AND estado_pago = 'APROBADO' LIMIT 1",
        args: [orderId],
      });
      if (existingPayment.rows[0]) {
        throw new TursoRepositoryError("Order is already paid.");
      }

      const card = await tx.execute({
        sql: `SELECT id_tarjeta
          FROM TARJETA
          WHERE id_cliente = ? AND tipo_tarjeta = ? AND activa = 1
          ORDER BY id_tarjeta DESC
          LIMIT 1`,
        args: [clientId, input.tipo_tarjeta],
      });
      const cardId = resultId(card.rows[0], ["id_tarjeta"]);
      if (cardId === null) {
        throw new TursoRepositoryError("La tarjeta no pertenece al cliente o está inactiva.");
      }

      await tx.execute({
        sql: `INSERT INTO PAGO (id_pedido, id_tarjeta, fecha_pago, monto, estado_pago)
          VALUES (?, ?, ?, ?, 'APROBADO')`,
        args: [orderId, cardId, input.fecha_pago, input.monto_pagado],
      });
      const paymentId = await lastInsertId(tx);
      await tx.execute({
        sql: `UPDATE PEDIDO
          SET estado = 'PROCESO', fecha_entrega = ?
          WHERE id_pedido = ?`,
        args: [calculateDeliveryDate(input.fecha_pago), orderId],
      });
      await tx.execute({
        sql: `INSERT INTO HISTORIAL_PEDIDO (id_pedido, estado_anterior, estado_nuevo, observacion)
          VALUES (?, ?, 'PROCESO', 'Pago APROBADO')`,
        args: [orderId, String(required(orderRow, "estado"))],
      });

      await tx.commit();
      return await this.requirePayment(paymentId);
    } catch (error) {
      await safeRollback(tx);
      throw wrapError(error);
    } finally {
      tx.close();
    }
  }

  private async requireClient(code: number): Promise<Client> {
    const client = await this.findClientByCode(code);
    if (!client) throw new TursoRepositoryError(`Client ${code} was not found.`);
    return client;
  }

  private async requireOrder(code: string): Promise<Order> {
    const result = await this.client.execute({
      sql: `${ORDERS_QUERY} WHERE p.codigo_pedido = ? LIMIT 1`,
      args: [code],
    });
    if (!result.rows[0]) throw new TursoRepositoryError(`Order ${code} was not found.`);
    return mapOrder(result.rows[0]);
  }

  private async requirePayment(id: number): Promise<Payment> {
    const result = await this.client.execute({
      sql: `SELECT id_pago, codigo_pedido, monto, fecha_pago, tipo_tarjeta
        FROM vw_pagos_clientes
        WHERE id_pago = ?`,
      args: [id],
    });
    if (!result.rows[0]) throw new TursoRepositoryError(`Payment ${id} was not found.`);
    return mapPayment(result.rows[0]);
  }

  private async requirePlanForQuantity(
    tx: Transaction,
    quantity: number,
  ): Promise<{ id_plan: number; precio: number }> {
    const planResult = await tx.execute({
      sql: `SELECT id_plan, precio
        FROM PLAN_PEDIDO
        WHERE activo = 1
          AND cantidad_minima <= ?
          AND (cantidad_maxima IS NULL OR cantidad_maxima >= ?)
        ORDER BY cantidad_minima DESC
        LIMIT 1`,
      args: [quantity, quantity],
    });
    const row = planResult.rows[0];
    if (!row) {
      throw new TursoRepositoryError("Cantidad menor al mínimo o superior al máximo.");
    }
    return {
      id_plan: numberValue(row, ["id_plan"]),
      precio: numberValue(row, ["precio"], amountForQuantity(quantity)),
    };
  }

  private async ensureActiveContract(
    tx: Transaction,
    clientId: number,
    planId: number,
    startDate: string,
  ): Promise<number> {
    const active = await tx.execute({
      sql: `SELECT id_contrato, id_plan
        FROM CONTRATO
        WHERE id_cliente = ? AND activo = 1
        ORDER BY date(fecha_inicio) DESC, id_contrato DESC
        LIMIT 1`,
      args: [clientId],
    });
    const row = active.rows[0];
    if (row && numberValue(row, ["id_plan"]) === planId) {
      return numberValue(row, ["id_contrato"]);
    }
    await tx.execute({
      sql: "UPDATE CONTRATO SET activo = 0 WHERE id_cliente = ? AND activo = 1",
      args: [clientId],
    });
    await tx.execute({
      sql: `INSERT INTO CONTRATO (id_cliente, id_plan, fecha_inicio, activo)
        VALUES (?, ?, ?, 1)`,
      args: [clientId, planId, startDate.slice(0, 10)],
    });
    return await lastInsertId(tx);
  }

  private async requireOrderRow(tx: Transaction, orderCode: string): Promise<SqlRow> {
    const result = await tx.execute({
      sql: `SELECT
          p.id_pedido,
          p.codigo_pedido,
          p.estado,
          p.monto_esperado,
          c.id_cliente
        FROM PEDIDO p
        JOIN CONTRATO ct ON ct.id_contrato = p.id_contrato
        JOIN CLIENTE c ON c.id_cliente = ct.id_cliente
        WHERE p.codigo_pedido = ?
        LIMIT 1`,
      args: [orderCode],
    });
    if (!result.rows[0]) throw new TursoRepositoryError(`Order ${orderCode} was not found.`);
    return result.rows[0];
  }

  private async restoreInventory(tx: Transaction, orderId: number): Promise<void> {
    const detail = await tx.execute({
      sql: "SELECT id_producto, cantidad FROM DETALLE_PEDIDO WHERE id_pedido = ?",
      args: [orderId],
    });
    for (const row of detail.rows) {
      await tx.execute({
        sql: `UPDATE INVENTARIO
          SET cantidad_reservada = MAX(cantidad_reservada - ?, 0), fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id_producto = ?`,
        args: [numberValue(row, ["cantidad"]), numberValue(row, ["id_producto"])],
      });
    }
  }

  private async consumeInventory(tx: Transaction, orderId: number): Promise<void> {
    const detail = await tx.execute({
      sql: "SELECT id_producto, cantidad FROM DETALLE_PEDIDO WHERE id_pedido = ?",
      args: [orderId],
    });
    for (const row of detail.rows) {
      await tx.execute({
        sql: `UPDATE INVENTARIO
          SET cantidad_reservada = MAX(cantidad_reservada - ?, 0),
              cantidad_ventas = cantidad_ventas + ?,
              fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id_producto = ?`,
        args: [
          numberValue(row, ["cantidad"]),
          numberValue(row, ["cantidad"]),
          numberValue(row, ["id_producto"]),
        ],
      });
    }
  }
}

const CLIENTS_QUERY = `SELECT
  c.id_cliente,
  c.nombre,
  c.apellido,
  c.tipo_identificacion,
  c.numero_identificacion,
  pr.id_provincia,
  pr.nombre AS provincia_nombre,
  pr.prefijo,
  COALESCE((
    SELECT t.tipo_tarjeta
    FROM TARJETA t
    WHERE t.id_cliente = c.id_cliente AND t.activa = 1
    ORDER BY t.id_tarjeta DESC
    LIMIT 1
  ), 'CR') AS tipo_tarjeta,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM CONTRATO ct
      JOIN PEDIDO p ON p.id_contrato = ct.id_contrato
      LEFT JOIN PAGO pg ON pg.id_pedido = p.id_pedido AND pg.estado_pago = 'APROBADO'
      WHERE ct.id_cliente = c.id_cliente
        AND ct.activo = 1
        AND p.estado <> 'CANCELADO'
        AND pg.id_pago IS NULL
    ) THEN 0
    ELSE 1
  END AS paz_y_salvo
FROM CLIENTE c
JOIN PROVINCIA pr ON pr.id_provincia = c.id_provincia`;

const ORDERS_QUERY = `SELECT
  p.id_pedido,
  p.codigo_pedido,
  p.fecha_solicitud,
  p.fecha_entrega,
  p.direccion_entrega,
  p.monto_esperado,
  p.estado,
  c.id_cliente,
  pr.prefijo,
  pl.nombre AS plan_nombre,
  d.id_producto,
  d.cantidad,
  CASE WHEN pg.id_pago IS NULL THEN 0 ELSE 1 END AS pagado
FROM PEDIDO p
JOIN CONTRATO ct ON ct.id_contrato = p.id_contrato
JOIN CLIENTE c ON c.id_cliente = ct.id_cliente
JOIN PROVINCIA pr ON pr.id_provincia = c.id_provincia
JOIN PLAN_PEDIDO pl ON pl.id_plan = ct.id_plan
LEFT JOIN DETALLE_PEDIDO d ON d.id_pedido = p.id_pedido
LEFT JOIN PAGO pg ON pg.id_pedido = p.id_pedido AND pg.estado_pago = 'APROBADO'`;

function mapClient(row: SqlRow): Client {
  return {
    codigo_cliente: numberValue(row, ["id_cliente"]),
    nombre: String(required(row, "nombre")),
    apellido: String(required(row, "apellido")),
    identificacion: `${required(row, "tipo_identificacion")}:${required(row, "numero_identificacion")}`,
    provincia: {
      id: String(required(row, "id_provincia")),
      codigo: String(required(row, "prefijo")),
      nombre: String(required(row, "provincia_nombre")),
      prefijo: String(required(row, "prefijo")),
    },
    tipo_tarjeta: cardType(row.tipo_tarjeta),
    paz_y_salvo: booleanValue(row, "paz_y_salvo", true),
  };
}

function mapOrder(row: SqlRow): Order {
  return {
    codigo_pedido: String(required(row, "codigo_pedido")),
    codigo_cliente: numberValue(row, ["id_cliente"]),
    codigo_producto: numberValue(row, ["id_producto"]),
    cantidad: numberValue(row, ["cantidad"]),
    monto: numberValue(row, ["monto_esperado"]),
    etiqueta: "pedido-web",
    direccion: String(required(row, "direccion_entrega")),
    fecha_pedido: new Date(String(required(row, "fecha_solicitud"))).toISOString(),
    ...(row.fecha_entrega == null ? {} : { fecha_entrega: new Date(String(row.fecha_entrega)).toISOString() }),
    estado: orderStatus(row.estado),
    tipo_duracion: String(required(row, "plan_nombre")),
    pagado: booleanValue(row, "pagado", false),
  };
}

function mapPayment(row: SqlRow): Payment {
  return {
    id_pago: numberValue(row, ["id_pago"]),
    codigo_pedido: String(required(row, "codigo_pedido")),
    monto_pagado: numberValue(row, ["monto"]),
    fecha_pago: new Date(String(required(row, "fecha_pago"))).toISOString(),
    tipo_tarjeta: cardType(row.tipo_tarjeta),
  };
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

function normalizeCardNumber(cardNumber: string | undefined, clientId: number): string {
  const digits = (cardNumber ?? "").replace(/\D+/g, "");
  if (digits.length >= 12) return digits.slice(0, 19);
  return `400000${String(clientId).padStart(10, "0")}`.slice(0, 16);
}

function resultId(row: SqlRow | undefined, keys: readonly string[]): number | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && Number.isInteger(Number(value))) return Number(value);
  }
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
  return Boolean(Number(value));
}

function orderStatus(value: unknown): Order["estado"] {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "proceso") return "proceso";
  if (normalized === "entregado") return "entregado";
  if (normalized === "cancelado") return "cancelado";
  if (normalized === "facturado") return "facturado";
  return "generado";
}

function cardType(value: unknown): Client["tipo_tarjeta"] {
  return String(value ?? "").trim().toUpperCase() === "DB" ? "DB" : "CR";
}

async function lastInsertId(tx: Transaction): Promise<number> {
  const result = await tx.execute("SELECT last_insert_rowid() AS id");
  const id = resultId(result.rows[0], ["id"]);
  if (id === null) throw new Error("Could not resolve last_insert_rowid().");
  return id;
}

async function safeRollback(tx: Transaction): Promise<void> {
  await tx.rollback().catch(() => {});
}

function wrapError(error: unknown): Error {
  if (error instanceof TursoRepositoryError) return error;
  if (error instanceof Error) {
    if (error.message.includes("Su pedido está suspendido")) {
      return new TursoRepositoryError("Su pedido está suspendido");
    }
    return new TursoRepositoryError(error.message);
  }
  return new TursoRepositoryError("Unexpected Turso repository error.");
}
