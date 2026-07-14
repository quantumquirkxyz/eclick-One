import type {
  CardType,
  Order,
  OrderStatus,
  ProductPreference,
  ProductRequest,
} from "./entities";
import { CARD_TYPES, ORDER_STATUSES } from "./entities";

export const MIN_CLIENT_CODE = 1;
export const MIN_PRODUCT_CODE = 1000;
export const MIN_ORDER_DATE = "2024-12-29T00:00:00.000Z";
export const DELIVERY_DELAY_HOURS = 48;
export const DELIVERY_AMOUNT_1 = 50;
export const DELIVERY_AMOUNT_2 = 70;
export const DELIVERY_AMOUNT_3 = 90;
export const MIN_PREFERENCE_REQUESTS = 3;

export class DomainRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainRuleError";
  }
}

export function amountForQuantity(quantity: number): number {
  assertPositiveInteger(quantity, "quantity");
  if (quantity === 1) return DELIVERY_AMOUNT_1;
  if (quantity === 2) return DELIVERY_AMOUNT_2;
  return DELIVERY_AMOUNT_3;
}

export function isCardType(value: string): value is CardType {
  return (CARD_TYPES as readonly string[]).includes(value);
}

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function assertOrderDateAllowed(orderDate: string): void {
  const instant = parseDate(orderDate, "orderDate");
  if (instant.getTime() < Date.parse(MIN_ORDER_DATE)) {
    throw new DomainRuleError("Order date cannot be earlier than December 29, 2024.");
  }
  if (instant.getTime() > Date.now()) {
    throw new DomainRuleError("Order date cannot be in the future.");
  }
}

export function calculateDeliveryDate(paymentOrValidDate: string): string {
  const base = parseDate(paymentOrValidDate, "paymentOrValidDate");
  return new Date(base.getTime() + DELIVERY_DELAY_HOURS * 60 * 60 * 1_000).toISOString();
}

export function canDeliverOrder(isPaid: boolean): boolean {
  return isPaid;
}

export function assertOrderPaymentAmount(expected: number, actual: number): void {
  assertPositiveMoney(expected, "expected");
  assertPositiveMoney(actual, "actual");
  if (expected !== actual) {
    throw new DomainRuleError("Payment amount must match the order amount.");
  }
}

export function assertOrderTransitionAllowed(order: Order, nextStatus: OrderStatus): void {
  if (!isOrderStatus(nextStatus)) {
    throw new DomainRuleError("Order status is not allowed.");
  }
  if (order.estado === nextStatus) return;
  if (order.estado === "generado" && (nextStatus === "proceso" || nextStatus === "cancelado")) return;
  if (order.estado === "proceso" && (nextStatus === "entregado" || nextStatus === "cancelado" || nextStatus === "facturado")) return;
  if (order.estado === "entregado" && nextStatus === "facturado") return;
  throw new DomainRuleError(`Cannot transition order from ${order.estado} to ${nextStatus}.`);
}

export function assertOrderDeliveryAllowed(order: Order): void {
  if (!order.pagado) {
    throw new DomainRuleError("An order cannot be delivered until it is paid.");
  }
}

export function assertPaymentReference(reference?: string): void {
  if (reference !== undefined && reference.trim().length === 0) {
    throw new DomainRuleError("Payment reference cannot be empty when provided.");
  }
}

export function assertClientCanGenerateOrder(pazYSalvo: boolean): void {
  if (pazYSalvo !== true) {
    throw new DomainRuleError("A client must be paz y salvo to generate an order.");
  }
}

export function assertProvinceOrderCode(orderCode: string, provinceCode: string): void {
  if (!/^[A-Z]{2}$/.test(provinceCode)) {
    throw new DomainRuleError("Province code must contain exactly two uppercase letters.");
  }
  if (!orderCode.startsWith(`${provinceCode}-`)) {
    throw new DomainRuleError("Order code must begin with its two-letter province prefix.");
  }
}

export function isIncludedInMonthlyOrders(date: string): boolean {
  const day = parseDate(date, "date").getUTCDate();
  return day >= 1 && day <= 30;
}

export interface InProcessPolicyInput {
  enteredInProcessAt: string;
  evaluatedAt: string;
  monthlyRuleApplies: boolean;
}

export function canRemainInProcess(input: InProcessPolicyInput): boolean {
  const start = parseDate(input.enteredInProcessAt, "enteredInProcessAt").getTime();
  const end = parseDate(input.evaluatedAt, "evaluatedAt").getTime();
  if (end < start) {
    throw new DomainRuleError("Evaluation date cannot precede the in-process date.");
  }
  return input.monthlyRuleApplies || end - start <= DELIVERY_DELAY_HOURS * 60 * 60 * 1_000;
}

/**
 * Selects a preference only after at least three request events. Ties are resolved
 * by total quantity, then product code for deterministic/reproducible output.
 */
export function selectProductPreference(
  requests: readonly ProductRequest[],
): ProductPreference | null {
  const aggregates = new Map<number, ProductPreference>();

  for (const request of requests) {
    assertPositiveInteger(request.codigo_producto, "codigo_producto");
    assertPositiveInteger(request.cantidad, "cantidad");
    const current = aggregates.get(request.codigo_producto);
    aggregates.set(request.codigo_producto, {
      codigo_producto: request.codigo_producto,
      cant_solicitudes: (current?.cant_solicitudes ?? 0) + 1,
      cantidad_total: (current?.cantidad_total ?? 0) + request.cantidad,
    });
  }

  return (
    [...aggregates.values()]
      .filter((candidate) => candidate.cant_solicitudes >= MIN_PREFERENCE_REQUESTS)
      .sort(
        (left, right) =>
          right.cant_solicitudes - left.cant_solicitudes ||
          right.cantidad_total - left.cantidad_total ||
          left.codigo_producto - right.codigo_producto,
      )[0] ?? null
  );
}

export function assertGeneratedCodes(clientCode: number, productCode: number): void {
  if (!Number.isInteger(clientCode) || clientCode < MIN_CLIENT_CODE) {
    throw new DomainRuleError(`Client code must be database-generated from ${MIN_CLIENT_CODE}.`);
  }
  if (!Number.isInteger(productCode) || productCode < MIN_PRODUCT_CODE) {
    throw new DomainRuleError(`Product code must be database-generated from ${MIN_PRODUCT_CODE}.`);
  }
}

function parseDate(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new DomainRuleError(`${field} must be a valid ISO date.`);
  }
  return parsed;
}

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new DomainRuleError(`${field} must be a positive integer.`);
  }
}

function assertPositiveMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DomainRuleError(`${field} must be a positive amount.`);
  }
}
