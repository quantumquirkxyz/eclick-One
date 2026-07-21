import { useEffect, useState } from "react";
import { commerceApi } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { DataTable } from "../../components/tables/DataTable";
import { Skeleton, SkeletonPage, SkeletonPageTitle, SkeletonTable } from "../../components/Skeleton";
import { useI18n } from "../../i18n";
import type { CommerceInventory } from "../../types/commerce";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "success"; inventory: readonly CommerceInventory[] };

export function InventoryFeature() {
  const { t } = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      setState({ status: "success", inventory: await commerceApi.listInventory() });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : t("inventory.error") });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (state.status === "loading") return <InventoryLoadingSkeleton title={t("inventory.title")} description={t("inventory.loading")} />;
  if (state.status === "error") return <ResourceState status="error" title={t("inventory.title")} error={state.message} onRetry={load} />;
  if (state.inventory.length === 0) return <ResourceState status="empty" title={t("inventory.title")} description={t("inventory.empty")} onRetry={load} />;

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>{t("inventory.title")}</h2>
          <p>{t("inventory.subtitle")}</p>
        </div>
      </div>
      <section className="panel">
        <h3>{t("inventory.summary")}</h3>
        <DataTable
          columns={[t("common.product"), t("dashboard.sales"), t("dashboard.warehouse"), t("dashboard.reserved"), t("dashboard.available")]}
          rows={state.inventory.map((item) => [
            String(item.codigo_producto),
            String(item.cant_ventas),
            String(item.cant_bodega),
            String(item.cant_reservado),
            String(item.cant_bodega - item.cant_reservado),
          ])}
        />
      </section>
    </section>
  );
}

function InventoryLoadingSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <SkeletonPage title={title} description={description}>
      <SkeletonPageTitle />
      <section className="panel" aria-hidden="true">
        <Skeleton className="skeleton-heading" />
        <SkeletonTable columns={5} rows={8} />
      </section>
    </SkeletonPage>
  );
}
