import {
  amountForQuantity,
  assertClientCanGenerateOrder,
  assertOrderDateAllowed,
  assertOrderPaymentAmount,
  assertOrderTransitionAllowed,
  assertPaymentReference,
  isOrderStatus,
} from "@eclick-one/domain";
import type {
  CommerceClient,
  CommerceInventory,
  CommercePayment,
  CommerceOrder,
  CommerceProduct,
  CommerceProvince,
  CommerceOrderStatus,
  NewCommerceClient,
  NewCommerceOrder,
  NewCommercePayment,
} from "../../types/commerce";
import { apiRequest } from "./client";
import { getCurrentLocale } from "../../i18n";

export interface DashboardSnapshot {
  kind: "dashboard";
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
  orderStatuses: readonly { status: CommerceOrderStatus; count: number }[];
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
  topProducts: readonly { codigo_producto: number; nombre: string; cantidad: number; pedidos: number }[];
  nonCompliantClients: readonly { codigo_cliente: number; nombre: string; apellido: string }[];
  atRiskOrders: readonly { codigo_pedido: string; codigo_cliente: number; estado: CommerceOrderStatus; hoursOpen: number }[];
  preferencesByClient: readonly {
    codigo_cliente: number;
    nombre: string;
    apellido: string;
    preference: { codigo_producto: number; cant_solicitudes: number; cantidad_total: number } | null;
  }[];
}

export interface CommerceApi {
  listProvinces(): Promise<readonly CommerceProvince[]>;
  listClients(): Promise<readonly CommerceClient[]>;
  createClient(input: NewCommerceClient): Promise<CommerceClient>;
  listProducts(): Promise<readonly CommerceProduct[]>;
  listInventory(): Promise<readonly CommerceInventory[]>;
  listOrders(): Promise<readonly CommerceOrder[]>;
  listCurrentOrders(): Promise<readonly CommerceOrder[]>;
  listPayments(): Promise<readonly CommercePayment[]>;
  createOrder(input: NewCommerceOrder): Promise<CommerceOrder>;
  recordPayment(input: NewCommercePayment): Promise<CommercePayment>;
  transitionOrderStatus(codigo_pedido: string, estado: CommerceOrderStatus): Promise<CommerceOrder>;
  getClientPreference(codigo_cliente: number): Promise<DashboardSnapshot["preferencesByClient"][number]["preference"]>;
  getDashboard(): Promise<DashboardSnapshot>;
  getReports(): Promise<{ synthetic: boolean; generatedAt: string; sections: readonly { key: string; title: string; rows: readonly unknown[] }[] }>;
}

export const commerceApi: CommerceApi = {
  listProvinces: () => apiRequest("/api/v1/provinces"),
  listClients: () => apiRequest("/api/v1/customers"),
  createClient: (input) => apiRequest("/api/v1/customers", { method: "POST", body: JSON.stringify(input) }),
  listProducts: () => apiRequest("/api/v1/products"),
  listInventory: () => apiRequest("/api/v1/inventory"),
  listOrders: () => apiRequest("/api/v1/orders"),
  listCurrentOrders: () => apiRequest("/api/v1/orders/current"),
  listPayments: () => apiRequest("/api/v1/payments"),
  createOrder: (input) => apiRequest("/api/v1/orders", { method: "POST", body: JSON.stringify(input) }),
  recordPayment: (input) => apiRequest("/api/v1/payments", { method: "POST", body: JSON.stringify(input) }),
  transitionOrderStatus: (codigo_pedido, estado) =>
    apiRequest(`/api/v1/orders/${codigo_pedido}/status`, { method: "PATCH", body: JSON.stringify({ estado }) }),
  getClientPreference: (codigo_cliente) => apiRequest(`/api/v1/customers/${codigo_cliente}/preference`),
  getDashboard: () => apiRequest("/api/v1/dashboard"),
  getReports: () => apiRequest("/api/v1/reports"),
};

export function validateClient(input: NewCommerceClient): void {
  if (input.nombre.trim().length === 0 || input.apellido.trim().length === 0 || input.identificacion.trim().length === 0) {
    throw new Error(message("clientIncomplete"));
  }
  if (!input.provincia.codigo || !input.provincia.nombre || !input.provincia.prefijo) {
    throw new Error(message("invalidProvince"));
  }
}

export function validateOrder(input: NewCommerceOrder, cliente: CommerceClient): number {
  assertClientCanGenerateOrder(cliente.paz_y_salvo);
  assertOrderDateAllowed(input.fecha_pedido);
  if (input.direccion.trim().length === 0 || input.etiqueta.trim().length === 0 || input.tipo_duracion.trim().length === 0) {
    throw new Error(message("orderIncomplete"));
  }
  if (!Number.isInteger(input.cantidad) || input.cantidad < 1) {
    throw new Error(message("invalidQuantity"));
  }
  return amountForQuantity(input.cantidad);
}

export function validatePayment(input: NewCommercePayment, pedido: CommerceOrder): void {
  assertPaymentReference(input.referencia);
  if (input.monto_pagado <= 0) {
    throw new Error(message("invalidAmount"));
  }
  assertOrderPaymentAmount(pedido.monto, input.monto_pagado);
}

export function validateTransition(pedido: CommerceOrder, estado: CommerceOrderStatus): void {
  if (!isOrderStatus(estado)) {
    throw new Error(message("invalidStatus"));
  }
  assertOrderTransitionAllowed(pedido, estado);
  if (!pedido.pagado && (estado === "entregado" || estado === "facturado")) {
    throw new Error(message("paymentBeforeStatus"));
  }
}

function message(key: keyof typeof validationMessages.en): string {
  return validationMessages[getCurrentLocale()][key];
}

const validationMessages = {
  en: {
    clientIncomplete: "Customer information is incomplete.",
    invalidProvince: "Invalid province.",
    orderIncomplete: "Order information is incomplete.",
    invalidQuantity: "Invalid quantity.",
    invalidAmount: "Invalid amount.",
    invalidStatus: "Invalid status.",
    paymentBeforeStatus: "The order must be paid before moving to that status.",
  },
  es: {
    clientIncomplete: "Cliente incompleto.",
    invalidProvince: "Provincia inválida.",
    orderIncomplete: "Pedido incompleto.",
    invalidQuantity: "Cantidad invalida.",
    invalidAmount: "Monto invalido.",
    invalidStatus: "Estado invalido.",
    paymentBeforeStatus: "El pedido debe estar pagado antes de cambiar a ese estado.",
  },
} as const;
