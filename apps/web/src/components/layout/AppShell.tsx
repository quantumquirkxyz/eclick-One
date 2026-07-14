import { Menu } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { Vista } from "../../types/commerce";

export interface NavItem {
  vista: Vista;
  etiqueta: string;
  icon: ComponentType<{ size?: number }>;
}

export function AppShell({
  currentView,
  onSelectView,
  onToggleMenu,
  menuOpen,
  navItems,
  children,
}: {
  currentView: Vista;
  onSelectView(vista: Vista): void;
  onToggleMenu(): void;
  menuOpen: boolean;
  navItems: readonly NavItem[];
  children: ReactNode;
}) {
  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">e</span>
          <div>
            <strong>eclick One</strong>
            <small>OPERATIONS</small>
          </div>
          <button className="close mobile" onClick={onToggleMenu} aria-label="Cerrar menú">
            ×
          </button>
        </div>
        <nav>
          {navItems.map(({ vista, etiqueta, icon: Icon }) => (
            <button
              key={vista}
              className={currentView === vista ? "active" : ""}
              onClick={() => onSelectView(vista)}
            >
              <Icon size={18} />
              {etiqueta}
            </button>
          ))}
        </nav>
        <div className="side-footer">
          OPERACIÓN COMERCIAL
          <br />
          <span>Modo mock con API REST</span>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <button className="icon-button mobile" onClick={onToggleMenu} aria-label="Abrir menú">
            <Menu />
          </button>
          <div>
            <p className="eyebrow">eclick One · Panamá</p>
            <h1>{navItems.find((item) => item.vista === currentView)?.etiqueta}</h1>
          </div>
          <div className="header-actions">
            <span className="synthetic">Modo mock</span>
            <span className="avatar">EO</span>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
