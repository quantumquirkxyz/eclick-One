import type {
  CardType,
  Client,
  Inventory,
  NewClient,
  NewOrder,
  NewPayment,
  Order,
  OrderStatus,
  Payment,
  Product,
  Province,
} from "@eclick-one/domain";

export type CardKind = CardType;
export type CommerceProvince = Province;
export type CommerceClient = Client;
export type CommerceProduct = Product;
export type CommerceInventory = Inventory;
export type CommerceOrder = Order;
export type CommerceOrderStatus = OrderStatus;
export type CommercePayment = Payment;
export type NewCommerceClient = NewClient;
export type NewCommerceOrder = NewOrder;
export type NewCommercePayment = NewPayment;
