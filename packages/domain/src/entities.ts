export const CARD_TYPES = ["DB", "CR"] as const satisfies readonly string[];
export type CardType = (typeof CARD_TYPES)[number];

export const ORDER_STATUSES = [
  "generated",
  "in process",
  "delivered",
  "canceled",
  "invoiced",
] as const satisfies readonly string[];
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Province {
  /** Stable uppercase prefix used in order codes. */
  code: string;
  name: string;
}

export interface Client {
  /** Database-generated integer, starting at 1. */
  code: number;
  name: string;
  email: string;
  phone: string;
  balance: number;
  createdAt: string;
}

export interface Product {
  /** Database-generated integer, starting at 1000. */
  code: number;
  name: string;
  description?: string;
  unitPrice: number;
  active: boolean;
}

export interface Inventory {
  productCode: number;
  quantityOnHand: number;
  quantityReserved: number;
  reorderLevel: number;
  updatedAt: string;
}

export interface OrderLine {
  productCode: number;
  quantity: number;
  /** Captured value prevents later catalog changes from rewriting history. */
  amount: number;
}

export interface Order {
  /** Province-prefixed application identifier, e.g. PA-SYN-0001. */
  code: string;
  clientCode: number;
  provinceCode: string;
  /** Delivery address is an immutable order snapshot, never a Client field. */
  deliveryAddress: string;
  orderDate: string;
  validDate?: string;
  deliveryDate?: string;
  status: OrderStatus;
  total: number;
  isPaid: boolean;
  monthlyRuleApplies: boolean;
  lines: readonly OrderLine[];
}

export interface Payment {
  /** Immutable payment-history key. */
  id: number;
  orderCode: string;
  amount: number;
  cardType: CardType;
  paidAt: string;
  reference: string;
}

export interface NewClient {
  name: string;
  email: string;
  phone: string;
  balance: number;
}

export interface NewProduct {
  name: string;
  description?: string;
  unitPrice: number;
  active: boolean;
}

export interface ProductRequest {
  productCode: number;
  quantity: number;
}

export interface ProductPreference {
  productCode: number;
  requestCount: number;
  totalQuantity: number;
}
