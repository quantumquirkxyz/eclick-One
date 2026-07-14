import {
  amountForQuantity,
  assertClientCanGenerateOrder,
  assertOrderDateAllowed,
  calculateDeliveryDate,
} from "@eclick-one/domain";
import type { Cliente, Inventario, Pago, Pedido, Producto } from "../types/commerce";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export interface ComercioServicio {
  listarClientes(): Promise<readonly Cliente[]>;
  listarProductos(): Promise<readonly Producto[]>;
  listarInventario(): Promise<readonly Inventario[]>;
  listarPedidos(): Promise<readonly Pedido[]>;
  listarPagos(): Promise<readonly Pago[]>;
}

async function apiGet<T>(path: string): Promise<T> {
  const url = apiUrl(path);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

function apiUrl(path: string): string {
  const base = String(API_BASE_URL).replace(/\/+$/, "");
  if (base === "/api/v1" && path.startsWith("/api/v1/")) {
    return path;
  }
  if (base.startsWith("/")) {
    return `${base}${path.replace(/^\/api\/v1/, "")}`;
  }
  if (base.endsWith("/api/v1") && path.startsWith("/api/v1/")) {
    return `${base}${path.slice("/api/v1".length)}`;
  }
  return new URL(path, `${base}/`).toString();
}

export const comercioApiService: ComercioServicio = {
  listarClientes: () => apiGet<readonly Cliente[]>("/api/v1/customers"),
  listarProductos: () => apiGet<readonly Producto[]>("/api/v1/products"),
  listarInventario: () => apiGet<readonly Inventario[]>("/api/v1/inventory"),
  listarPedidos: () => apiGet<readonly Pedido[]>("/api/v1/orders"),
  listarPagos: () => apiGet<readonly Pago[]>("/api/v1/payments"),
};

export function validarPedidoSintetico(
  cliente: Cliente,
  cantidad: number,
  fecha: string,
): Pick<Pedido, "monto" | "fecha_entrega"> {
  assertClientCanGenerateOrder(cliente.paz_y_salvo);
  assertOrderDateAllowed(fecha);
  return { monto: amountForQuantity(cantidad), fecha_entrega: calculateDeliveryDate(fecha) };
}
