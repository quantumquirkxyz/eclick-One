import { useEffect, useMemo, useState } from "react";
import { BarChart3, Bell, Boxes, CircleDollarSign, ClipboardList, LayoutDashboard, Menu, Package, Users } from "lucide-react";
import type { EChartsOption } from "echarts";
import { Chart } from "./components/Chart";
import { comercioMockService } from "./services/commerceService";
import type { Cliente, Inventario, Pago, Pedido, Producto, Vista } from "./types/commerce";

const navegacion: { vista: Vista; etiqueta: string; icono: typeof LayoutDashboard }[] = [
  { vista: "resumen", etiqueta: "Resumen", icono: LayoutDashboard }, { vista: "clientes", etiqueta: "Clientes", icono: Users },
  { vista: "pedidos", etiqueta: "Pedidos", icono: ClipboardList }, { vista: "pagos", etiqueta: "Pagos", icono: CircleDollarSign },
  { vista: "productos", etiqueta: "Productos", icono: Package }, { vista: "inventario", etiqueta: "Inventario", icono: Boxes }, { vista: "reportes", etiqueta: "Reportes", icono: BarChart3 },
];
const dinero = new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" });
const fecha = new Intl.DateTimeFormat("es-PA", { day: "2-digit", month: "short", year: "numeric" });

interface Datos { clientes: readonly Cliente[]; productos: readonly Producto[]; inventario: readonly Inventario[]; pedidos: readonly Pedido[]; pagos: readonly Pago[]; }

export function App() {
  const [vista, setVista] = useState<Vista>("resumen");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [datos, setDatos] = useState<Datos | null>(null);
  useEffect(() => { void Promise.all([comercioMockService.listarClientes(), comercioMockService.listarProductos(), comercioMockService.listarInventario(), comercioMockService.listarPedidos(), comercioMockService.listarPagos()]).then(([clientes, productos, inventario, pedidos, pagos]) => setDatos({ clientes, productos, inventario, pedidos, pagos })); }, []);
  if (!datos) return <main className="loading">Cargando datos sintéticos…</main>;
  return <div className="app"><Aside vista={vista} seleccionar={setVista} abierto={menuAbierto} cerrar={() => setMenuAbierto(false)} /><div className="workspace"><header><button className="icon-button mobile" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú"><Menu /></button><div><p className="eyebrow">eclick One · Panamá</p><h1>{navegacion.find((item) => item.vista === vista)?.etiqueta}</h1></div><div className="header-actions"><span className="synthetic">Datos sintéticos</span><button className="icon-button" aria-label="Notificaciones"><Bell /></button><span className="avatar">EO</span></div></header><main className="content"><div className="demo-note">Entorno de demostración: no contiene datos reales ni está conectado a Azure SQL.</div><VistaActual vista={vista} datos={datos} /></main></div></div>;
}

function Aside({ vista, seleccionar, abierto, cerrar }: { vista: Vista; seleccionar: (vista: Vista) => void; abierto: boolean; cerrar: () => void }) {
  return <aside className={`sidebar ${abierto ? "open" : ""}`}><div className="brand"><span className="brand-mark">e</span><div><strong>eclick One</strong><small>OPERATIONS</small></div><button className="close mobile" onClick={cerrar}>×</button></div><nav>{navegacion.map(({ vista: itemVista, etiqueta, icono: Icono }) => <button key={itemVista} className={vista === itemVista ? "active" : ""} onClick={() => { seleccionar(itemVista); cerrar(); }}><Icono size={18} />{etiqueta}</button>)}</nav><div className="side-footer">OPERACIÓN COMERCIAL<br /><span>Datos de demostración</span></div></aside>;
}

