export type EstadoPedido = "generado" | "en proceso" | "entregado" | "cancelado" | "facturado";
export type TipoTarjeta = "DB" | "CR";

export interface Provincia { codigo: string; nombre: string; }
export interface Cliente { codigo: number; nombre: string; documento: string; provincia: Provincia; saldo: number; tipoTarjeta: TipoTarjeta; }
export interface Producto { codigo: number; nombre: string; categoria: string; activo: boolean; }
export interface Inventario { productoCodigo: number; disponible: number; reservado: number; nivelReposicion: number; solicitados: number; }
export interface Pedido { codigo: string; clienteCodigo: number; productoCodigo: number; cantidad: number; monto: number; fechaPedido: string; fechaEntrega?: string; direccionEntrega: string; estado: EstadoPedido; pagado: boolean; }
export interface Pago { id: number; pedidoCodigo: string; monto: number; tipoTarjeta: TipoTarjeta; fechaPago: string; referencia: string; }

export type Vista = "resumen" | "clientes" | "productos" | "inventario" | "pedidos" | "pagos" | "reportes";
