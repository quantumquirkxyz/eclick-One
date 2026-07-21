import type { ReactNode } from "react";
import { useI18n } from "../../i18n";
import { ErrorState } from "../ErrorState";
import { normalizeAppError, type AppError } from "../../services/api/client";

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
  error?: AppError | Error | string;
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
        {onRetry ? <ErrorState error={typeof error === "string" ? normalizeAppError(new Error(error), description) : (error ?? new Error(description ?? t("common.noRecords")))} onRetry={onRetry} /> : <p>{description ?? t("common.noRecords")}</p>}
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