function VistaActual({ vista, datos }: { vista: Vista; datos: Datos }) {
  if (vista === "resumen") return <Resumen datos={datos} />;
  if (vista === "clientes") return <Clientes clientes={datos.clientes} pedidos={datos.pedidos} />;
  if (vista === "productos" || vista === "inventario") return <InventarioVista productos={datos.productos} inventario={datos.inventario} />;
  if (vista === "pedidos") return <Pedidos pedidos={datos.pedidos} clientes={datos.clientes} productos={datos.productos} />;
  if (vista === "pagos") return <Pagos pagos={datos.pagos} />;
  return <Reportes pedidos={datos.pedidos} inventario={datos.inventario} />;
}

function Resumen({ datos }: { datos: Datos }) {
  const ventas = datos.pedidos.filter((pedido) => pedido.estado !== "cancelado").reduce((total, pedido) => total + pedido.monto, 0);
  const cobrados = datos.pagos.reduce((total, pago) => total + pago.monto, 0);
  const criticos = datos.inventario.filter((item) => item.disponible - item.reservado <= item.nivelReposicion).length;
  const option = useMemo<EChartsOption>(() => ({ tooltip: { trigger: "axis" }, xAxis: { type: "category", data: ["Generados", "Proceso", "Entregados", "Facturados"] }, yAxis: { type: "value" }, series: [{ type: "bar", data: [1, 1, 1, 1], itemStyle: { color: "#0f766e", borderRadius: [5, 5, 0, 0] } }], grid: { left: 35, right: 20, top: 25, bottom: 30 } }), []);
  return <section><div className="page-title"><div><h2>Centro de operaciones</h2><p>Seguimiento del estado comercial con información sintética.</p></div></div><div className="metrics"><Metric etiqueta="Ventas del período" valor={dinero.format(ventas)} nota="Sintético" /><Metric etiqueta="Pedidos activos" valor={String(datos.pedidos.filter((p) => !["entregado", "cancelado"].includes(p.estado)).length)} nota="Regla 48 h" /><Metric etiqueta="Cobrado" valor={dinero.format(cobrados)} nota="Historial de pagos" /><Metric etiqueta="Stock crítico" valor={String(criticos)} nota="Requiere revisión" /></div><div className="grid two"><Panel titulo="Pedidos por estado" subtitulo="Distribución operativa actual"><Chart option={option} /></Panel><Panel titulo="Alertas operativas" subtitulo="Acciones pendientes"><ul className="alerts"><li>Pedidos sin pago no son entregables.</li><li>Cliente sin saldo positivo no puede generar pedidos.</li><li>Inventario cercano al nivel de reposición.</li></ul></Panel></div><Pedidos pedidos={datos.pedidos.slice(0, 4)} clientes={datos.clientes} productos={datos.productos} compacto /></section>;
}

