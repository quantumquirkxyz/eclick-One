import { useState } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Package,
  Receipt,
  Users,
} from "lucide-react";
import type { Vista } from "./types/commerce";
import { AppShell, type NavItem } from "./components/layout/AppShell";
import { DashboardFeature } from "./features/dashboard/DashboardFeature";
import { ClientesFeature } from "./features/clientes/ClientesFeature";
import { ProductosFeature } from "./features/productos/ProductosFeature";
import { InventarioFeature } from "./features/inventario/InventarioFeature";
import { PedidosFeature } from "./features/pedidos/PedidosFeature";
import { PagosFeature } from "./features/pagos/PagosFeature";
import { ReportesFeature } from "./features/reportes/ReportesFeature";

const NAV_ITEMS: readonly NavItem[] = [
  { vista: "resumen", etiqueta: "Resumen", icon: LayoutDashboard },
  { vista: "clientes", etiqueta: "Clientes", icon: Users },
  { vista: "pedidos", etiqueta: "Pedidos", icon: ClipboardList },
  { vista: "pagos", etiqueta: "Pagos", icon: Receipt },
  { vista: "productos", etiqueta: "Productos", icon: Package },
  { vista: "inventario", etiqueta: "Inventario", icon: Boxes },
  { vista: "reportes", etiqueta: "Reportes", icon: BarChart3 },
];

export function App() {
  const [vista, setVista] = useState<Vista>("resumen");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <AppShell
      currentView={vista}
      onSelectView={(next) => {
        setVista(next);
        setMenuOpen(false);
      }}
      onToggleMenu={() => setMenuOpen((current) => !current)}
      menuOpen={menuOpen}
      navItems={NAV_ITEMS}
    >
      {vista === "resumen" ? <DashboardFeature /> : null}
      {vista === "clientes" ? <ClientesFeature /> : null}
      {vista === "productos" ? <ProductosFeature /> : null}
      {vista === "inventario" ? <InventarioFeature /> : null}
      {vista === "pedidos" ? <PedidosFeature /> : null}
      {vista === "pagos" ? <PagosFeature /> : null}
      {vista === "reportes" ? <ReportesFeature /> : null}
    </AppShell>
  );
}
