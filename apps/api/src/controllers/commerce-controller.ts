import type { OrderStatus, NewClient, NewOrder, NewPayment } from "@eclick-one/domain";
import { BadRequestError } from "../errors/app-error";
import { localeFromRequest } from "../i18n";
import type { CommerceService } from "../services/commerce-service";
import type { ControllerResult } from "./controller";

const MAX_JSON_BODY_BYTES = 64_000;

export class CommerceController {
  constructor(private readonly service: CommerceService) {}

  dashboard = async (request: Request): Promise<ControllerResult> => ({ body: await this.service.getDashboard(localeFromRequest(request)) });
  provinces = async (): Promise<ControllerResult> => ({ body: await this.service.listProvinces() });
  clients = async (): Promise<ControllerResult> => ({ body: await this.service.listClients() });
  currentOrders = async (): Promise<ControllerResult> => ({ body: await this.service.listCurrentOrders() });
  products = async (): Promise<ControllerResult> => ({ body: await this.service.listProducts() });
  inventory = async (): Promise<ControllerResult> => ({ body: await this.service.listInventory() });
  orders = async (): Promise<ControllerResult> => ({ body: await this.service.listOrders() });
  payments = async (): Promise<ControllerResult> => ({ body: await this.service.listPayments() });
  reports = async (request: Request): Promise<ControllerResult> => ({ body: await this.service.getReports(localeFromRequest(request)) });

  clientPreference = async (_request: Request, params: Record<string, string>): Promise<ControllerResult> => {
    const codigo = Number(params.codigo_cliente);
    if (!Number.isInteger(codigo)) {
      throw new BadRequestError("codigo_cliente must be an integer.");
    }
    return { body: await this.service.getClientPreference(codigo) };
  };

  createClient = async (request: Request): Promise<ControllerResult> => {
    const body = await readJsonObject<NewClient>(request);
    assertString(body.nombre, "nombre");
    assertString(body.apellido, "apellido");
    assertString(body.identificacion, "identificacion");
    assertProvinceObject(body.provincia);
    assertString(body.tipo_tarjeta, "tipo_tarjeta");
    return { status: 201, body: await this.service.createClient(body) };
  };

  createOrder = async (request: Request): Promise<ControllerResult> => {
    const body = await readJsonObject<NewOrder>(request);
    assertNumber(body.codigo_cliente, "codigo_cliente");
    assertNumber(body.codigo_producto, "codigo_producto");
    assertNumber(body.cantidad, "cantidad");
    assertString(body.direccion, "direccion");
    assertString(body.fecha_pedido, "fecha_pedido");
    assertString(body.etiqueta, "etiqueta");
    assertString(body.tipo_duracion, "tipo_duracion");
    return { status: 201, body: await this.service.createOrder(body) };
  };

  recordPayment = async (request: Request): Promise<ControllerResult> => {
    const body = await readJsonObject<NewPayment>(request);
    assertString(body.codigo_pedido, "codigo_pedido");
    assertNumber(body.monto_pagado, "monto_pagado");
    assertString(body.fecha_pago, "fecha_pago");
    assertString(body.tipo_tarjeta, "tipo_tarjeta");
    return { status: 201, body: await this.service.recordPayment(body) };
  };

  orderOnChainStatus = async (_request: Request, params: Record<string, string>): Promise<ControllerResult> => {
    const codigoPedido = params.codigo_pedido;
    if (!codigoPedido) {
      throw new BadRequestError("codigo_pedido is required.");
    }
    return { body: await this.service.getOrderOnChainStatus(codigoPedido) };
  };

  transitionOrderStatus = async (request: Request, params: Record<string, string>): Promise<ControllerResult> => {
    const body = await readJsonObject<{ estado: OrderStatus }>(request);
    if (!body.estado) {
      throw new BadRequestError("estado is required.");
    }
    const codigoPedido = params.codigo_pedido;
    if (!codigoPedido) {
      throw new BadRequestError("codigo_pedido is required.");
    }
    return {
      body: await this.service.transitionOrderStatus({
        codigo_pedido: codigoPedido,
        estado: body.estado,
      }),
    };
  };
}

async function readJsonObject<T>(request: Request): Promise<T> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > MAX_JSON_BODY_BYTES) {
    throw new BadRequestError("Request body is too large.");
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON.");
  }
  if (!isPlainObject(body)) {
    throw new BadRequestError("Request body must be a JSON object.");
  }
  return body as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestError(`${field} must be a non-empty string.`);
  }
}

function assertNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BadRequestError(`${field} must be a number.`);
  }
}

function assertProvinceObject(value: unknown): void {
  if (!isPlainObject(value)) {
    throw new BadRequestError("provincia must be an object.");
  }
  assertString(value.codigo, "provincia.codigo");
  assertString(value.nombre, "provincia.nombre");
  assertString(value.prefijo, "provincia.prefijo");
}
