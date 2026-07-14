import { useEffect, useState } from "react";
import { commerceApi } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { DataTable } from "../../components/tables/DataTable";
import type { Inventario } from "../../types/commerce";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "success"; inventario: readonly Inventario[] };

export function InventarioFeature() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      setState({ status: "success", inventario: await commerceApi.listInventory() });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "No se pudo cargar inventario." });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (state.status === "loading") return <ResourceState status="loading" title="Inventario" description="Cargando existencias..." />;
  if (state.status === "error") return <ResourceState status="error" title="Inventario" error={state.message} onRetry={load} />;
  if (state.inventario.length === 0) return <ResourceState status="empty" title="Inventario" description="No hay inventario." onRetry={load} />;

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>Inventario</h2>
          <p>Existencias, reservas y ventas desde el servicio mock.</p>
        </div>
      </div>
      <section className="panel">
        <h3>Resumen</h3>
        <DataTable
          columns={["Producto", "Ventas", "Bodega", "Reservado", "Disponible"]}
          rows={state.inventario.map((item) => [
            String(item.codigo_producto),
            String(item.cant_ventas),
            String(item.cant_bodega),
            String(item.cant_reservado),
            String(item.cant_bodega - item.cant_reservado),
          ])}
        />
      </section>
    </section>
  );
}
