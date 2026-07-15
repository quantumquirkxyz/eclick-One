import type { ReactNode } from "react";
import { useI18n } from "../../i18n";

export function ResourceState({
  status,
  title,
  description,
  error,
  onRetry,
  children,
}: {
  status: "loading" | "error" | "empty" | "success";
  title: string;
  description?: string;
  error?: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  const { t } = useI18n();
  if (status === "loading") {
    return (
      <section className="panel resource-state">
        <h3>{title}</h3>
        <p>{description ?? t("common.loading")}</p>
      </section>
    );
  }
  if (status === "error") {
    return (
      <section className="panel resource-state">
        <h3>{title}</h3>
        <p>{error ?? description ?? t("common.noRecords")}</p>
        {onRetry ? (
          <button className="primary-button" onClick={onRetry}>
            {t("common.retry")}
          </button>
        ) : null}
      </section>
    );
  }
  if (status === "empty") {
    return (
      <section className="panel resource-state">
        <h3>{title}</h3>
        <p>{description ?? t("common.noRecords")}</p>
      </section>
    );
  }
  return <>{children}</>;
}
