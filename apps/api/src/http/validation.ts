import {
  CARD_TYPES,
  isCardType,
  isOrderStatus,
  type CardType,
  type NewClient,
  type NewOrder,
  type NewPayment,
  type OrderStatus,
  type Province,
} from "@eclick-one/domain";
import { BadRequestError } from "../errors/app-error";

const MAX_JSON_BODY_BYTES = 1_000_000;
const ORDER_CODE_PATTERN = /^[A-Z]{2}-[A-Z0-9-]{1,64}$/;

interface FieldError {
  field: string;
  message: string;
}

export function assertAcceptLanguage(request: Request): void {
  const value = request.headers.get("accept-language");
  if (!value) return;
  const primary = value.split(",")[0]?.trim().toLowerCase() ?? "";
  if (primary === "en" || primary.startsWith("en-") || primary === "es" || primary.startsWith("es-")) {
    return;
  }
  throw validationError([{ field: "accept-language", message: "Accept-Language must be en or es." }]);
}

export function parseClientCode(value: string | undefined, field = "codigo_cliente"): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw validationError([{ field, message: `${field} must be a positive integer.` }]);
  }
  return parsed;
}

export function parseOrderCode(value: string | undefined, field = "codigo_pedido"): string {
  const sanitized = sanitizedString(value, field);
  if (!ORDER_CODE_PATTERN.test(sanitized)) {
    throw validationError([{ field, message: `${field} must be a valid order code.` }]);
  }
  return sanitized;
}

export async function readClientBody(request: Request): Promise<NewClient> {
  const body = await readJsonObject(request);
  const errors: FieldError[] = [];
  const provincia = readProvince(body.provincia, errors);
  const numeroTarjeta = readOptionalString(body.numero_tarjeta, "numero_tarjeta", errors);
  const email = readOptionalEmail(body.email, errors);
  const phone = readOptionalPhone(body.phone, errors);
  const input = {
    nombre: readRequiredString(body.nombre, "nombre", errors),
    apellido: readRequiredString(body.apellido, "apellido", errors),
    identificacion: readRequiredString(body.identificacion, "identificacion", errors),
    provincia,
    tipo_tarjeta: readCardType(body.tipo_tarjeta, "tipo_tarjeta", errors),
    paz_y_salvo: readBoolean(body.paz_y_salvo, "paz_y_salvo", errors),
    ...(numeroTarjeta !== undefined ? { numero_tarjeta: numeroTarjeta } : {}),
    ...(email !== undefined ? { email } : {}),
    ...(phone !== undefined ? { phone } : {}),
  };
  if (errors.length) throw validationError(errors);
  return input;
}

export async function readOrderBody(request: Request): Promise<NewOrder> {
  const body = await readJsonObject(request);
  const errors: FieldError[] = [];
  const fechaEntrega = readOptionalIsoDate(body.fecha_entrega, "fecha_entrega", errors);
  const input = {
    codigo_cliente: readPositiveInteger(body.codigo_cliente, "codigo_cliente", errors),
    codigo_producto: readPositiveInteger(body.codigo_producto, "codigo_producto", errors, 1000),
    cantidad: readPositiveInteger(body.cantidad, "cantidad", errors),
    direccion: readRequiredString(body.direccion, "direccion", errors),
    fecha_pedido: readRequiredIsoDate(body.fecha_pedido, "fecha_pedido", errors),
    etiqueta: readRequiredString(body.etiqueta, "etiqueta", errors),
    tipo_duracion: readRequiredString(body.tipo_duracion, "tipo_duracion", errors),
    ...(fechaEntrega !== undefined ? { fecha_entrega: fechaEntrega } : {}),
  };
  if (errors.length) throw validationError(errors);
  return input;
}

export async function readPaymentBody(request: Request): Promise<NewPayment> {
  const body = await readJsonObject(request);
  const errors: FieldError[] = [];
  const referencia = readOptionalString(body.referencia, "referencia", errors);
  const input = {
    codigo_pedido: readOrderCodeField(body.codigo_pedido, "codigo_pedido", errors),
    monto_pagado: readPositiveAmount(body.monto_pagado, "monto_pagado", errors),
    fecha_pago: readRequiredIsoDate(body.fecha_pago, "fecha_pago", errors),
    tipo_tarjeta: readCardType(body.tipo_tarjeta, "tipo_tarjeta", errors),
    ...(referencia !== undefined ? { referencia } : {}),
  };
  if (errors.length) throw validationError(errors);
  return input;
}

export async function readStatusTransitionBody(request: Request): Promise<{ estado: OrderStatus }> {
  const body = await readJsonObject(request);
  const errors: FieldError[] = [];
  const estado = readRequiredString(body.estado, "estado", errors);
  if (estado && !isOrderStatus(estado)) {
    errors.push({ field: "estado", message: "estado must be an allowed order status." });
  }
  if (errors.length) throw validationError(errors);
  return { estado: estado as OrderStatus };
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  assertJsonContentType(request);
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > MAX_JSON_BODY_BYTES) {
    throw validationError([{ field: "body", message: "Request body is too large." }]);
  }
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    throw validationError([{ field: "body", message: "Request body must be valid JSON." }]);
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_JSON_BODY_BYTES) {
    throw validationError([{ field: "body", message: "Request body is too large." }]);
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw validationError([{ field: "body", message: "Request body must be valid JSON." }]);
  }
  if (!isPlainObject(body)) {
    throw validationError([{ field: "body", message: "Request body must be a JSON object." }]);
  }
  return body;
}

