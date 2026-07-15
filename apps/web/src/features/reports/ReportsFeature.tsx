import { useEffect, useState } from "react";
import { commerceApi } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { DataTable } from "../../components/tables/DataTable";
import { useI18n } from "../../i18n";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; generatedAt: string; sections: readonly { key: string; title: string; rows: readonly unknown[] }[] };

export function ReportsFeature() {
  const { t, date } = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      const report = await commerceApi.getReports();
      setState({ status: "success", generatedAt: report.generatedAt, sections: report.sections });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : t("reports.error") });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (state.status === "loading") return <ResourceState status="loading" title={t("reports.title")} description={t("reports.loading")} />;
  if (state.status === "error") return <ResourceState status="error" title={t("reports.title")} error={state.message} onRetry={load} />;
  if (state.sections.length === 0) return <ResourceState status="empty" title={t("reports.title")} description={t("reports.empty")} onRetry={load} />;

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>{t("reports.title")}</h2>
          <p>{t("reports.subtitle")}</p>
        </div>
      </div>
      <div className="demo-note">{t("reports.generated", { date: date(state.generatedAt) })}</div>
      {state.sections.map((section) => (
        <section className="panel" key={section.key}>
          <h3>{section.title}</h3>
          <DataTable columns={[t("reports.detail")]} rows={formatRows(section.rows)} />
        </section>
      ))}
    </section>
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
