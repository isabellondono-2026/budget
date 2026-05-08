// Modals: Formula, Import, Export, Forecast (the novel feature).

const modalStyles = {
  scrim: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,.6)",
    display: "grid", placeItems: "center", zIndex: 50, padding: 24,
  },
  card: {
    background: "#fff", borderRadius: 16, boxShadow: "var(--shadow-xl)",
    width: 560, maxWidth: "100%", maxHeight: "calc(100vh - 48px)",
    overflow: "auto", display: "flex", flexDirection: "column",
  },
  header: {
    padding: "20px 24px 12px", display: "flex", alignItems: "flex-start", gap: 12,
    borderBottom: "1px solid var(--slate-200)",
  },
  body: { padding: 24 },
  footer: {
    padding: "12px 24px", borderTop: "1px solid var(--slate-200)",
    display: "flex", justifyContent: "flex-end", gap: 8,
  },
};

const ModalHeader = ({ icon, title, subtitle, onClose, iconColor = "var(--sm-primary-700)", iconBg = "var(--sm-primary-100)" }) => (
  <div style={modalStyles.header}>
    <div style={{
      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
      background: iconBg, color: iconColor,
      display: "grid", placeItems: "center",
    }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 20 }} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--slate-900)" }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--slate-500)", marginTop: 2 }}>{subtitle}</div>
    </div>
    <button onClick={onClose} style={{
      width: 32, height: 32, border: 0, borderRadius: 8, background: "transparent",
      color: "var(--slate-500)", cursor: "pointer",
    }}><i className="ti ti-x" style={{ fontSize: 18 }} /></button>
  </div>
);