function assertJsonContentType(request: Request): void {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw validationError([{ field: "content-type", message: "Content-Type must be application/json." }]);
  }
}

function readProvince(value: unknown, errors: FieldError[]): Province {
  if (!isPlainObject(value)) {
    errors.push({ field: "provincia", message: "provincia must be an object." });
    return { id: "", codigo: "", nombre: "", prefijo: "" };
  }
  const codigo = readRequiredString(value.codigo, "provincia.codigo", errors);
  const nombre = readRequiredString(value.nombre, "provincia.nombre", errors);
  const prefijo = readRequiredString(value.prefijo, "provincia.prefijo", errors);
  if (codigo && !/^[A-Z]{2}$/.test(codigo)) {
    errors.push({ field: "provincia.codigo", message: "provincia.codigo must contain two uppercase letters." });
  }
  if (prefijo && !/^[A-Z]{2}$/.test(prefijo)) {
    errors.push({ field: "provincia.prefijo", message: "provincia.prefijo must contain two uppercase letters." });
  }
  return {
    id: readOptionalString(value.id, "provincia.id", errors) ?? codigo,
    codigo,
    nombre,
    prefijo,
  };
}

function readRequiredString(value: unknown, field: string, errors: FieldError[]): string {
  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be a non-empty string.` });
    return "";
  }
  const sanitized = sanitizeString(value);
  if (!sanitized) {
    errors.push({ field, message: `${field} must be a non-empty string.` });
  }
  return sanitized;
}

function readOptionalString(value: unknown, field: string, errors: FieldError[]): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be a string.` });
    return undefined;
  }
  return sanitizeString(value);
}

function readOptionalEmail(value: unknown, errors: FieldError[]): string | undefined {
  const email = readOptionalString(value, "email", errors);
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: "email", message: "email must be valid." });
  }
  return email;
}

function readOptionalPhone(value: unknown, errors: FieldError[]): string | undefined {
  const phone = readOptionalString(value, "phone", errors);
  if (phone !== undefined && !/^\+?[0-9 ()-]{7,24}$/.test(phone)) {
    errors.push({ field: "phone", message: "phone must be valid." });
  }
  return phone;
}

function readPositiveInteger(value: unknown, field: string, errors: FieldError[], min = 1): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    errors.push({ field, message: `${field} must be an integer greater than or equal to ${min}.` });
    return min;
  }
  return value;
}

function readPositiveAmount(value: unknown, field: string, errors: FieldError[]): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    errors.push({ field, message: `${field} must be a positive amount.` });
    return 0;
  }
  return value;
}

function readBoolean(value: unknown, field: string, errors: FieldError[]): boolean {
  if (typeof value !== "boolean") {
    errors.push({ field, message: `${field} must be a boolean.` });
    return false;
  }
  return value;
}

function readCardType(value: unknown, field: string, errors: FieldError[]): CardType {
  const cardType = readRequiredString(value, field, errors);
  if (cardType && !isCardType(cardType)) {
    errors.push({ field, message: `${field} must be one of ${CARD_TYPES.join(", ")}.` });
  }
  return cardType as CardType;
}

function readRequiredIsoDate(value: unknown, field: string, errors: FieldError[]): string {
  const date = readRequiredString(value, field, errors);
  if (date && Number.isNaN(Date.parse(date))) {
    errors.push({ field, message: `${field} must be a valid ISO date.` });
  }
  return date;
}

function readOptionalIsoDate(value: unknown, field: string, errors: FieldError[]): string | undefined {
  const date = readOptionalString(value, field, errors);
  if (date !== undefined && Number.isNaN(Date.parse(date))) {
    errors.push({ field, message: `${field} must be a valid ISO date.` });
  }
  return date;
}

function readOrderCodeField(value: unknown, field: string, errors: FieldError[]): string {
  const orderCode = readRequiredString(value, field, errors);
  if (orderCode && !ORDER_CODE_PATTERN.test(orderCode)) {
    errors.push({ field, message: `${field} must be a valid order code.` });
  }
  return orderCode;
}

function sanitizedString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw validationError([{ field, message: `${field} must be a non-empty string.` }]);
  }
  const sanitized = sanitizeString(value);
  if (!sanitized) {
    throw validationError([{ field, message: `${field} must be a non-empty string.` }]);
  }
  return sanitized;
}

function sanitizeString(value: string): string {
  return value.trim()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function validationError(fields: readonly FieldError[]): BadRequestError {
  return new BadRequestError("Validation failed.", { fields });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
