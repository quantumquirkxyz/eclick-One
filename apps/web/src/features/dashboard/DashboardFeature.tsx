import { useEffect, useState } from "react";
import { commerceApi, type DashboardSnapshot } from "../../services/api/commerce";
import { DataTable } from "../../components/tables/DataTable";
import { ResourceState } from "../../components/layout/ResourceState";
import { StatusChart } from "../../components/charts/StatusChart";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: DashboardSnapshot };

export function DashboardFeature() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      setState({ status: "success", data: await commerceApi.getDashboard() });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "No se pudo cargar el dashboard." });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (state.status === "loading") {
    return <ResourceState status="loading" title="Resumen" description="Cargando métricas operativas..." />;
  }

  if (state.status === "error") {
    return <ResourceState status="error" title="Resumen" error={state.message} onRetry={load} />;
  }

  const { data } = state;
  const nonEmpty = data.metrics.orders > 0;

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>Centro de operaciones</h2>
          <p>{data.notice}</p>
        </div>
      </div>
      <div className="metrics">
        <Metric label="Clientes" value={String(data.metrics.clients)} note="Base activa" />
        <Metric label="Pedidos actuales" value={String(data.metrics.currentOrders)} note="Generados o en proceso" />
        <Metric label="Cobrado" value={money.format(data.metrics.collected)} note="Historial de pagos" />
        <Metric label="No paz y salvo" value={String(data.metrics.notPazYSalvo)} note="Bloquea creación" />
      </div>
      <div className="grid two">
        <StatusChart title="Pedidos por estado" values={data.orderStatuses} />
        <section className="panel">
          <h3>Alertas operativas</h3>
          <ul className="alerts">
            <li>{data.metrics.atRiskOrders} pedidos en proceso superan o se acercan a 48 horas.</li>
            <li>{data.nonCompliantClients.length} clientes no están paz y salvo.</li>
            <li>La persistencia real se mantiene preparada, pero la app corre sobre mock en memoria.</li>
          </ul>
        </section>
      </div>
      <div className="grid two">
        <section className="panel">
          <h3>Pedidos por mes</h3>
          <DataTable
            columns={["Mes", "Pedidos"]}
            rows={data.ordersByMonth.length ? data.ordersByMonth.map((row) => [row.month, String(row.orders)]) : [["Sin datos", "0"]]}
          />
        </section>
        <section className="panel">
          <h3>Pagos por mes</h3>
          <DataTable
            columns={["Mes", "Pagos", "Monto"]}
            rows={
              data.paymentsByMonth.length
                ? data.paymentsByMonth.map((row) => [row.month, String(row.payments), money.format(row.amount)])
                : [["Sin datos", "-", "-"]]
            }
          />
        </section>
        <section className="panel">
          <h3>Preferencia por cliente</h3>
          <DataTable
            columns={["Cliente", "Preferencia", "Estado"]}
            rows={
              data.preferencesByClient.length
                ? data.preferencesByClient.map((row) => [
                    `${row.nombre} ${row.apellido}`,
                    row.preference ? `Producto ${row.preference.codigo_producto}` : "Sin preferencia",
                    row.preference ? "Calculada" : "Pendiente",
                  ])
                : [["Sin clientes", "-", "-"]]
            }
          />
        </section>
      </div>
      <section className="panel">
        <h3>Inventario</h3>
        <DataTable
          columns={["Producto", "Ventas", "Bodega", "Reservado", "Disponible"]}
          rows={data.inventorySummary.map((item) => [
            `${item.nombre} (${item.codigo_producto})`,
            String(item.ventas),
            String(item.bodega),
            String(item.reservado),
            String(item.disponible),
          ])}
        />
      </section>
      <section className="panel">
        <h3>Productos más consumidos</h3>
        <DataTable
          columns={["Producto", "Cantidad", "Pedidos"]}
          rows={data.topProducts.map((item) => [
            `${item.nombre} (${item.codigo_producto})`,
            String(item.cantidad),
            String(item.pedidos),
          ])}
        />
      </section>
      {!nonEmpty ? <ResourceState status="empty" title="Resumen" description="Todavía no hay pedidos registrados." onRetry={load} /> : null}
    </section>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="metric">
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

const money = new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" });
