import type { EChartsOption } from "echarts";
import { useMemo } from "react";
import { Chart } from "../../components/Chart";
import type { CommerceOrderStatus } from "../../types/commerce";
import { useI18n } from "../../i18n";

export function StatusChart({
  title,
  values,
}: {
  title: string;
  values: readonly { status: CommerceOrderStatus; count: number }[];
}) {
  const { status } = useI18n();
  const option = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: values.map((item) => status(item.status)) },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: values.map((item) => item.count), itemStyle: { color: "var(--color-accent)", borderRadius: [5, 5, 0, 0] } }],
    grid: { left: 35, right: 20, top: 25, bottom: 30 },
  }), [values, status]);

  return (
    <section className="panel">
      <h3>{title}</h3>
      <Chart option={option} />
    </section>
  );
}
