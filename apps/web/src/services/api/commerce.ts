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
  Cliente,
  Inventario,
  Pago,
  Pedido,
  Producto,
  Provincia,
  EstadoPedido,
  NewCliente,
  NewPedido,
  NewPago,
} from "../../types/commerce";
import { apiRequest } from "./client";

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
  orderStatuses: readonly { status: EstadoPedido; count: number }[];
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
  atRiskOrders: readonly { codigo_pedido: string; codigo_cliente: number; estado: EstadoPedido; hoursOpen: number }[];
  preferencesByClient: readonly {
    codigo_cliente: number;
    nombre: string;
    apellido: string;
    preference: { codigo_producto: number; cant_solicitudes: number; cantidad_total: number } | null;
  }[];
}

export interface CommerceApi {
  listProvinces(): Promise<readonly Provincia[]>;
  listClients(): Promise<readonly Cliente[]>;
  createClient(input: NewCliente): Promise<Cliente>;
  listProducts(): Promise<readonly Producto[]>;
  listInventory(): Promise<readonly Inventario[]>;
  listOrders(): Promise<readonly Pedido[]>;
  listCurrentOrders(): Promise<readonly Pedido[]>;
  listPayments(): Promise<readonly Pago[]>;
  createOrder(input: NewPedido): Promise<Pedido>;
  recordPayment(input: NewPago): Promise<Pago>;
  transitionOrderStatus(codigo_pedido: string, estado: EstadoPedido): Promise<Pedido>;
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

export function validarCliente(input: NewCliente): void {
  if (input.nombre.trim().length === 0 || input.apellido.trim().length === 0 || input.identificacion.trim().length === 0) {
    throw new Error("Cliente incompleto.");
  }
  if (!input.provincia.codigo || !input.provincia.nombre || !input.provincia.prefijo) {
    throw new Error("Provincia inválida.");
  }
}

export function validarPedido(input: NewPedido, cliente: Cliente): number {
  assertClientCanGenerateOrder(cliente.paz_y_salvo);
  assertOrderDateAllowed(input.fecha_pedido);
  if (input.direccion.trim().length === 0 || input.etiqueta.trim().length === 0 || input.tipo_duracion.trim().length === 0) {
    throw new Error("Pedido incompleto.");
  }
  if (!Number.isInteger(input.cantidad) || input.cantidad < 1) {
    throw new Error("Cantidad inválida.");
  }
  return amountForQuantity(input.cantidad);
}

export function validarPago(input: NewPago, pedido: Pedido): void {
  assertPaymentReference(input.referencia);
  if (input.monto_pagado <= 0) {
    throw new Error("Monto inválido.");
  }
  assertOrderPaymentAmount(pedido.monto, input.monto_pagado);
}

export function validarTransicion(pedido: Pedido, estado: EstadoPedido): void {
  if (!isOrderStatus(estado)) {
    throw new Error("Estado inválido.");
  }
  assertOrderTransitionAllowed(pedido, estado);
  if (!pedido.pagado && (estado === "entregado" || estado === "facturado")) {
    throw new Error("El pedido debe estar pagado antes de cambiar a ese estado.");
  }
}
