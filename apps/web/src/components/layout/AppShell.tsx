import { Menu } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LanguageSelector, useI18n } from "../../i18n";
import { apiRequest } from "../../services/api/client";

export interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  end?: boolean;
}

type RepositoryMode = "mock" | "turso";

export function AppShell({ navItems }: { navItems: readonly NavItem[] }) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [repositoryMode, setRepositoryMode] = useState<RepositoryMode>("mock");
  const location = useLocation();
  const currentItem = navItems.find((item) => item.end ? location.pathname === item.path : location.pathname.startsWith(item.path));

  useEffect(() => {
    let mounted = true;
    void apiRequest<{ repositoryMode?: string }>("/api/v1/health").then((health) => {
      if (mounted && health.repositoryMode === "turso") setRepositoryMode("turso");
    }).catch(() => { /* The mock fallback is intentional for demos without the API. */ });
    return () => { mounted = false; };
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src="/eclick-One-Logo-2.svg" alt="eclick One logo" />
          <div><strong>eclick One</strong><small>{t("shell.operations")}</small></div>
          <button className="close mobile" onClick={() => setMenuOpen(false)} aria-label={t("shell.closeMenu")}>×</button>
        </div>
        <nav aria-label={t("shell.operationalNav")}>
          {navItems.map(({ path, label, icon: Icon, end }) => (
            <NavLink key={path} to={path} {...(end ? { end: true } : {})} className={({ isActive }) => isActive ? "active" : ""}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="side-footer">{t("shell.sideFooterTitle")}<br /><span>{repositoryMode === "turso" ? t("shell.connectedSql") : t("shell.mockApi")}</span></div>
      </aside>
      <div className="workspace">
        <header>
          <button className="icon-button mobile" onClick={() => setMenuOpen((open) => !open)} aria-label={t("shell.openMenu")}><Menu /></button>
          <div><p className="eyebrow">{t("shell.eyebrow")}</p><h1>{currentItem?.label ?? t("shell.console")}</h1></div>
          <div className="header-actions"><LanguageSelector /><span className={`synthetic ${repositoryMode === "turso" ? "connected" : ""}`}>{repositoryMode === "turso" ? t("common.azureSql") : t("common.syntheticData")}</span><span className="avatar">EO</span></div>
        </header>
        <main className="content"><div className="demo-note">{repositoryMode === "turso" ? t("shell.demoSql") : t("shell.demoMock")}</div><Outlet /></main>
      </div>
    </div>
  );
}
