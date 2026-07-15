import { useEffect, useState } from "react";
import { commerceApi, type DashboardSnapshot } from "../../services/api/commerce";
import { DataTable } from "../../components/tables/DataTable";
import { ResourceState } from "../../components/layout/ResourceState";
import { StatusChart } from "../../components/charts/StatusChart";
import { useI18n } from "../../i18n";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: DashboardSnapshot };

export function DashboardFeature() {
  const { t, money, productName } = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      setState({ status: "success", data: await commerceApi.getDashboard() });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : t("dashboard.error") });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (state.status === "loading") {
    return <ResourceState status="loading" title={t("nav.summary")} description={t("dashboard.loading")} />;
  }

  if (state.status === "error") {
    return <ResourceState status="error" title={t("nav.summary")} error={state.message} onRetry={load} />;
  }

  const { data } = state;
  const nonEmpty = data.metrics.orders > 0;

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>{t("dashboard.title")}</h2>
          <p>{data.notice}</p>
        </div>
      </div>
      <div className="metrics">
        <Metric label={t("nav.customers")} value={String(data.metrics.clients)} note={t("dashboard.activeBase")} />
        <Metric label={t("dashboard.currentOrders")} value={String(data.metrics.currentOrders)} note={t("dashboard.generatedOrProcess")} />
        <Metric label={t("dashboard.collected")} value={money(data.metrics.collected)} note={t("dashboard.paymentHistory")} />
        <Metric label={t("dashboard.notCompliant")} value={String(data.metrics.notPazYSalvo)} note={t("dashboard.blocksCreation")} />
      </div>
      <div className="grid two">
        <StatusChart title={t("dashboard.ordersByStatus")} values={data.orderStatuses} />
        <section className="panel">
          <h3>{t("dashboard.alerts")}</h3>
          <ul className="alerts">
            <li>{data.metrics.atRiskOrders} {t("dashboard.atRisk")}</li>
            <li>{data.nonCompliantClients.length} {t("dashboard.nonCompliant")}</li>
            <li>{t("dashboard.mockPersistence")}</li>
          </ul>
        </section>
      </div>
      <div className="grid two">
        <section className="panel">
          <h3>{t("dashboard.ordersByMonth")}</h3>
          <DataTable
            columns={["Month", t("nav.orders")]}
            rows={data.ordersByMonth.length ? data.ordersByMonth.map((row) => [row.month, String(row.orders)]) : [[t("common.noData"), "0"]]}
          />
        </section>
        <section className="panel">
          <h3>{t("dashboard.paymentsByMonth")}</h3>
          <DataTable
            columns={["Month", t("nav.payments"), t("common.amount")]}
            rows={
              data.paymentsByMonth.length
                ? data.paymentsByMonth.map((row) => [row.month, String(row.payments), money(row.amount)])
                : [[t("common.noData"), "-", "-"]]
            }
          />
        </section>
        <section className="panel">
          <h3>{t("dashboard.preferenceByCustomer")}</h3>
          <DataTable
            columns={[t("common.customer"), t("customers.preference"), t("common.status")]}
            rows={
              data.preferencesByClient.length
                ? data.preferencesByClient.map((row) => [
                    `${row.nombre} ${row.apellido}`,
                    row.preference ? `${t("common.product")} ${row.preference.codigo_producto}` : t("dashboard.noPreference"),
                    row.preference ? t("common.calculated") : t("common.pending"),
                  ])
                : [[t("dashboard.noCustomers"), "-", "-"]]
            }
          />
        </section>
      </div>
      <section className="panel">
        <h3>{t("nav.inventory")}</h3>
        <DataTable
          columns={[t("common.product"), t("dashboard.sales"), t("dashboard.warehouse"), t("dashboard.reserved"), t("dashboard.available")]}
          rows={data.inventorySummary.map((item) => [
            `${productName(item.codigo_producto, item.nombre)} (${item.codigo_producto})`,
            String(item.ventas),
            String(item.bodega),
            String(item.reservado),
            String(item.disponible),
          ])}
        />
      </section>
      <section className="panel">
        <h3>{t("dashboard.topProducts")}</h3>
        <DataTable
          columns={[t("common.product"), t("dashboard.quantity"), t("nav.orders")]}
          rows={data.topProducts.map((item) => [
            `${productName(item.codigo_producto, item.nombre)} (${item.codigo_producto})`,
            String(item.cantidad),
            String(item.pedidos),
          ])}
        />
      </section>
      {!nonEmpty ? <ResourceState status="empty" title={t("nav.summary")} description={t("dashboard.empty")} onRetry={load} /> : null}
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
