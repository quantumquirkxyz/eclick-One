export const CARD_TYPES = ["DB", "CR"] as const satisfies readonly string[];
export type CardType = (typeof CARD_TYPES)[number];

export const ORDER_STATUSES = [
  "generado",
  "proceso",
  "entregado",
  "cancelado",
  "facturado",
] as const satisfies readonly string[];
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Province {
  /** Stable academic identifier; often the same value as prefijo. */
  id: string;
  codigo: string;
  nombre: string;
  /** Stable uppercase prefix used in order codes. */
  prefijo: string;
}

export interface Client {
  /** Database-generated integer, starting at 1. */
  codigo_cliente: number;
  nombre: string;
  apellido: string;
  identificacion: string;
  provincia: Province;
  tipo_tarjeta: CardType;
  paz_y_salvo: boolean;
  /** Optional operational extension; not part of the academic rule set. */
  email?: string;
  /** Optional operational extension; not part of the academic rule set. */
  phone?: string;
}

export interface Product {
  /** Database-generated integer, starting at 1000. */
  codigo_producto: number;
  nombre: string;
  categoria: string;
  /** Optional catalog extension for UI filtering; not an academic rule. */
  activo?: boolean;
}

export interface Inventory {
  codigo_producto: number;
  cant_ventas: number;
  cant_bodega: number;
  cant_reservado: number;
  /** Optional operational threshold; not part of the academic ER model. */
  nivel_reposicion?: number;
}

export interface Order {
  /** Province-prefixed application identifier, e.g. PA-SYN-0001. */
  codigo_pedido: string;
  codigo_cliente: number;
  codigo_producto: number;
  cantidad: number;
  monto: number;
  etiqueta: string;
  /** Delivery address is an immutable order snapshot, never a Client field. */
  direccion: string;
  fecha_pedido: string;
  fecha_entrega?: string;
  estado: OrderStatus;
  tipo_duracion: string;
  /** Optional UI/API derivative from payment history; not part of the ER model. */
  pagado?: boolean;
}

export interface Payment {
  /** Immutable payment-history key. */
  id_pago: number;
  codigo_pedido: string;
  monto_pagado: number;
  fecha_pago: string;
  tipo_tarjeta: CardType;
  referencia?: string;
}

export interface NewClient {
  nombre: string;
  apellido: string;
  identificacion: string;
  provincia: Province;
  tipo_tarjeta: CardType;
  paz_y_salvo: boolean;
  email?: string;
  phone?: string;
}

export interface NewProduct {
  nombre: string;
  categoria: string;
}

export interface NewOrder {
  codigo_cliente: number;
  codigo_producto: number;
  cantidad: number;
  direccion: string;
  fecha_pedido: string;
  etiqueta: string;
  tipo_duracion: string;
  fecha_entrega?: string;
}

export interface NewPayment {
  codigo_pedido: string;
  monto_pagado: number;
  fecha_pago: string;
  tipo_tarjeta: CardType;
  referencia?: string;
}

export interface OrderStatusTransition {
  codigo_pedido: string;
  estado: OrderStatus;
}

export interface ProductRequest {
  codigo_producto: number;
  cantidad: number;
}

export interface ProductPreference {
  codigo_producto: number;
  cant_solicitudes: number;
  cantidad_total: number;
}
