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

export type EstadoPedido = OrderStatus;
export type TipoTarjeta = CardType;
export type Provincia = Province;
export type Cliente = Client;
export type Producto = Product;
export type Inventario = Inventory;
export type Pedido = Order;
export type Pago = Payment;
export type NewCliente = NewClient;
export type NewPedido = NewOrder;
export type NewPago = NewPayment;

export type Vista =
  | "resumen"
  | "clientes"
  | "productos"
  | "inventario"
  | "pedidos"
  | "pagos"
  | "reportes";
