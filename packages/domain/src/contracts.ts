import type {
  Client,
  Inventory,
  JwtPayload,
  NewClient,
  NewOrder,
  NewPayment,
  NewUser,
  Order,
  OrderStatusTransition,
  Payment,
  Product,
  ProductPreference,
  Province,
  RefreshTokenRecord,
  User,
} from "./entities";

export interface ProvinceRepository {
  listProvinces(): Promise<readonly Province[]>;
}

export interface ClientRepository {
  listClients(): Promise<readonly Client[]>;
  findClientByCode(code: number): Promise<Client | null>;
  createClient(input: NewClient): Promise<Client>;
  getClientPreference(code: number): Promise<ProductPreference | null>;
}

export interface ProductRepository {
  listProducts(): Promise<readonly Product[]>;
}

export interface InventoryRepository {
  listInventory(): Promise<readonly Inventory[]>;
}

export interface OrderRepository {
  listOrders(): Promise<readonly Order[]>;
  listCurrentOrders(): Promise<readonly Order[]>;
  createOrder(input: NewOrder): Promise<Order>;
  transitionOrderStatus(input: OrderStatusTransition): Promise<Order>;
}

export interface PaymentRepository {
  /** Implementations must return history; they must not collapse payments by order. */
  listPayments(): Promise<readonly Payment[]>;
  recordPayment(input: NewPayment): Promise<Payment>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  createUser(input: NewUser): Promise<User>;
  saveRefreshToken(userId: number, tokenHash: string, expiresAt: string): Promise<RefreshTokenRecord>;
  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
}

export type CommerceRepositories = ProvinceRepository &
  ClientRepository &
  ProductRepository &
  InventoryRepository &
  OrderRepository &
  PaymentRepository;
