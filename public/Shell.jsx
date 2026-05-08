// Alegra Sidebar + Topbar

const NAV = [
  { id: "inicio",   label: "Inicio",        icon: "home" },
  { id: "facturas", label: "Facturas",      icon: "file-text" },
  { id: "ingresos", label: "Ingresos",      icon: "trending-up" },
  { id: "clientes", label: "Clientes",      icon: "users" },
  { id: "items",    label: "Items",         icon: "package" },
  { id: "nomina",   label: "Nómina",        icon: "briefcase" },
  { id: "conta",    label: "Contabilidad",  icon: "calculator" },
  { id: "informes", label: "Informes",      icon: "chart-bar" },
  { id: "config",   label: "Configuración", icon: "settings" },
];

const Sidebar = ({ route, onRoute }) => {
  const [collapsed, setCollapsed] = React.useState(true);
  return (
  <aside style={{
    width: collapsed ? 56 : 248, flex: collapsed ? "0 0 56px" : "0 0 248px",
    background: "#fff",
    borderRight: "1px solid var(--slate-200)",
    display: "flex", flexDirection: "column",
    height: "100vh", position: "sticky", top: 0,
    transition: "width 180ms ease, flex 180ms ease",
    overflow: "hidden",
  }}>
    <div style={{
      height: 56, padding: "8px 12px", display: "flex", alignItems: "center",
      gap: 8, borderBottom: "1px solid var(--slate-200)",
    }}>
      {!collapsed && <img src="assets/logos/alegra-wordmark.svg" alt="Alegra" style={{ height: 24 }} />}
      {collapsed && <img src="assets/logos/alegra-mark.svg" alt="Alegra" style={{ height: 24, margin: "0 auto" }} />}
      {!collapsed && <div style={{ flex: 1 }} />}
      {!collapsed && (
        <button style={{
          width: 32, height: 32, display: "grid", placeItems: "center",
          border: 0, background: "transparent", borderRadius: 8, cursor: "pointer", color: "var(--slate-700)"
        }} title="Colapsar" onClick={() => setCollapsed(true)}>
          <i className="ti ti-layout-sidebar" style={{ fontSize: 18 }} />
        </button>
      )}
    </div>
    <nav style={{ padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2, flex: 1, overflow: "auto" }}>
      {NAV.map((n) => {
        const active = route === n.id;
        return (
          <button key={n.id} onClick={() => { onRoute(n.id); if (collapsed) setCollapsed(false); }}
            style={{
              display: "flex", alignItems: "center", gap: collapsed ? 0 : 12,
              height: 40, padding: collapsed ? "0" : "0 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 8, border: 0,
              background: active ? "rgba(226, 232, 240, 0.4)" : "transparent",
              color: active ? "var(--slate-900)" : "var(--slate-700)",
              fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: "20px",
              fontWeight: active ? 600 : 500, textAlign: "left", cursor: "pointer",
              transition: "background 120ms ease",
            }}
            title={collapsed ? n.label : ""}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--slate-100)"; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
            <i className={`ti ti-${n.icon}`} style={{ fontSize: 18,
              color: active ? "var(--slate-900)" : "var(--slate-500)" }} />
            {!collapsed && <span>{n.label}</span>}
          </button>
        );
      })}
    </nav>
    {!collapsed && (
      <div style={{ padding: 12, borderTop: "1px solid var(--slate-200)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
          borderRadius: 10, background: "var(--slate-50)",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "var(--sm-primary-600)", color: "#fff",
            display: "grid", placeItems: "center",
            fontSize: 13, fontWeight: 600,
          }}>LG</div>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: "var(--font-sans)", lineHeight: 1.25 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-900)" }}>La Esquina SAS</span>
            <span style={{ fontSize: 11, color: "var(--slate-500)" }}>Plan Pro · Bogotá</span>
          </div>
        </div>
      </div>
    )}
    {collapsed && (
      <div style={{ padding: "12px 0", borderTop: "1px solid var(--slate-200)", display: "flex", justifyContent: "center" }}>
        <button style={{
          width: 32, height: 32, display: "grid", placeItems: "center",
          border: 0, background: "transparent", borderRadius: 8, cursor: "pointer", color: "var(--slate-500)"
        }} title="Expandir sidebar" onClick={() => setCollapsed(false)}>
          <i className="ti ti-layout-sidebar-right" style={{ fontSize: 18 }} />
        </button>
      </div>
    )}
  </aside>
  );
};

const Topbar = ({ title }) => (
  <header style={{
    height: 56, padding: "0 24px",
    display: "flex", alignItems: "center", gap: 16,
    background: "#fff", borderBottom: "1px solid var(--slate-200)",
    position: "sticky", top: 0, zIndex: 10,
  }}>
    <h2 style={{ margin: 0, fontSize: 16, lineHeight: "24px", fontWeight: 600, color: "var(--slate-900)" }}>{title}</h2>
    <div style={{ flex: 1, maxWidth: 420, marginLeft: 24 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        height: 36, padding: "0 12px",
        background: "var(--slate-100)", borderRadius: 9999,
        color: "var(--slate-500)", fontFamily: "var(--font-sans)", fontSize: 13,
      }}>
        <i className="ti ti-search" style={{ fontSize: 16 }} />
        <span>Buscar clientes, facturas, productos…</span>
      </div>
    </div>
    <div style={{ flex: 1 }} />
    <button style={iconBtn} title="Ayuda"><i className="ti ti-help-circle" style={{ fontSize: 18 }} /></button>
    <button style={iconBtn} title="Notificaciones"><i className="ti ti-bell" style={{ fontSize: 18 }} /></button>
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: "var(--sm-indigo-500)", color: "#fff",
      display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600,
    }}>MA</div>
  </header>
);

const iconBtn = {
  width: 36, height: 36, display: "grid", placeItems: "center",
  border: 0, background: "transparent", borderRadius: 9999,
  cursor: "pointer", color: "var(--slate-700)"
};
const iconSz = { width: 18, height: 18 };

Object.assign(window, { Sidebar, Topbar, NAV });
