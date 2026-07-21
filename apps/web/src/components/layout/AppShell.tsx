import { LogOut, Menu } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { LanguageSelector, useI18n } from "../../i18n";
import { apiRequest } from "../../services/api/client";
import { collectorApi } from "../../services/agent/agent";

export interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  end?: boolean;
  allowedRoles?: ("admin" | "operator" | "viewer" | "agent")[];
}

type RepositoryMode = "mock" | "turso";

export function AppShell({ navItems }: { navItems: readonly NavItem[] }) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [repositoryMode, setRepositoryMode] = useState<RepositoryMode>("mock");
  const [web3Online, setWeb3Online] = useState(false);
  const location = useLocation();
  const currentItem = navItems.find((item) => item.end ? location.pathname === item.path : location.pathname.startsWith(item.path));

  useEffect(() => {
    let mounted = true;
    void apiRequest<{ repositoryMode?: string }>("/api/v1/health").then((health) => {
      if (mounted && health.repositoryMode === "turso") setRepositoryMode("turso");
    }).catch(() => { /* The mock fallback is intentional for demos without the API. */ });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const health = await collectorApi.health();
      if (mounted) setWeb3Online(health !== null && health.status === "ok");
    };
    void check();
    const interval = setInterval(check, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app">
      {menuOpen ? <button className="mobile-backdrop mobile" type="button" aria-label={t("shell.closeMenu")} onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <img className="brand-logo" src="/eclick-One-Logo-2.svg" alt="eclick One logo" />
          <div><strong>eclick One</strong><small>{t("shell.operations")}</small></div>
          <button className="close mobile" type="button" onClick={() => setMenuOpen(false)} aria-label={t("shell.closeMenu")}>×</button>
        </div>
        <nav aria-label={t("shell.operationalNav")}>
          {navItems.filter((item) => !item.allowedRoles || !user || item.allowedRoles.includes(user.role)).map(({ path, label, icon: Icon, end }) => (
            <NavLink key={path} to={path} {...(end ? { end: true } : {})} className={({ isActive }) => isActive ? "active" : ""}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="side-footer">{t("shell.sideFooterTitle")}<br /><span>{repositoryMode === "turso" ? t("shell.connectedSql") : t("shell.mockApi")}</span></div>
      </aside>
      <div className="workspace">
        <header className="app-header">
          <button className="icon-button mobile" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={t("shell.openMenu")}><Menu /></button>
          <div><p className="eyebrow">{t("shell.eyebrow")}</p><h1>{currentItem?.label ?? t("shell.console")}</h1></div>
          <div className="header-actions">
            <LanguageSelector />
            <span className={`synthetic ${repositoryMode === "turso" ? "connected" : ""}`}>{repositoryMode === "turso" ? t("common.azureSql") : t("common.syntheticData")}</span>
            <span className={`synthetic ${web3Online ? "connected" : ""}`}>{web3Online ? t("dashboard.web3Connected") : t("dashboard.web3Disconnected")}</span>
            {user && <><span className="role-badge">{user.role}</span><span className="avatar">{user.nombre.charAt(0)}{user.apellido.charAt(0)}</span></>}
            <button className="icon-button" onClick={handleLogout} title={t("auth.logout")} style={{ border: 0, background: "none", cursor: "pointer", color: "#64748b", display: "inline-flex", alignItems: "center" }}>
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="content"><div className="demo-note">{repositoryMode === "turso" ? t("shell.demoSql") : t("shell.demoMock")}</div><Outlet /></main>
      </div>
    </div>
  );
}