// ---- FormulaModal ------------------------------------------------------
const FormulaModal = ({ batch, accountCode, inflation, onCancel, onApply }) => {
  const [kind, setKind] = React.useState("percent");
  const [val,  setVal]  = React.useState(8);

  const acc = accountCode ? ACCOUNTS.find(a => a.code === accountCode) : null;
  const subtitle = batch
    ? "Aplicar una fórmula a las cuentas seleccionadas"
    : `Aplicar a ${acc?.code} · ${acc?.name}`;

  const opts = [
    { id: "percent",   icon: "percentage",   label: "Variación porcentual",
      desc: "Toma los valores reales del año de referencia y los ajusta por un %." },
    { id: "fixed",     icon: "currency-dollar", label: "Monto fijo mensual",
      desc: "Asigna el mismo valor a cada mes del año." },
    { id: "inflation", icon: "trending-up",  label: "Inflación compuesta mensual",
      desc: "Aplica la inflación mes a mes desde la base. Recomendado por contadores." },
  ];

  return (
    <div style={modalStyles.scrim}>
      <div style={modalStyles.card}>
        <ModalHeader icon="wand" title="Aplicar fórmula incremental"
          subtitle={subtitle} onClose={onCancel} />
        <div style={modalStyles.body}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {opts.map(o => (
              <ChoiceCard key={o.id} icon={o.icon} title={o.label} description={o.desc}
                selected={kind === o.id} onSelect={() => {
                  setKind(o.id);
                  if (o.id === "inflation") setVal(inflation);
                  else if (o.id === "percent") setVal(8);
                  else setVal(2_000_000);
                }} />
            ))}
          </div>

          <div style={{ padding: 16, borderRadius: 12, background: "var(--slate-50)",
            border: "1px solid var(--slate-200)" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-900)" }}>
                {kind === "fixed" ? "Monto mensual (COP)" : "Porcentaje a aplicar"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {kind !== "fixed" ? null : <span style={{ fontSize: 14, color: "var(--slate-500)" }}>$</span>}
                <input type="number" value={val} step={kind === "fixed" ? 100000 : 0.5}
                  onChange={(e) => setVal(parseFloat(e.target.value) || 0)}
                  style={{
                    flex: 1, padding: "10px 12px", borderRadius: 8,
                    border: "1px solid var(--slate-300)", outline: 0, fontSize: 14,
                    fontFamily: "var(--font-sans)", color: "var(--slate-900)",
                  }} />
                {kind === "fixed" ? null : <span style={{ fontSize: 14, color: "var(--slate-500)" }}>%</span>}
              </div>
              <span style={{ fontSize: 12, color: "var(--slate-500)", lineHeight: 1.4 }}>
                {kind === "percent" ? `Ej. 8% suma 8% al valor real del año de referencia.` : null}
                {kind === "fixed" ? `El valor anual será ${COP(val * 12)}.` : null}
                {kind === "inflation" ? `Mes 1 = base × (1+${(val/12).toFixed(2)}%); compuesto cada mes.` : null}
              </span>
            </label>
          </div>

          <div style={{ marginTop: 16, padding: 12, borderRadius: 10,
            background: "rgba(48,171,169,.08)", display: "flex", alignItems: "center", gap: 10 }}>
            <i className="ti ti-sparkles" style={{ fontSize: 16, color: "var(--sm-primary-700)" }} />
            <div style={{ flex: 1, fontSize: 12, color: "var(--slate-700)", lineHeight: 1.5 }}>
              <b>Tip IA:</b> el asistente puede recomendar el % por cuenta según su tendencia histórica.
              Activa el Asistente IA en la barra superior.
            </div>
          </div>
        </div>
        <div style={modalStyles.footer}>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button variant="filled" icon="check" onClick={() => onApply({ kind, value: val })}>
            Aplicar fórmula
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---- ImportModal ------------------------------------------------------
const ImportModal = ({ onClose }) => {
  const [phase, setPhase] = React.useState("idle"); // idle | uploading | done
  const fileRef = React.useRef(null);

  return (
    <div style={modalStyles.scrim}>
      <div style={modalStyles.card}>
        <ModalHeader icon="upload" title="Importar presupuesto desde Excel"
          subtitle="Descarga la plantilla, complétala y súbela." onClose={onClose} />
        <div style={modalStyles.body}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <Card style={{ padding: 16, textAlign: "center" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 10, margin: "0 auto 12px",
                background: "rgba(36,159,88,.1)", color: "var(--green-500)",
                display: "grid", placeItems: "center",
              }}>
                <i className="ti ti-file-spreadsheet" style={{ fontSize: 24 }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--slate-900)", marginBottom: 4 }}>
                1. Plantilla Alegra
              </div>
              <div style={{ fontSize: 12, color: "var(--slate-500)", marginBottom: 12 }}>
                Hoja con cuentas pre-cargadas y columnas mensuales.
              </div>
              <Button variant="outline" size="sm" icon="download">Descargar plantilla</Button>
            </Card>
            <Card style={{ padding: 16, textAlign: "center" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 10, margin: "0 auto 12px",
                background: "var(--sm-primary-100)", color: "var(--sm-primary-700)",
                display: "grid", placeItems: "center",
              }}>
                <i className="ti ti-cloud-upload" style={{ fontSize: 24 }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--slate-900)", marginBottom: 4 }}>
                2. Sube tu archivo
              </div>
              <div style={{ fontSize: 12, color: "var(--slate-500)", marginBottom: 12 }}>
                .xlsx o .csv hasta 10 MB
              </div>
              <Button variant="filled" size="sm" icon="upload"
                onClick={() => { setPhase("uploading"); setTimeout(() => setPhase("done"), 1400); }}>
                {phase === "uploading" ? "Subiendo…" : "Seleccionar archivo"}
              </Button>
            </Card>
          </div>

          {phase === "done" ? (
            <div style={{
              padding: 12, borderRadius: 10, background: "#DCFCE7", color: "#166534",
              display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 500,
            }}>
              <i className="ti ti-circle-check" style={{ fontSize: 18 }} />
              Reconocimos 28 cuentas. Revisa el mapeo antes de importar.
            </div>
          ) : (
            <div style={{
              padding: 12, borderRadius: 10, background: "var(--slate-50)",
              border: "1px solid var(--slate-200)", display: "flex", alignItems: "center", gap: 10,
              fontSize: 12, color: "var(--slate-700)",
            }}>
              <i className="ti ti-info-circle" style={{ fontSize: 16 }} />
              Reconocemos automáticamente el plan de cuentas y los montos por mes. Las cuentas no
              encontradas se marcarán para que tú las revises.
            </div>
          )}
        </div>
        <div style={modalStyles.footer}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="filled" icon="check" disabled={phase !== "done"} onClick={onClose}>
            Importar valores
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---- ExportModal ------------------------------------------------------
const ExportModal = ({ onClose }) => {
  const [fmt, setFmt] = React.useState("xlsx");
  const [opts, setOpts] = React.useState({ ref: true, ai: true, totals: true });
  return (
    <div style={modalStyles.scrim}>
      <div style={modalStyles.card}>
        <ModalHeader icon="download" title="Exportar presupuesto"
          subtitle="Elige el formato y los datos a incluir." onClose={onClose} />
        <div style={modalStyles.body}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <ChoiceCard icon="file-spreadsheet" title="Excel (.xlsx)"
              description="Hoja editable con fórmulas y formato condicional."
              selected={fmt === "xlsx"} onSelect={() => setFmt("xlsx")} />
            <ChoiceCard icon="file-type-pdf" title="PDF"
              description="Reporte ejecutivo listo para compartir o imprimir."
              selected={fmt === "pdf"} onSelect={() => setFmt("pdf")} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-900)", marginBottom: 8 }}>
            Incluir
          </div>
          {[
            { k: "ref",    l: "Columnas de referencia (Real 2025)" },
            { k: "ai",     l: "Indicadores de valores calculados con IA" },
            { k: "totals", l: "Subtotales por sección y utilidad neta" },
          ].map(o => (
            <label key={o.k} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
              borderRadius: 8, cursor: "pointer",
              background: opts[o.k] ? "var(--sm-primary-100)" : "transparent",
            }}>
              <input type="checkbox" checked={opts[o.k]}
                onChange={(e) => setOpts(p => ({ ...p, [o.k]: e.target.checked }))}
                style={{ accentColor: "var(--sm-primary-600)" }} />
              <span style={{ fontSize: 14, color: "var(--slate-800)" }}>{o.l}</span>
            </label>
          ))}
        </div>
        <div style={modalStyles.footer}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="filled" icon="download" onClick={onClose}>Exportar</Button>
        </div>
      </div>
    </div>
  );
};

// ---- ForecastModal — bar chart version ----
const ForecastModal = ({ onClose, budget }) => {
  const cutoff = 4; // Meses ya ejecutados: Ene-Abr (índices 0-3)

  const sumByMonth = (group, useActuals) => {
    const out = Array(12).fill(0);
    ACCOUNTS.forEach(a => {
      if (a.group === group && !a.parent) {
        for (let i = 0; i < 12; i++) {
          if (useActuals) {
            out[i] += i < cutoff ? (ACTUALS_2026[a.code][i] || 0) : 0;
          } else {
            out[i] += budget[a.code][i];
          }
        }
      }
    });
    return out;
  };

  // Usamos Ingresos operacionales (siempre positivos) para el gráfico
  const ingPlan = sumByMonth("ingresos", false);
  const ingReal = sumByMonth("ingresos", true);

  const budgetTotal   = sum12(ingPlan);
  const realYTD       = ingReal.reduce((s,v)=>s+v, 0);
  const remaining     = ingPlan.slice(cutoff).reduce((s,v)=>s+v,0);
  const forecastTotal = realYTD + remaining;
  const diff          = forecastTotal - budgetTotal;

  // Cumulative sums for chart — makes annual gap (234 vs 858) visually clear
  const cumPlan = ingPlan.reduce((acc, v, i) => { acc.push((acc[i-1]||0) + v); return acc; }, []);
  const cumReal = ingReal.map((v, i) => i < cutoff ? ingReal.slice(0, i+1).reduce((s,x)=>s+x,0) : null);

  // Bar chart: single bar per month (cumulative)
  const barW = 28, grpGap = 10;
  const grpW = barW * 2 + 6 + grpGap;
  const chartW = grpW * 12 + 40;
  const chartH = 180;
  const padL = 60, padB = 28, padT = 10;
  const drawH = chartH - padB - padT;
  const allVals = [...cumPlan, ...cumReal.filter(v => v !== null)];
  const maxV = Math.max(...allVals, 1);
  const minV = 0;
  const range = maxV - minV || 1;
  const yScale = v => padT + drawH - ((v - minV) / range) * drawH;
  const barH   = v => Math.abs(((v) / range) * drawH);
  const barY   = v => yScale(v);
  const zeroY  = yScale(0);

  // Precise insight values
  const planYTD      = sum12(ingPlan.slice(0, cutoff));
  const ytdDiff      = realYTD - planYTD;
  const ytdDiffSign  = ytdDiff >= 0 ? "+" : "-";
  const forecastDiff = forecastTotal - budgetTotal;
  const forecastSign = forecastDiff >= 0 ? "+" : "";

  const [tooltip, setTooltip] = React.useState(null);

  return (
    <div style={modalStyles.scrim}>
      <div style={{ ...modalStyles.card, width: 760 }}>
        <ModalHeader icon="trending-up" title="Forecast a fin de año"
          iconColor="#fff" iconBg="linear-gradient(135deg, #30ABA9 0%, #837FF3 100%)"
          subtitle={`Ene–Abr: ejecución real · May–Dic: presupuesto restante`}
          onClose={onClose} />
        <div style={modalStyles.body}>
          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            <ForecastStat label="Ingresos presupuestados" value={fmtAbbr(budgetTotal)}
              sub={`Plan completo ${new Date().getFullYear()}`} />
            <ForecastStat label="Real YTD (Ene–Abr)" value={fmtAbbr(realYTD)}
              sub="Ejecutado hasta hoy" accent="brand" />
            <ForecastStat label="Proyección fin de año"
              value={(diff >= 0 ? "+" : "") + fmtAbbr(forecastTotal)}
              sub={diff >= 0 ? `▲ +${fmtAbbr(Math.abs(diff))} por encima del plan` : `▼ ${fmtAbbr(Math.abs(diff))} por debajo del plan`}
              accent={diff >= 0 ? "positive" : "negative"} />
          </div>

          {/* Bar chart */}
          <div style={{ padding: "16px 16px 8px", borderRadius: 12,
            border: "1px solid var(--slate-200)", background: "#fff", overflowX: "auto" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--slate-700)", marginBottom: 12 }}>
              Ingresos acumulados — Plan vs. Real ejecutado
            </div>
            <svg width={chartW} height={chartH} style={{ display: "block", overflow: "visible" }}>
              {/* Y grid lines + labels */}
              {[0, 0.25, 0.5, 0.75, 1].map(t => {
                const v = minV + t * range;
                const y = yScale(v);
                return (
                  <g key={t}>
                    <line x1={padL} y1={y} x2={chartW - 8} y2={y}
                      stroke="#F1F5F9" strokeWidth={1} />
                    <text x={padL - 6} y={y + 4} fontSize="9" fill="#94A3B8" textAnchor="end">
                      {fmtAbbr(Math.round(v))}
                    </text>
                  </g>
                );
              })}

              {/* Cutoff label */}
              <line x1={padL + cutoff * grpW - grpGap/2} y1={padT}
                x2={padL + cutoff * grpW - grpGap/2} y2={chartH - padB}
                stroke="#CBD5E1" strokeDasharray="3 3" />
              <text x={padL + cutoff * grpW - grpGap/2 + 3} y={padT + 10}
                fontSize="9" fill="#64748B">Hoy</text>

              {/* Bars — cumulative */}
              {MONTHS.map((m, i) => {
                const x = padL + i * grpW;
                const isPast = i < cutoff;
                const pv = cumPlan[i];
                const rv = cumReal[i];
                return (
                  <g key={m}>
                    {/* Plan acumulado — gris, todos los meses */}
                    <rect
                      x={x} y={barY(pv)} width={barW} height={Math.max(barH(pv), 1)}
                      fill="#CBD5E1" opacity={0.75} rx={2}
                      onMouseEnter={() => setTooltip({ x: x + barW/2, y: barY(pv), label: m, plan: pv, real: isPast ? rv : null, isPast })}
                      onMouseLeave={() => setTooltip(null)} style={{ cursor: "default" }} />
                    {/* Real acumulado — teal si ya pasó, punteado si no */}
                    {isPast ? (
                      <rect
                        x={x + barW + 6} y={barY(rv)} width={barW} height={Math.max(barH(rv), 1)}
                        fill="#30ABA9" rx={2}
                        onMouseEnter={() => setTooltip({ x: x + barW + 6 + barW/2, y: barY(rv), label: m, plan: pv, real: rv, isPast })}
                        onMouseLeave={() => setTooltip(null)} style={{ cursor: "default" }} />
                    ) : (
                      <rect x={x + barW + 6} y={barY(pv)} width={barW} height={Math.max(barH(pv), 1)}
                        fill="none" stroke="#30ABA9" strokeDasharray="3 2" strokeWidth={1.5} rx={2} opacity={0.5}
                        onMouseEnter={() => setTooltip({ x: x + barW + 6 + barW/2, y: barY(pv), label: m, plan: pv, real: null, isPast })}
                        onMouseLeave={() => setTooltip(null)} style={{ cursor: "default" }} />
                    )}
                    {/* Month label */}
                    <text x={x + barW + 3} y={chartH - padB + 14}
                      fontSize="9" fill={isPast ? "#334155" : "#94A3B8"}
                      textAnchor="middle" fontWeight={isPast ? 600 : 400}>{m}</text>
                  </g>
                );
              })}

              {tooltip ? (
                <g>
                  <rect x={tooltip.x - 58} y={tooltip.y - 50} width={116} height={46}
                    rx={6} fill="#0F172A" opacity={0.92} />
                  <text x={tooltip.x} y={tooltip.y - 34} fontSize="10" fill="#94A3B8"
                    textAnchor="middle" fontWeight="600">{tooltip.label}</text>
                  <text x={tooltip.x} y={tooltip.y - 20} fontSize="10" fill="#CBD5E1"
                    textAnchor="middle">Presupuestado: {fmtAbbr(tooltip.plan)}</text>
                  {tooltip.real != null ? (
                    <text x={tooltip.x} y={tooltip.y - 8} fontSize="10" fill="#5EEAD4"
                      textAnchor="middle">Real: {fmtAbbr(tooltip.real)}</text>
                  ) : tooltip.isPast === false ? (
                    <text x={tooltip.x} y={tooltip.y - 8} fontSize="10" fill="#94A3B8"
                      textAnchor="middle">Real: pendiente</text>
                  ) : null}
                </g>
              ) : null}
            </svg>

            {/* Legend */}
            <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "var(--slate-600)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 12, height: 10, borderRadius: 2,
                  background: "#CBD5E1", display: "inline-block" }} />
                Presupuestado
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 12, height: 10, borderRadius: 2,
                  background: "#30ABA9", display: "inline-block" }} />
                Real ejecutado
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 12, height: 10, borderRadius: 2, border: "1.5px dashed #30ABA9",
                  display: "inline-block" }} />
                Real proyectado (pendiente)
              </div>
            </div>
          </div>

          {/* AI insight */}
          <div style={{ marginTop: 14, padding: 12, borderRadius: 10,
            background: "rgba(48,171,169,.06)", border: "1px solid var(--sm-primary-200)",
            display: "flex", gap: 10 }}>
            <i className="ti ti-sparkles" style={{ fontSize: 18, color: "var(--sm-primary-700)", flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: "var(--slate-700)", lineHeight: 1.6 }}>
              <b>Insight:</b> tu ejecución real (Ene–Abr) está <b>{ytdDiffSign}{fmtAbbr(Math.abs(ytdDiff))}</b> vs. el plan del mismo periodo ({fmtAbbr(planYTD)} presupuestado, {fmtAbbr(realYTD)} ejecutado).
              Si el resto del año sigue el presupuesto, cerrarías con <b>{fmtAbbr(forecastTotal)}</b> ({forecastSign}{fmtAbbr(forecastDiff)} vs. el plan de {fmtAbbr(budgetTotal)}).
            </div>
          </div>
        </div>
        <div style={modalStyles.footer}>
          <Button variant="outline" icon="download">Exportar forecast</Button>
          <Button variant="filled" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
};

const ForecastStat = ({ label, value, sub, accent = "neutral" }) => {
  const colors = {
    neutral:  { bg: "#fff", fg: "var(--slate-900)" },
    brand:    { bg: "rgba(48,171,169,.08)", fg: "var(--sm-primary-800)" },
    positive: { bg: "rgba(36,159,88,.08)",  fg: "var(--green-500)" },
    negative: { bg: "rgba(225,29,72,.06)",  fg: "var(--rose-600)" },
  }[accent];
  return (
    <div style={{
      padding: 14, borderRadius: 10, background: colors.bg,
      border: "1px solid var(--slate-200)",
    }}>
      <div style={{ fontSize: 12, color: "var(--slate-500)", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: colors.fg,
        fontVariantNumeric: "tabular-nums", marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--slate-500)", marginTop: 2 }}>{sub}</div>
    </div>
  );
};
const Legend = ({ color, label, dashed }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--slate-600)" }}>
    <span style={{
      display: "inline-block", width: 16, height: 0,
      borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}`,
    }} />
    {label}
  </div>
);

Object.assign(window, { FormulaModal, ImportModal, ExportModal, ForecastModal });
