import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { commerceApi } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { EmptyState } from "../../components/EmptyState";
import { DataTable } from "../../components/tables/DataTable";
import { Skeleton, SkeletonChart, SkeletonPage, SkeletonPageTitle, SkeletonTable } from "../../components/Skeleton";
import { useI18n } from "../../i18n";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; synthetic: boolean; generatedAt: string; sections: readonly { key: string; title: string; rows: readonly unknown[] }[] };

export function ReportsFeature() {
  const { t, date } = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      const report = await commerceApi.getReports();
      setState({ status: "success", synthetic: report.synthetic, generatedAt: report.generatedAt, sections: report.sections });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : t("reports.error") });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (state.status === "loading") return <ReportsLoadingSkeleton title={t("reports.title")} description={t("reports.loading")} />;
  if (state.status === "error") return <ResourceState status="error" title={t("reports.title")} error={state.message} onRetry={load} />;

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>{t("reports.title")}</h2>
          <p>{t(state.synthetic ? "reports.subtitleMock" : "reports.subtitleSql")}</p>
        </div>
      </div>
      <div className="demo-note">{t(state.synthetic ? "reports.generatedMock" : "reports.generatedSql", { date: date(state.generatedAt) })}</div>
      {state.sections.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon={BarChart3}
            title={t("reports.emptyTitle")}
            description={t("reports.emptyDescription")}
            actionLabel={t("common.reloadData")}
            onAction={load}
          />
        </section>
      ) : (
        state.sections.map((section) => (
          <section className="panel" key={section.key}>
            <h3>{section.title}</h3>
            <DataTable columns={[t("reports.detail")]} rows={formatRows(section.rows)} />
          </section>
        ))
      )}
    </section>
  );
}

function ReportsLoadingSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <SkeletonPage title={title} description={description}>
      <SkeletonPageTitle />
      <Skeleton className="skeleton-note" />
      <div className="grid two">
        <SkeletonChart height={220} />
        <section className="panel" aria-hidden="true">
          <Skeleton className="skeleton-heading" />
          <SkeletonTable columns={1} rows={5} />
        </section>
      </div>
      <section className="panel" aria-hidden="true">
        <Skeleton className="skeleton-heading" />
        <SkeletonTable columns={1} rows={6} />
      </section>
      <section className="panel" aria-hidden="true">
        <Skeleton className="skeleton-heading" />
        <SkeletonTable columns={1} rows={6} />
      </section>
    </SkeletonPage>
  );
}

function formatRows(rows: readonly unknown[]): readonly (readonly string[])[] {
  return rows.map((row) => {
    if (row && typeof row === "object") {
      const entries = Object.entries(row as Record<string, unknown>);
      return [entries.map(([key, value]) => `${key}: ${String(value)}`).join(" | ")];
    }
    return [String(row)];
  });
}
