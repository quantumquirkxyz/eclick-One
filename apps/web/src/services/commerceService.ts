import { amountForQuantity, assertClientCanGenerateOrder, assertOrderDateAllowed, calculateDeliveryDate } from "@eclick-one/domain";
import { clientesMock, inventarioMock, pagosMock, pedidosMock, productosMock } from "../mocks/commerce";
import type { Cliente, Inventario, Pago, Pedido, Producto } from "../types/commerce";

export interface ComercioServicio {
  listarClientes(): Promise<readonly Cliente[]>;
  listarProductos(): Promise<readonly Producto[]>;
  listarInventario(): Promise<readonly Inventario[]>;
  listarPedidos(): Promise<readonly Pedido[]>;
  listarPagos(): Promise<readonly Pago[]>;
}

export const comercioMockService: ComercioServicio = {
  listarClientes: async () => clientesMock,
  listarProductos: async () => productosMock,
  listarInventario: async () => inventarioMock,
  listarPedidos: async () => pedidosMock,
  listarPagos: async () => pagosMock,
};

export function validarPedidoSintetico(
  cliente: Cliente,
  cantidad: number,
  fecha: string,
): Pick<Pedido, "monto" | "fechaEntrega"> {
  assertClientCanGenerateOrder(cliente.saldo);
  assertOrderDateAllowed(fecha);
  return { monto: amountForQuantity(cantidad), fechaEntrega: calculateDeliveryDate(fecha) };
}
