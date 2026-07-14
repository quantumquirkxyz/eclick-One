import type { Cliente, Inventario, Pago, Pedido, Producto, Provincia } from "../types/commerce";

/** Datos sintéticos: reemplazados por los servicios REST cuando estén disponibles. */
export const provincias: Provincia[] = [
  { codigo: "PA", nombre: "Panamá" }, { codigo: "CH", nombre: "Chiriquí" }, { codigo: "CO", nombre: "Colón" }, { codigo: "OC", nombre: "Coclé" },
];

export const clientesMock: Cliente[] = [
  { codigo: 1, nombre: "Cliente sintético A", documento: "SYN-001", provincia: provincias[0]!, saldo: 220, tipoTarjeta: "CR" },
  { codigo: 2, nombre: "Cliente sintético B", documento: "SYN-002", provincia: provincias[1]!, saldo: 80, tipoTarjeta: "DB" },
  { codigo: 3, nombre: "Cliente sintético C", documento: "SYN-003", provincia: provincias[2]!, saldo: 0, tipoTarjeta: "CR" },
  { codigo: 4, nombre: "Cliente sintético D", documento: "SYN-004", provincia: provincias[3]!, saldo: 120, tipoTarjeta: "DB" },
];

export const productosMock: Producto[] = [
  { codigo: 1000, nombre: "Producto sintético Alfa", categoria: "Tecnología", activo: true },
  { codigo: 1001, nombre: "Producto sintético Beta", categoria: "Hogar", activo: true },
  { codigo: 1002, nombre: "Producto sintético Gamma", categoria: "Tecnología", activo: true },
  { codigo: 1003, nombre: "Producto sintético Delta", categoria: "Bienestar", activo: true },
];

export const inventarioMock: Inventario[] = [
  { productoCodigo: 1000, disponible: 30, reservado: 8, nivelReposicion: 8, solicitados: 19 },
  { productoCodigo: 1001, disponible: 18, reservado: 5, nivelReposicion: 6, solicitados: 14 },
  { productoCodigo: 1002, disponible: 6, reservado: 4, nivelReposicion: 7, solicitados: 11 },
  { productoCodigo: 1003, disponible: 24, reservado: 2, nivelReposicion: 5, solicitados: 7 },
];

export const pedidosMock: Pedido[] = [
  { codigo: "PA-SYN-0001", clienteCodigo: 1, productoCodigo: 1000, cantidad: 2, monto: 70, fechaPedido: "2024-12-27T12:00:00.000Z", fechaEntrega: "2024-12-29T12:00:00.000Z", direccionEntrega: "Dirección sintética 1", estado: "facturado", pagado: true },
  { codigo: "CH-SYN-0002", clienteCodigo: 2, productoCodigo: 1001, cantidad: 1, monto: 50, fechaPedido: "2024-12-28T10:00:00.000Z", direccionEntrega: "Dirección sintética 2", estado: "en proceso", pagado: false },
  { codigo: "CO-SYN-0003", clienteCodigo: 1, productoCodigo: 1002, cantidad: 3, monto: 90, fechaPedido: "2024-12-29T09:00:00.000Z", fechaEntrega: "2024-12-31T09:00:00.000Z", direccionEntrega: "Dirección sintética 3", estado: "entregado", pagado: true },
  { codigo: "OC-SYN-0004", clienteCodigo: 4, productoCodigo: 1003, cantidad: 1, monto: 50, fechaPedido: "2024-12-26T14:00:00.000Z", direccionEntrega: "Dirección sintética 4", estado: "generado", pagado: false },
];

export const pagosMock: Pago[] = [
  { id: 1, pedidoCodigo: "PA-SYN-0001", monto: 70, tipoTarjeta: "CR", fechaPago: "2024-12-27T12:00:00.000Z", referencia: "SYN-PAGO-001" },
  { id: 2, pedidoCodigo: "CO-SYN-0003", monto: 90, tipoTarjeta: "DB", fechaPago: "2024-12-29T09:00:00.000Z", referencia: "SYN-PAGO-002" },
];
