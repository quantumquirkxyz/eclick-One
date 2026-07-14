import { useEffect, useState } from "react";
import { commerceApi } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { DataTable } from "../../components/tables/DataTable";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; generatedAt: string; sections: readonly { key: string; title: string; rows: readonly unknown[] }[] };

export function ReportesFeature() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      const report = await commerceApi.getReports();
      setState({ status: "success", generatedAt: report.generatedAt, sections: report.sections });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "No se pudieron cargar reportes." });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (state.status === "loading") return <ResourceState status="loading" title="Reportes" description="Generando reportes..." />;
  if (state.status === "error") return <ResourceState status="error" title="Reportes" error={state.message} onRetry={load} />;
  if (state.sections.length === 0) return <ResourceState status="empty" title="Reportes" description="No hay secciones para mostrar." onRetry={load} />;

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>Reportes</h2>
          <p>Lectura ejecutiva con métricas derivadas del servicio mock.</p>
        </div>
      </div>
      <div className="demo-note">Generado el {state.generatedAt}. Los datos operativos no salen de Azure SQL todavía.</div>
      {state.sections.map((section) => (
        <section className="panel" key={section.key}>
          <h3>{section.title}</h3>
          <DataTable columns={["Detalle"]} rows={formatRows(section.rows)} />
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
