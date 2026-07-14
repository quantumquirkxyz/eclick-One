import type { ReactNode } from "react";

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
  if (status === "loading") {
    return (
      <section className="panel resource-state">
        <h3>{title}</h3>
        <p>{description ?? "Cargando..."}</p>
      </section>
    );
  }
  if (status === "error") {
    return (
      <section className="panel resource-state">
        <h3>{title}</h3>
        <p>{error ?? description ?? "No se pudo cargar la información."}</p>
        {onRetry ? (
          <button className="primary-button" onClick={onRetry}>
            Reintentar
          </button>
        ) : null}
      </section>
    );
  }
  if (status === "empty") {
    return (
      <section className="panel resource-state">
        <h3>{title}</h3>
        <p>{description ?? "No hay registros para mostrar."}</p>
      </section>
    );
  }
  return <>{children}</>;
}
