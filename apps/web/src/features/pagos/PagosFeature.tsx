import { useEffect, useMemo, useState } from "react";
import { commerceApi, validarPago } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { DataTable } from "../../components/tables/DataTable";
import type { EstadoPedido, NewPago, Pago, Pedido } from "../../types/commerce";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; pagos: readonly Pago[]; pedidos: readonly Pedido[] };

type PagoForm = Omit<NewPago, "referencia"> & { referencia?: string };

const initialForm: PagoForm = {
  codigo_pedido: "",
  monto_pagado: 0,
  fecha_pago: toLocalInputValue(new Date()),
  tipo_tarjeta: "DB",
};

export function PagosFeature() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [form, setForm] = useState<PagoForm>(initialForm);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      const [pagos, pedidos] = await Promise.all([commerceApi.listPayments(), commerceApi.listOrders()]);
      setState({ status: "success", pagos, pedidos });
      const paymentable = pedidos.find((pedido) => !pedido.pagado) ?? pedidos[0];
      if (paymentable) {
        setForm((current) => ({
          ...current,
          codigo_pedido: paymentable.codigo_pedido,
          monto_pagado: paymentable.monto,
        }));
      }
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "No se pudieron cargar pagos." });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedOrder = useMemo(
    () => (state.status === "success" ? state.pedidos.find((pedido) => pedido.codigo_pedido === form.codigo_pedido) : undefined),
    [state, form.codigo_pedido],
  );

  if (state.status === "loading") return <ResourceState status="loading" title="Pagos" description="Cargando pagos..." />;
  if (state.status === "error") return <ResourceState status="error" title="Pagos" error={state.message} onRetry={load} />;
  if (state.pagos.length === 0) return <ResourceState status="empty" title="Pagos" description="No hay pagos aún." onRetry={load} />;

  const recordPayment = async (): Promise<void> => {
    try {
      if (!selectedOrder) throw new Error("Seleccione un pedido.");
      const request: NewPago = { ...form, ...(form.referencia ? { referencia: form.referencia } : {}) };
      validarPago(request, selectedOrder);
      await commerceApi.recordPayment(request);
      setNotice("Pago registrado en modo mock.");
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo registrar el pago.");
    }
  };

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>Pagos</h2>
          <p>Registro de pagos con referencia y sin almacenar datos completos de tarjeta.</p>
        </div>
      </div>
      {notice ? <div className="demo-note">{notice}</div> : null}
      <div className="grid two">
        <section className="panel">
          <h3>Registrar pago</h3>
          <div className="form-grid">
            <Select
              label="Pedido"
              value={form.codigo_pedido}
              options={state.pedidos.map((pedido) => ({ value: pedido.codigo_pedido, label: `${pedido.codigo_pedido} · ${pedido.estado}` }))}
              onChange={(value) => {
                const pedido = state.pedidos.find((item) => item.codigo_pedido === value);
                setForm({
                  ...form,
                  codigo_pedido: value,
                  monto_pagado: pedido?.monto ?? form.monto_pagado,
                });
              }}
            />
            <Field label="Monto" value={String(form.monto_pagado)} onChange={(value) => setForm({ ...form, monto_pagado: Number(value) })} type="number" />
            <Field label="Fecha pago" value={form.fecha_pago} onChange={(value) => setForm({ ...form, fecha_pago: value })} type="datetime-local" />
            <Select
              label="Tipo tarjeta"
              value={form.tipo_tarjeta}
              options={[{ value: "DB", label: "DB" }, { value: "CR", label: "CR" }]}
              onChange={(value) => setForm({ ...form, tipo_tarjeta: value as NewPago["tipo_tarjeta"] })}
            />
            <Field
              label="Referencia"
              value={form.referencia ?? ""}
              onChange={(value) =>
                setForm(
                  value.trim().length
                    ? { ...form, referencia: value }
                    : (() => {
                        const next = { ...form };
                        delete next.referencia;
                        return next;
                      })(),
                )
              }
            />
          </div>
          <button className="primary-button" onClick={() => void recordPayment()}>Registrar pago</button>
        </section>
        <section className="panel">
          <h3>Pedidos actuales</h3>
          <DataTable
            columns={["Pedido", "Estado", "Monto"]}
            rows={state.pedidos
              .filter((pedido) => pedido.estado === "generado" || pedido.estado === "proceso")
              .map((pedido) => [pedido.codigo_pedido, estadoLabel(pedido.estado), String(pedido.monto)])}
          />
        </section>
      </div>
      <section className="panel">
        <h3>Historial</h3>
        <DataTable
          columns={["ID", "Pedido", "Monto", "Tarjeta", "Fecha", "Referencia"]}
          rows={state.pagos.map((pago) => [
            String(pago.id_pago),
            pago.codigo_pedido,
            String(pago.monto_pagado),
            pago.tipo_tarjeta,
            pago.fecha_pago,
            pago.referencia ?? "Sin referencia",
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
