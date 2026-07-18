import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Package,
  Receipt,
  Users,
  Globe,
} from "lucide-react";
import { Route, Routes } from "react-router-dom";
import { AppShell, type NavItem } from "./components/layout/AppShell";
import { PublicLayout } from "./components/layout/PublicLayout";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { Web3Feature } from "./features/web3/Web3Feature";
import { CustomersFeature } from "./features/customers/CustomersFeature";
import { DashboardFeature } from "./features/dashboard/DashboardFeature";
import { InventoryFeature } from "./features/inventory/InventoryFeature";
import { PaymentsFeature } from "./features/payments/PaymentsFeature";
import { OrdersFeature } from "./features/orders/OrdersFeature";
import { ProductsFeature } from "./features/products/ProductsFeature";
import { ReportsFeature } from "./features/reports/ReportsFeature";
import { useI18n } from "./i18n";

export function App() {
  const { t } = useI18n();
  const navItems: readonly NavItem[] = [
    { path: "/app", label: t("nav.summary"), icon: LayoutDashboard, end: true },
    { path: "/app/customers", label: t("nav.customers"), icon: Users },
    { path: "/app/orders", label: t("nav.orders"), icon: ClipboardList },
    { path: "/app/payments", label: t("nav.payments"), icon: Receipt },
    { path: "/app/products", label: t("nav.products"), icon: Package },
    { path: "/app/inventory", label: t("nav.inventory"), icon: Boxes },
    { path: "/app/reports", label: t("nav.reports"), icon: BarChart3 },
    { path: "/app/web3", label: t("nav.web3"), icon: Globe },
  ];

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>
      <Route path="/app" element={<AppShell navItems={navItems} />}>
        <Route index element={<DashboardFeature />} />
        <Route path="customers" element={<CustomersFeature />} />
        <Route path="orders" element={<OrdersFeature />} />
        <Route path="payments" element={<PaymentsFeature />} />
        <Route path="products" element={<ProductsFeature />} />
        <Route path="inventory" element={<InventoryFeature />} />
        <Route path="reports" element={<ReportsFeature />} />
        <Route path="web3" element={<Web3Feature />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
