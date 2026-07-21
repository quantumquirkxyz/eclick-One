import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { commerceApi, type DashboardSnapshot } from "../../services/api/commerce";
import { DataTable } from "../../components/tables/DataTable";
import { ResourceState } from "../../components/layout/ResourceState";
import { EmptyState } from "../../components/EmptyState";
import { StatusChart } from "../../components/charts/StatusChart";
import { AgentActivityPanel } from "../../components/agent/AgentActivityPanel";
import { Skeleton, SkeletonCard, SkeletonChart, SkeletonPage, SkeletonPageTitle, SkeletonTable, SkeletonText } from "../../components/Skeleton";
import { useI18n } from "../../i18n";
import { normalizeAppError, type AppError } from "../../services/api/client";

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: AppError }
  | { status: "success"; data: DashboardSnapshot };

export function DashboardFeature() {
  const { t, money, productName } = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      setState({ status: "success", data: await commerceApi.getDashboard() });
    } catch (error) {
      setState({ status: "error", error: normalizeAppError(error, t("dashboard.error")) });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (state.status === "loading") {
    return <DashboardLoadingSkeleton title={t("nav.summary")} description={t("dashboard.loading")} />;
  }

  if (state.status === "error") {
    return <ResourceState status="error" title={t("nav.summary")} error={state.error} onRetry={load} />;
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
      {!nonEmpty ? (
        <section className="panel">
          <EmptyState
            icon={LayoutDashboard}
            title={t("dashboard.emptyTitle")}
            description={t("dashboard.emptyDescription")}
            actionLabel={t("dashboard.emptyAction")}
            onAction={load}
          />
        </section>
      ) : null}
      <div className="metrics">
        <Metric label={t("nav.customers")} value={String(data.metrics.clients)} note={t("dashboard.activeBase")} />
        <Metric label={t("dashboard.currentOrders")} value={String(data.metrics.currentOrders)} note={t("dashboard.generatedOrProcess")} />
        <Metric label={t("dashboard.collected")} value={money(data.metrics.collected)} note={t("dashboard.paymentHistory")} />
        <Metric label={t("dashboard.notCompliant")} value={String(data.metrics.notPazYSalvo)} note={t("dashboard.blocksCreation")} />
      </div>
      <div className="grid two">
        <StatusChart title={t("dashboard.ordersByStatus")} values={data.orderStatuses} />
        <AgentActivityPanel />
      </div>
      <div className="grid two">
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
    </section>
  );
}

function DashboardLoadingSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <SkeletonPage title={title} description={description}>
      <SkeletonPageTitle />
      <div className="metrics">
        {Array.from({ length: 4 }, (_, index) => (
          <article className="metric skeleton-metric-card" key={index} aria-hidden="true">
            <Skeleton className="skeleton-metric-label" />
            <Skeleton className="skeleton-metric-value" />
            <Skeleton className="skeleton-metric-note" />
          </article>
        ))}
      </div>
      <div className="grid two">
        <SkeletonChart height={260} />
        <SkeletonCard lines={5} />
      </div>
      <div className="grid two">
        <SkeletonCard lines={3} />
      </div>
      <div className="grid two">
        <section className="panel" aria-hidden="true">
          <Skeleton className="skeleton-heading" />
          <SkeletonTable columns={2} rows={4} className="skeleton-table-compact" />
        </section>
        <section className="panel" aria-hidden="true">
          <Skeleton className="skeleton-heading" />
          <SkeletonTable columns={3} rows={4} className="skeleton-table-compact" />
        </section>
        <section className="panel" aria-hidden="true">
          <Skeleton className="skeleton-heading" />
          <SkeletonText lines={2} className="skeleton-stack-gap" />
          <SkeletonTable columns={3} rows={4} className="skeleton-table-compact" />
        </section>
      </div>
      <section className="panel" aria-hidden="true">
        <Skeleton className="skeleton-heading" />
        <SkeletonTable columns={5} rows={5} />
      </section>
      <section className="panel" aria-hidden="true">
        <Skeleton className="skeleton-heading" />
        <SkeletonTable columns={3} rows={5} />
      </section>
    </SkeletonPage>
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
