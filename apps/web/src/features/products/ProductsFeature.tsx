import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { commerceApi } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { EmptyState } from "../../components/EmptyState";
import { DataTable } from "../../components/tables/DataTable";
import { Skeleton, SkeletonPage, SkeletonPageTitle, SkeletonTable } from "../../components/Skeleton";
import { useI18n } from "../../i18n";
import type { CommerceProduct } from "../../types/commerce";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "success"; products: readonly CommerceProduct[] };

export function ProductsFeature() {
  const { t, productName, categoryName } = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      setState({ status: "success", products: await commerceApi.listProducts() });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : t("products.error") });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (state.status === "loading") return <ProductsLoadingSkeleton title={t("products.title")} description={t("products.loading")} />;
  if (state.status === "error") return <ResourceState status="error" title={t("products.title")} error={state.message} onRetry={load} />;

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>{t("products.title")}</h2>
          <p>{t("products.subtitle")}</p>
        </div>
      </div>
      <section className="panel">
        <h3>{t("products.catalog")}</h3>
        {state.products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t("products.emptyTitle")}
            description={t("products.emptyDescription")}
            actionLabel={t("common.reloadData")}
            onAction={load}
          />
        ) : (
          <DataTable
            columns={[t("customers.code"), t("products.name"), t("products.category")]}
            rows={state.products.map((product) => [String(product.codigo_producto), productName(product.codigo_producto, product.nombre), categoryName(product.categoria)])}
          />
        )}
      </section>
    </section>
  );
}

function ProductsLoadingSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <SkeletonPage title={title} description={description}>
      <SkeletonPageTitle />
      <section className="panel" aria-hidden="true">
        <Skeleton className="skeleton-heading" />
        <SkeletonTable columns={3} rows={8} />
      </section>
    </SkeletonPage>
  );
}
