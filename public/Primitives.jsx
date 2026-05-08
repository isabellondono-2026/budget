// Alegra Web App — primitives (Button, StatusChip, TextField, Card)

const Icon = ({ name, size = 18, style = {} }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, color: "currentColor", ...style }} />
);

const Button = ({ variant = "filled", size = "md", icon, children, onClick, disabled, style = {} }) => {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 8, border: 0, cursor: disabled ? "default" : "pointer",
    fontFamily: "var(--font-sans)", fontWeight: 500, whiteSpace: "nowrap",
    padding: size === "sm" ? "6px 12px" : "8px 16px",
    fontSize: size === "sm" ? 13 : 14,
    lineHeight: size === "sm" ? "18px" : "20px",
    opacity: disabled ? 0.3 : 1, transition: "background 120ms ease",
  };
  const variants = {
    filled:  { background: "var(--sm-primary-600)", color: "#fff" },
    outline: { background: "#fff", color: "var(--slate-900)", border: "1px solid rgba(148,163,184,.4)" },
    subtle:  { background: "var(--sm-primary-100)", color: "var(--sm-primary-900)" },
    ghost:   { background: "transparent", color: "var(--sm-primary-600)" },
    danger:  { background: "var(--rose-600)", color: "#fff" },
  };
  const hover = {
    filled: "var(--sm-primary-700)", outline: "var(--slate-50)",
    subtle: "var(--sm-primary-200)", ghost: "var(--sm-primary-100)", danger: "#BE123C",
  }[variant];
  const [h, setH] = React.useState(false);
  const s = { ...base, ...variants[variant], ...style };
  if (h && !disabled) {
    if (variant === "filled" || variant === "danger" || variant === "subtle") s.background = hover;
    else s.background = hover;
  }
  return (
    <button style={s} onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      {icon ? <Icon name={icon} size={size === "sm" ? 14 : 16} /> : null}
      {children}
    </button>
  );
};

const StatusChip = ({ tone = "neutral", children }) => {
  const palettes = {
    success: { bg: "#DCFCE7", fg: "#166534", dot: "#249F58" },
    warning: { bg: "#FEF3C7", fg: "#92400E", dot: "#D97706" },
    danger:  { bg: "#FEE2E2", fg: "#B91C1C", dot: "#F93939" },
    info:    { bg: "#E0E7FF", fg: "#3730A3", dot: "#4F46E5" },
    neutral: { bg: "var(--slate-100)", fg: "var(--slate-700)", dot: "var(--slate-500)" },
    brand:   { bg: "var(--sm-primary-100)", fg: "var(--sm-primary-900)", dot: "var(--sm-primary-600)" },
  };
  const p = palettes[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: p.bg, color: p.fg,
      padding: "3px 10px", borderRadius: 9999,
      fontSize: 12, lineHeight: "16px", fontWeight: 500,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.dot }} />
      {children}
    </span>
  );
};

const TextField = ({ label, value, onChange, placeholder, help, error, type = "text" }) => {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label ? <span style={{ fontSize: 14, fontWeight: 500, color: "var(--slate-900)" }}>{label}</span> : null}
      <input type={type} value={value || ""} placeholder={placeholder}
        onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: "20px",
          padding: "8px 12px", borderRadius: 8, color: "var(--slate-900)",
          background: "#fff", outline: 0,
          border: `1px solid ${error ? "var(--rose-600)" : focus ? "var(--sm-primary-600)" : "var(--slate-300)"}`,
          boxShadow: focus ? "var(--shadow-focus)" : "none",
          transition: "border 120ms ease, box-shadow 120ms ease",
        }} />
      {help || error ? (
        <span style={{ fontSize: 12, color: error ? "var(--rose-600)" : "var(--slate-500)" }}>
          {error || help}
        </span>
      ) : null}
    </label>
  );
};

const Card = ({ children, style = {}, interactive = false }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: "#fff", border: "1px solid var(--slate-200)",
        borderRadius: 16,
        transition: "border-color 160ms ease, transform 160ms ease",
        borderColor: hover && interactive ? "var(--slate-300)" : "var(--slate-200)",
        transform: hover && interactive ? "translateY(-1px)" : "none",
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}>
      {children}
    </div>
  );
};

const PageHeader = ({ eyebrow, title, subtitle, action }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
    <div>
      {eyebrow ? (
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--sm-primary-700)",
          letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 4 }}>{eyebrow}</div>
      ) : null}
      <h1 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, color: "var(--slate-900)", letterSpacing: "-0.01em" }}>{title}</h1>
      {subtitle ? <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: "20px", color: "var(--slate-500)" }}>{subtitle}</p> : null}
    </div>
    {action}
  </div>
);

Object.assign(window, { Icon, Button, StatusChip, TextField, Card, PageHeader });
