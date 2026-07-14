import { useEffect, useState } from "react";
import { commerceApi } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { DataTable } from "../../components/tables/DataTable";
import type { Producto } from "../../types/commerce";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "success"; productos: readonly Producto[] };

export function ProductosFeature() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      setState({ status: "success", productos: await commerceApi.listProducts() });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "No se pudieron cargar productos." });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (state.status === "loading") return <ResourceState status="loading" title="Productos" description="Cargando catálogo..." />;
  if (state.status === "error") return <ResourceState status="error" title="Productos" error={state.message} onRetry={load} />;
  if (state.productos.length === 0) return <ResourceState status="empty" title="Productos" description="No hay productos." onRetry={load} />;

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>Productos</h2>
          <p>Catálogo académico conectado al mock backend.</p>
        </div>
      </div>
      <section className="panel">
        <h3>Catálogo</h3>
        <DataTable
          columns={["Código", "Nombre", "Categoría"]}
          rows={state.productos.map((producto) => [String(producto.codigo_producto), producto.nombre, producto.categoria])}
        />
      </section>
    </section>
  );
}
