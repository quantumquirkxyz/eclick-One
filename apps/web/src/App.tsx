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
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { BlockchainBanner } from "./components/BlockchainBanner";
import { PageErrorBoundary } from "./components/ErrorBoundary";
import { AppShell, type NavItem } from "./components/layout/AppShell";
import { OfflineBanner } from "./components/OfflineBanner";
import { PublicLayout } from "./components/layout/PublicLayout";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ServerErrorPage } from "./pages/ServerErrorPage";
import { TimeoutPage } from "./pages/TimeoutPage";
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
    { path: "/app", label: t("nav.summary"), icon: LayoutDashboard, end: true, allowedRoles: ["admin", "operator", "viewer"] },
    { path: "/app/customers", label: t("nav.customers"), icon: Users, allowedRoles: ["admin", "operator"] },
    { path: "/app/orders", label: t("nav.orders"), icon: ClipboardList, allowedRoles: ["admin", "operator"] },
    { path: "/app/payments", label: t("nav.payments"), icon: Receipt, allowedRoles: ["admin", "operator"] },
    { path: "/app/products", label: t("nav.products"), icon: Package, allowedRoles: ["admin", "operator"] },
    { path: "/app/inventory", label: t("nav.inventory"), icon: Boxes, allowedRoles: ["admin", "operator"] },
    { path: "/app/reports", label: t("nav.reports"), icon: BarChart3, allowedRoles: ["admin", "operator", "viewer"] },
    { path: "/app/web3", label: t("nav.web3"), icon: Globe, allowedRoles: ["admin", "operator", "viewer"] },
  ];

  return (
    <>
      <OfflineBanner />
      <BlockchainBanner />
      <Routes>
        <Route element={<PageErrorBoundary><PublicLayout /></PageErrorBoundary>}>
          <Route path="/" element={<PageErrorBoundary><LandingPage /></PageErrorBoundary>} />
        </Route>
        <Route path="/login" element={<PageErrorBoundary><LoginPage /></PageErrorBoundary>} />
        <Route path="/register" element={<PageErrorBoundary><RegisterPage /></PageErrorBoundary>} />
        <Route path="/403" element={<PageErrorBoundary><ForbiddenPage /></PageErrorBoundary>} />
        <Route path="/500" element={<PageErrorBoundary><ServerErrorPage /></PageErrorBoundary>} />
        <Route path="/timeout" element={<PageErrorBoundary><TimeoutPage /></PageErrorBoundary>} />
        <Route path="/app" element={<PageErrorBoundary><ProtectedRoute><AppShell navItems={navItems} /></ProtectedRoute></PageErrorBoundary>}>
          <Route index element={<PageErrorBoundary><DashboardFeature /></PageErrorBoundary>} />
          <Route path="customers" element={<PageErrorBoundary><CustomersFeature /></PageErrorBoundary>} />
          <Route path="orders" element={<PageErrorBoundary><OrdersFeature /></PageErrorBoundary>} />
          <Route path="payments" element={<PageErrorBoundary><PaymentsFeature /></PageErrorBoundary>} />
          <Route path="products" element={<PageErrorBoundary><ProductsFeature /></PageErrorBoundary>} />
          <Route path="inventory" element={<PageErrorBoundary><InventoryFeature /></PageErrorBoundary>} />
          <Route path="reports" element={<PageErrorBoundary><ReportsFeature /></PageErrorBoundary>} />
          <Route path="web3" element={<PageErrorBoundary><Web3Feature /></PageErrorBoundary>} />
          <Route path="*" element={<PageErrorBoundary><NotFoundPage homePath="/app" /></PageErrorBoundary>} />
        </Route>
        <Route path="*" element={<PageErrorBoundary><NotFoundPage /></PageErrorBoundary>} />
      </Routes>
    </>
  );
}