function Metric({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota: string }) { return <article className="metric"><p>{etiqueta}</p><strong>{valor}</strong><small>{nota}</small></article>; }
function Panel({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) { return <section className="panel"><h3>{titulo}</h3><p>{subtitulo}</p>{children}</section>; }

function Clientes({ clientes, pedidos }: { clientes: readonly Cliente[]; pedidos: readonly Pedido[] }) { return <section><Titulo titulo="Clientes" texto="Cartera, elegibilidad y actividad comercial" /><Tabla columnas={["Código", "Cliente", "Provincia", "Tarjeta", "Saldo", "Pedidos"]} filas={clientes.map((cliente) => [String(cliente.codigo), cliente.nombre, cliente.provincia.nombre, cliente.tipoTarjeta, dinero.format(cliente.saldo), String(pedidos.filter((pedido) => pedido.clienteCodigo === cliente.codigo).length)])} /></section>; }
function InventarioVista({ productos, inventario }: { productos: readonly Producto[]; inventario: readonly Inventario[] }) { return <section><Titulo titulo="Productos e inventario" texto="Disponibilidad, reserva y velocidad de consumo" /><div className="product-grid">{productos.map((producto) => { const item = inventario.find((value) => value.productoCodigo === producto.codigo)!; const libres = item.disponible - item.reservado; return <article className="product" key={producto.codigo}><span>{libres <= item.nivelReposicion ? "Stock crítico" : `${libres} libres`}</span><h3>{producto.nombre}</h3><p>{producto.categoria} · Código {producto.codigo}</p><div className="progress"><i style={{ width: `${Math.min(100, (item.reservado / item.disponible) * 100)}%` }} /></div><small>{item.reservado} reservadas · {item.disponible} en bodega</small></article>; })}</div></section>; }
function Pedidos({ pedidos, clientes, productos, compacto = false }: { pedidos: readonly Pedido[]; clientes: readonly Cliente[]; productos: readonly Producto[]; compacto?: boolean }) { const cliente = (codigo: number) => clientes.find((item) => item.codigo === codigo)?.nombre ?? "Cliente no encontrado"; const producto = (codigo: number) => productos.find((item) => item.codigo === codigo)?.nombre ?? "Producto no encontrado"; return <section><Titulo titulo={compacto ? "Pedidos recientes" : "Pedidos"} texto={compacto ? "Muestra sintética" : "Ciclo de venta, pago y entrega"} /><Tabla columnas={["Pedido", "Cliente", "Producto", "Fecha", "Monto", "Estado"]} filas={pedidos.map((pedido) => [pedido.codigo, cliente(pedido.clienteCodigo), producto(pedido.productoCodigo), fecha.format(new Date(pedido.fechaPedido)), dinero.format(pedido.monto), pedido.estado])} /></section>; }
function Pagos({ pagos }: { pagos: readonly Pago[] }) { return <section><Titulo titulo="Pagos" texto="Historial inmutable de cobros sintéticos" /><Tabla columnas={["ID", "Pedido", "Monto", "Tarjeta", "Fecha", "Referencia"]} filas={pagos.map((pago) => [String(pago.id), pago.pedidoCodigo, dinero.format(pago.monto), pago.tipoTarjeta, fecha.format(new Date(pago.fechaPago)), pago.referencia])} /></section>; }
function Reportes({ pedidos, inventario }: { pedidos: readonly Pedido[]; inventario: readonly Inventario[] }) { const option = useMemo<EChartsOption>(() => ({ tooltip: { trigger: "axis" }, xAxis: { type: "category", data: ["Producto 1000", "1001", "1002", "1003"] }, yAxis: { type: "value" }, series: [{ type: "line", smooth: true, data: inventario.map((item) => item.solicitados), lineStyle: { color: "#0f766e", width: 3 }, itemStyle: { color: "#0f766e" } }], grid: { left: 45, right: 20, top: 25, bottom: 40 } }), [inventario]); return <section><Titulo titulo="Reportes" texto="Lectura ejecutiva del período permitido: días 1 al 30" /><div className="metrics"><Metric etiqueta="Pedidos incluidos" valor={String(pedidos.length)} nota="Datos sintéticos" /><Metric etiqueta="Preferencia" valor="Producto 1000" nota="Tres o más solicitudes" /></div><Panel titulo="Demanda por producto" subtitulo="Información de demostración"><Chart option={option} height={320} /></Panel></section>; }
function Titulo({ titulo, texto }: { titulo: string; texto: string }) { return <div className="page-title"><div><h2>{titulo}</h2><p>{texto}</p></div></div>; }
function Tabla({ columnas, filas }: { columnas: readonly string[]; filas: readonly (readonly string[])[] }) { return <div className="table-panel"><table><thead><tr>{columnas.map((columna) => <th key={columna}>{columna}</th>)}</tr></thead><tbody>{filas.map((fila, index) => <tr key={`${fila[0]}-${index}`}>{fila.map((celda, cellIndex) => <td key={cellIndex}>{cellIndex === fila.length - 1 ? <span className="status">{celda}</span> : celda}</td>)}</tr>)}</tbody></table></div>; }
