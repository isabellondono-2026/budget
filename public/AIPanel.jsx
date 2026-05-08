// AI Panel — side panel with interactive recalculation.

const aiPanelStyles = {
  panel: {
    position: "fixed", top: 0, right: 0, height: "100vh", width: 380,
    background: "#fff", borderLeft: "1px solid var(--slate-200)",
    boxShadow: "var(--shadow-xl)", zIndex: 30,
    display: "flex", flexDirection: "column",
  },
  header: {
    padding: "20px 20px 16px", borderBottom: "1px solid var(--slate-200)",
    display: "flex", flexDirection: "column", gap: 6,
  },
  body: { flex: 1, overflow: "auto", padding: 20 },
  footer: { padding: "12px 20px", borderTop: "1px solid var(--slate-200)" },
};

const AIPanel = ({ open, onClose, focusedAccount, onRecalculate }) => {
  // Sliders 0–100%
  const [growth,    setGrowth]    = React.useState(8.5);
  const [inflation, setInflation] = React.useState(7.2);
  const [seasonal,  setSeasonal]  = React.useState(true);
  const [recalcState, setRecalcState] = React.useState("idle"); // idle | loading | done

  if (!open) return null;

  const acc  = focusedAccount ? ACCOUNTS.find(a => a.code === focusedAccount) : null;
  const pred = focusedAccount ? AI_2026[focusedAccount] : null;

  const handleRecalculate = () => {
    setRecalcState("loading");
    setTimeout(() => {
      setRecalcState("done");
      onRecalculate && onRecalculate({ growth: growth / 100, inflation: inflation / 100, seasonal });
      setTimeout(() => setRecalcState("idle"), 2000);
    }, 900);
  };

  return (
    <div style={aiPanelStyles.panel}>
      <div style={aiPanelStyles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #30ABA9 0%, #837FF3 100%)",
            display: "grid", placeItems: "center", color: "#fff",
          }}>
            <i className="ti ti-sparkles" style={{ fontSize: 18 }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--slate-900)" }}>Asistente IA</div>
            <div style={{ fontSize: 12, color: "var(--slate-500)" }}>Ajusta los supuestos y recalcula</div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, border: 0, borderRadius: 8, background: "transparent",
            color: "var(--slate-500)", cursor: "pointer",
          }}><i className="ti ti-x" style={{ fontSize: 16 }} /></button>
        </div>
      </div>

      <div style={aiPanelStyles.body}>
        {/* Cuenta enfocada */}
        {acc && pred ? (
          <div style={{
            padding: 12, borderRadius: 10, border: "1px solid var(--sm-primary-200)",
            background: "rgba(48,171,169,.05)", marginBottom: 16,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--sm-primary-800)",
              textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
              Cuenta seleccionada
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-900)" }}>
              {acc.code} · {acc.name}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--slate-700)", lineHeight: 1.55 }}>
              {pred.rationale}
            </div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--slate-500)" }}>Confianza:</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                background: pred.confidence === "high" ? "#DCFCE7" : pred.confidence === "med" ? "#FEF3C7" : "#FEE2E2",
                color: pred.confidence === "high" ? "#166534" : pred.confidence === "med" ? "#92400E" : "#B91C1C",
              }}>{pred.confidence === "high" ? "Alta" : pred.confidence === "med" ? "Media" : "Baja"}</span>
            </div>
          </div>
        ) : (
          <div style={{
            padding: 12, borderRadius: 10, background: "var(--slate-50)",
            border: "1px solid var(--slate-200)", marginBottom: 16,
            fontSize: 12, color: "var(--slate-600)", display: "flex", gap: 8,
          }}>
            <i className="ti ti-cursor-text" style={{ fontSize: 16, color: "var(--slate-400)" }} />
            Haz clic sobre cualquier celda para ver la explicación de ese valor.
          </div>
        )}

        {/* Supuestos */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--slate-600)",
          textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>
          Supuestos del modelo
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AssumptionSlider
            icon="trending-up" label="Crecimiento esperado"
            value={growth} setValue={setGrowth} min={0} max={100} step={0.5}
            suffix="%" display={`${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}
            help="Uplift adicional sobre la tendencia histórica detectada." />
          <AssumptionSlider
            icon="percentage" label="Inflación local"
            value={inflation} setValue={setInflation} min={0} max={100} step={0.5}
            suffix="%" display={`${inflation.toFixed(1)}%`}
            help="Colombia (DANE) por defecto. Aplicada a cuentas operativas." />

          {/* Estacionalidad toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            border: "1px solid var(--slate-200)", borderRadius: 10 }}>
            <i className="ti ti-calendar-event" style={{ fontSize: 18, color: "var(--sm-primary-700)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-900)" }}>Estacionalidad mensual</div>
              <div style={{ fontSize: 11, color: "var(--slate-500)" }}>Heredada del comportamiento histórico.</div>
            </div>
            <Toggle on={seasonal} onChange={setSeasonal} />
          </div>
        </div>

        <div style={{ marginTop: 18, padding: 11, borderRadius: 10, background: "var(--slate-50)",
          border: "1px solid var(--slate-200)", fontSize: 11, color: "var(--slate-600)", lineHeight: 1.55 }}>
          La inflación se aplica <b>mensualmente y compuesta</b> para reflejar el efecto real en cada periodo.
          Cuentas de impuestos y rendimientos financieros usan reglas especiales.
        </div>
      </div>

      <div style={aiPanelStyles.footer}>
        <button onClick={handleRecalculate} disabled={recalcState === "loading"} style={{
          width: "100%", padding: "10px 16px", borderRadius: 8, border: 0,
          background: recalcState === "done"
            ? "#DCFCE7"
            : recalcState === "loading"
              ? "var(--slate-200)"
              : "linear-gradient(135deg, #30ABA9 0%, #837FF3 100%)",
          color: recalcState === "done" ? "#166534" : recalcState === "loading" ? "var(--slate-500)" : "#fff",
          fontSize: 14, fontWeight: 600, cursor: recalcState === "loading" ? "default" : "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "background .2s",
        }}>
          <i className={`ti ti-${recalcState === "done" ? "circle-check" : recalcState === "loading" ? "loader-2" : "refresh"}`}
            style={{ fontSize: 16, animation: recalcState === "loading" ? "alegra-spin .8s linear infinite" : "none" }} />
          {recalcState === "done" ? "¡Recalculado!" : recalcState === "loading" ? "Calculando…" : "Recalcular con estos supuestos"}
        </button>
      </div>
    </div>
  );
};

const AssumptionSlider = ({ icon, label, value, setValue, min, max, step, display, help }) => (
  <div style={{ padding: "12px 14px", border: "1px solid var(--slate-200)", borderRadius: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 16, color: "var(--sm-primary-700)" }} />
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--slate-900)" }}>{label}</div>
      <div style={{
        fontSize: 13, fontWeight: 700, color: "var(--sm-primary-700)",
        fontVariantNumeric: "tabular-nums", minWidth: 44, textAlign: "right",
      }}>{display}</div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 10, color: "var(--slate-400)" }}>{min}%</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: "var(--sm-primary-600)" }} />
      <span style={{ fontSize: 10, color: "var(--slate-400)" }}>{max}%</span>
    </div>
    <div style={{ fontSize: 11, color: "var(--slate-500)", marginTop: 4, lineHeight: 1.4 }}>{help}</div>
  </div>
);

const Toggle = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)} style={{
    width: 36, height: 20, borderRadius: 999, border: 0, cursor: "pointer", padding: 2,
    background: on ? "var(--sm-primary-600)" : "var(--slate-300)",
    transition: "background 120ms ease", position: "relative",
  }}>
    <span style={{
      width: 16, height: 16, borderRadius: "50%", background: "#fff",
      display: "block", transform: on ? "translateX(16px)" : "translateX(0)",
      transition: "transform 120ms ease", boxShadow: "0 1px 2px rgba(0,0,0,.2)",
    }} />
  </button>
);

Object.assign(window, { AIPanel, Toggle });
