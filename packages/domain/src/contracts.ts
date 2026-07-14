import type { Client, Inventory, Order, Payment, Product, Province } from "./entities";

export interface ProvinceRepository {
  listProvinces(): Promise<readonly Province[]>;
}

export interface ClientRepository {
  listClients(): Promise<readonly Client[]>;
  findClientByCode(code: number): Promise<Client | null>;
}

export interface ProductRepository {
  listProducts(): Promise<readonly Product[]>;
}

export interface InventoryRepository {
  listInventory(): Promise<readonly Inventory[]>;
}

export interface OrderRepository {
  listOrders(): Promise<readonly Order[]>;
}

export interface PaymentRepository {
  /** Implementations must return history; they must not collapse payments by order. */
  listPayments(): Promise<readonly Payment[]>;
}

export type CommerceRepositories = ProvinceRepository &
  ClientRepository &
  ProductRepository &
  InventoryRepository &
  OrderRepository &
  PaymentRepository;
