import type { CSSProperties, ReactNode } from "react";
import { useI18n } from "../i18n";

export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <span aria-hidden="true" className={joinClasses("skeleton", className)} style={style} />;
}

export function SkeletonText({
  lines = 3,
  widths = [],
  className = "",
}: {
  lines?: number;
  widths?: readonly string[];
  className?: string;
}) {
  return (
    <div className={joinClasses("skeleton-text", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className="skeleton-line"
          style={{ width: widths[index] ?? (index === lines - 1 ? "72%" : "100%") }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <section className={joinClasses("panel skeleton-card", className)} aria-hidden="true">
      <Skeleton className="skeleton-heading" />
      <SkeletonText lines={lines} />
    </section>
  );
}

export function SkeletonTable({
  columns = 4,
  rows = 5,
  className = "",
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={joinClasses("table-panel skeleton-table", className)}
      aria-hidden="true"
      style={{ "--skeleton-columns": columns } as CSSProperties}
    >
      <div className="skeleton-table-header">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={`header-${index}`} className="skeleton-table-head-cell" />
        ))}
      </div>
      <div className="skeleton-table-body">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div className="skeleton-table-row" key={`row-${rowIndex}`}>
            {Array.from({ length: columns }, (_, columnIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${columnIndex}`}
                className={columnIndex === columns - 1 ? "skeleton-pill" : "skeleton-table-cell"}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({
  className = "",
  height = 240,
}: {
  className?: string;
  height?: number;
}) {
  return (
    <div className={joinClasses("panel skeleton-chart-panel", className)} aria-hidden="true">
      <Skeleton className="skeleton-heading" />
      <div className="skeleton-chart" style={{ height: `${height}px` }}>
        <div className="skeleton-chart-bars">
          {["35%", "55%", "48%", "72%", "62%"].map((barHeight, index) => (
            <Skeleton key={index} className="skeleton-chart-bar" style={{ height: barHeight }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonPage({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const loadingText = description ?? t("common.loading");
  return (
    <section
      className={joinClasses("skeleton-page", className)}
      role="status"
      aria-live="polite"
      aria-label={`${title}. ${loadingText}`}
    >
      <span className="sr-only">{loadingText}</span>
      {children}
    </section>
  );
}

export function SkeletonPageTitle() {
  return (
    <div className="page-title skeleton-page-title" aria-hidden="true">
      <div>
        <Skeleton className="skeleton-title" />
        <Skeleton className="skeleton-subtitle" />
      </div>
    </div>
  );
}

function joinClasses(...values: readonly string[]): string {
  return values.filter(Boolean).join(" ");
}
