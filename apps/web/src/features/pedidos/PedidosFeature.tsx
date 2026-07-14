import { useEffect, useMemo, useState } from "react";
import { commerceApi, validarPedido, validarTransicion } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { DataTable } from "../../components/tables/DataTable";
import type { Cliente, EstadoPedido, NewPedido, Pedido, Producto } from "../../types/commerce";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "success";
      clientes: readonly Cliente[];
      productos: readonly Producto[];
      pedidos: readonly Pedido[];
      currentOrders: readonly Pedido[];
    };

const initialForm: NewPedido = {
  codigo_cliente: 1,
  codigo_producto: 1000,
  cantidad: 1,
  direccion: "",
  fecha_pedido: toLocalInputValue(new Date()),
  etiqueta: "pedido-web",
  tipo_duracion: "48h",
};

export function PedidosFeature() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [form, setForm] = useState<NewPedido>(initialForm);
  const [statusForm, setStatusForm] = useState<{ codigo_pedido: string; estado: EstadoPedido }>({
    codigo_pedido: "",
    estado: "proceso",
  });
  const [notice, setNotice] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      const [clientes, productos, pedidos, currentOrders] = await Promise.all([
        commerceApi.listClients(),
        commerceApi.listProducts(),
        commerceApi.listOrders(),
        commerceApi.listCurrentOrders(),
      ]);
      setState({ status: "success", clientes, productos, pedidos, currentOrders });
      setForm((current) => ({
        ...current,
        codigo_cliente: clientes[0]?.codigo_cliente ?? 1,
        codigo_producto: productos[0]?.codigo_producto ?? 1000,
      }));
      setStatusForm((current) => ({ ...current, codigo_pedido: currentOrders[0]?.codigo_pedido ?? pedidos[0]?.codigo_pedido ?? "" }));
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "No se pudieron cargar pedidos." });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedClient = useMemo(
    () => (state.status === "success" ? state.clientes.find((item) => item.codigo_cliente === form.codigo_cliente) : undefined),
    [state, form.codigo_cliente],
  );
  const selectedOrder = useMemo(
    () => (state.status === "success" ? state.pedidos.find((item) => item.codigo_pedido === statusForm.codigo_pedido) : undefined),
    [state, statusForm.codigo_pedido],
  );

  if (state.status === "loading") return <ResourceState status="loading" title="Pedidos" description="Cargando pedidos..." />;
  if (state.status === "error") return <ResourceState status="error" title="Pedidos" error={state.message} onRetry={load} />;
  if (state.pedidos.length === 0) return <ResourceState status="empty" title="Pedidos" description="No hay pedidos todavía." onRetry={load} />;

  const createOrder = async (): Promise<void> => {
    try {
      if (!selectedClient) throw new Error("Seleccione un cliente.");
      validarPedido(form, selectedClient);
      await commerceApi.createOrder(form);
      setNotice("Pedido creado en modo mock.");
      setForm((current) => ({ ...current, direccion: "" }));
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo crear el pedido.");
    }
  };

  const changeStatus = async (): Promise<void> => {
    try {
      if (!selectedOrder) throw new Error("Seleccione un pedido.");
      validarTransicion(selectedOrder, statusForm.estado);
      await commerceApi.transitionOrderStatus(statusForm.codigo_pedido, statusForm.estado);
      setNotice("Estado de pedido actualizado.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo actualizar el estado.");
    }
  };

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>Pedidos</h2>
          <p>Creación, consulta de pedidos actuales y transición de estados.</p>
        </div>
      </div>
      {notice ? <div className="demo-note">{notice}</div> : null}
      <div className="grid two">
        <section className="panel">
          <h3>Crear pedido</h3>
          <div className="form-grid">
            <Select
              label="Cliente"
              value={String(form.codigo_cliente)}
              options={state.clientes.map((cliente) => ({ value: String(cliente.codigo_cliente), label: `${cliente.nombre} ${cliente.apellido}` }))}
              onChange={(value) => setForm({ ...form, codigo_cliente: Number(value) })}
            />
            <Select
              label="Producto"
              value={String(form.codigo_producto)}
              options={state.productos.map((producto) => ({ value: String(producto.codigo_producto), label: producto.nombre }))}
              onChange={(value) => setForm({ ...form, codigo_producto: Number(value) })}
            />
            <Field label="Cantidad" value={String(form.cantidad)} onChange={(value) => setForm({ ...form, cantidad: Number(value) })} type="number" />
            <Field label="Dirección" value={form.direccion} onChange={(value) => setForm({ ...form, direccion: value })} />
            <Field label="Fecha pedido" value={form.fecha_pedido} onChange={(value) => setForm({ ...form, fecha_pedido: value })} type="datetime-local" />
            <Field label="Etiqueta" value={form.etiqueta} onChange={(value) => setForm({ ...form, etiqueta: value })} />
            <Field label="Tipo duración" value={form.tipo_duracion} onChange={(value) => setForm({ ...form, tipo_duracion: value })} />
          </div>
          <button className="primary-button" onClick={() => void createOrder()}>Crear pedido</button>
        </section>
        <section className="panel">
          <h3>Cambiar estado</h3>
          <div className="form-grid">
            <Select
              label="Pedido"
              value={statusForm.codigo_pedido}
              options={state.currentOrders.map((pedido) => ({ value: pedido.codigo_pedido, label: pedido.codigo_pedido }))}
              onChange={(value) => setStatusForm({ ...statusForm, codigo_pedido: value })}
            />
            <Select
              label="Estado"
              value={statusForm.estado}
              options={[{ value: "generado", label: "Generado" }, { value: "proceso", label: "En proceso" }, { value: "entregado", label: "Entregado" }, { value: "cancelado", label: "Cancelado" }, { value: "facturado", label: "Facturado" }]}
              onChange={(value) => setStatusForm({ ...statusForm, estado: value as EstadoPedido })}
            />
          </div>
          <button className="secondary-button" onClick={() => void changeStatus()}>Actualizar estado</button>
        </section>
      </div>
      <section className="panel">
        <h3>Pedidos actuales</h3>
        <DataTable
          columns={["Pedido", "Cliente", "Producto", "Fecha", "Estado"]}
          rows={state.currentOrders.map((pedido) => [
            pedido.codigo_pedido,
            clienteLabel(state.clientes, pedido.codigo_cliente),
            productoLabel(state.productos, pedido.codigo_producto),
            pedido.fecha_pedido,
            estadoLabel(pedido.estado),
          ])}
        />
      </section>
      <section className="panel">
        <h3>Historial de pedidos</h3>
        <DataTable
          columns={["Pedido", "Cliente", "Producto", "Monto", "Estado"]}
          rows={state.pedidos.map((pedido) => [
            pedido.codigo_pedido,
            clienteLabel(state.clientes, pedido.codigo_cliente),
            productoLabel(state.productos, pedido.codigo_producto),
            String(pedido.monto),
            estadoLabel(pedido.estado),
          ])}
        />
      </section>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  type?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange(value: string): void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function clienteLabel(clientes: readonly Cliente[], codigo: number): string {
  const cliente = clientes.find((item) => item.codigo_cliente === codigo);
  return cliente ? `${cliente.nombre} ${cliente.apellido}` : `Cliente ${codigo}`;
}

function productoLabel(productos: readonly Producto[], codigo: number): string {
  const producto = productos.find((item) => item.codigo_producto === codigo);
  return producto ? producto.nombre : `Producto ${codigo}`;
}

function estadoLabel(estado: EstadoPedido): string {
  return {
    generado: "Generado",
    proceso: "En proceso",
    entregado: "Entregado",
    cancelado: "Cancelado",
    facturado: "Facturado",
  }[estado];
}

function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
