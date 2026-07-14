import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import { Chart } from "../../components/Chart";
import type { EstadoPedido } from "../../types/commerce";

const LABELS: Record<EstadoPedido, string> = {
  generado: "Generado",
  proceso: "En proceso",
  entregado: "Entregado",
  cancelado: "Cancelado",
  facturado: "Facturado",
};

export function StatusChart({
  title,
  values,
}: {
  title: string;
  values: readonly { status: EstadoPedido; count: number }[];
}) {
  const option = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: values.map((item) => LABELS[item.status]) },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: values.map((item) => item.count), itemStyle: { color: "#0f766e", borderRadius: [5, 5, 0, 0] } }],
    grid: { left: 35, right: 20, top: 25, bottom: 30 },
  }), [values]);

  return (
    <section className="panel">
      <h3>{title}</h3>
      <Chart option={option} />
    </section>
  );
}
