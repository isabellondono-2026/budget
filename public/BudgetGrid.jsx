// BudgetGrid — main editable budget table.

const gridStyles = {
  shell: { display: "flex", flexDirection: "column", gap: 16, minHeight: 0 },
  toolbar: {
    background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 12,
    padding: "10px 12px", display: "flex", alignItems: "center", gap: 10,
    flexWrap: "wrap",
  },
  tableWrap: {
    background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 12,
    overflow: "auto", maxHeight: "calc(100vh - 230px)",
  },
};

// Compute initial budget values from a fuente choice.
function computeInitialValues(fuente) {
  const v = {};
  ACCOUNTS.forEach(a => {
    if (fuente === "ai") v[a.code] = AI_2026[a.code].values.slice();
    else if (fuente === "actual_2025") v[a.code] = ACTUALS[2025][a.code].slice();
    else if (fuente === "actual_2024") v[a.code] = ACTUALS[2024][a.code].slice();
    else if (fuente === "promedio") {
      v[a.code] = MONTHS.map((_, m) =>
        Math.round((ACTUALS[2023][a.code][m] + ACTUALS[2024][a.code][m] + ACTUALS[2025][a.code][m]) / 3 / 1000) * 1000
      );
    } else v[a.code] = Array(12).fill(0);
  });
  return v;
}

// Editable currency cell. value is a number (or null for empty).
const CellInput = ({ value, onCommit, isAI, hasError, dim, onFocusCell, onPaste, monthIdx, accountCode, rowHover }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft]     = React.useState("");
  const [cellHover, setCellHover] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [editing]);

  const startEdit = () => {
    setDraft(value == null || value === 0 ? "" : Math.round(value).toString());
    setEditing(true);
  };
  const commit = () => {
    const n = draft === "" ? 0 : Number(draft.replace(/[^\d.-]/g, ""));
    onCommit(isNaN(n) ? 0 : n);
    setEditing(false);
  };

  // Show full COP amount; tighten the type so it fits without wrapping.
  const display = value == null || value === 0 ? "—" : COP(value);
  const muted   = value === 0 || value == null;

  if (editing) {
    return (
      <input ref={ref} type="text" value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setEditing(false); }
        }}
        onPaste={(e) => onPaste && onPaste(e, accountCode, monthIdx)}
        style={{
          width: "100%", height: "100%", border: 0, outline: 0,
          padding: "0 6px", textAlign: "right",
          fontFamily: "var(--font-sans)", fontSize: 11,
          fontVariantNumeric: "tabular-nums", color: "var(--slate-900)",
          letterSpacing: "-0.015em",
          background: "#fff",
          boxShadow: "inset 0 0 0 2px var(--sm-primary-600)",
          borderRadius: 4,
          whiteSpace: "nowrap",
        }} />
    );
  }

  // Affordance: when row is hovered, draw a subtle input-like frame.
  // When the cell itself is hovered, intensify it. Single click to edit.
  const showFrame = rowHover || cellHover;
  return (
    <div
      onClick={() => { onFocusCell && onFocusCell(accountCode, monthIdx); startEdit(); }}
      onMouseEnter={() => setCellHover(true)}
      onMouseLeave={() => setCellHover(false)}
      title={isAI ? "Valor sugerido por IA — clic para editar" : "Clic para editar"}
      style={{
        position: "relative",
        height: "100%",
        margin: showFrame ? 4 : 0,
        padding: showFrame ? "0 5px" : "0 6px",
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        fontFamily: "var(--font-sans)", fontSize: 11,
        whiteSpace: "nowrap", overflow: "hidden",
        letterSpacing: "-0.015em",
        fontVariantNumeric: "tabular-nums",
        fontStyle: isAI && !muted ? "italic" : "normal",
        color: hasError
          ? "var(--rose-600)"
          : muted
            ? "var(--slate-400)"
            : isAI
              ? "var(--sm-primary-700)"
              : "var(--slate-900)",
        opacity: dim ? 0.5 : 1,
        background: hasError
          ? "rgba(249,57,57,.08)"
          : cellHover
            ? "#fff"
            : showFrame
              ? "rgba(255,255,255,.7)"
              : "transparent",
        border: cellHover
          ? "1px solid var(--sm-primary-600)"
          : showFrame
            ? "1px solid var(--slate-200)"
            : "1px solid transparent",
        borderRadius: 6,
        boxShadow: cellHover ? "0 0 0 3px rgba(48,171,169,.12)" : "none",
        cursor: "text",
        transition: "border-color .12s, background .12s, box-shadow .12s",
      }}>
      {display}
      {cellHover ? (
        <i className="ti ti-pencil" style={{
          position: "absolute", left: 5, top: "50%", transform: "translateY(-50%)",
          fontSize: 12, color: "var(--sm-primary-700)",
          background: "rgba(48,171,169,.12)", borderRadius: 4, padding: 2,
          flexShrink: 0,
        }} />
      ) : null}
    </div>
  );
};

// Cell column widths
const CW_LABEL = 280;
const CW_REF   = 96;     // per-month reference column
const CW_MONTH = 116;    // plan column
const CW_TOTAL_REF = 130; // total año — reference
const CW_TOTAL = 150;    // total año — plan (full COP, no abbreviation)

// YTD: simulate 4 months executed (Ene-Abr)
const YTD_CUTOFF = 4;
const getYTD = (refValues) => {
  if (!refValues) return 0;
  return refValues.slice(0, YTD_CUTOFF).reduce((s, v) => s + (v || 0), 0);
};

// Editable Total Año cell
const TotalCellInput = ({ annual, desiredTotal, onCommitAnnual, hasError, rowHover, annualMismatch }) => {
  // When there's a mismatch, show the user's typed value (desiredTotal), not the sum of months
  const displayValue = annualMismatch && desiredTotal != null ? desiredTotal : annual;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [cellHover, setCellHover] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);
  const startEdit = () => { setDraft(displayValue === 0 ? "" : Math.round(displayValue).toString()); setEditing(true); };
  const commit = () => {
    const n = draft === "" ? 0 : Number(draft.replace(/[^\d.-]/g, ""));
    onCommitAnnual(isNaN(n) ? 0 : n);
    setEditing(false);
  };
  const showFrame = rowHover || cellHover;
  if (editing) {
    return (
      <input ref={ref} type="text" value={draft}
        onChange={e => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        style={{
          width: "100%", height: "100%", border: 0, outline: 0,
          padding: "0 8px", textAlign: "right", fontFamily: "var(--font-sans)",
          fontSize: 11, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em",
          color: "var(--slate-900)", background: "#fff",
          boxShadow: "inset 0 0 0 2px var(--sm-primary-600)", borderRadius: 4,
        }} />
    );
  }
  return (
    <div onClick={startEdit}
      onMouseEnter={() => setCellHover(true)} onMouseLeave={() => setCellHover(false)}
      title={annualMismatch
        ? `Total digitado: ${COP(displayValue)} · Suma de meses: ${COP(annual)} · Usa "Distribuir" para igualar`
        : "Clic para editar el total anual"}
      style={{
        height: "100%", padding: showFrame ? "0 6px" : "0 8px", margin: showFrame ? 3 : 0,
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        fontSize: 11, fontWeight: 700, letterSpacing: "-0.015em", whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
        color: annualMismatch ? "var(--rose-600)" : displayValue === 0 ? "var(--slate-400)" : "var(--slate-900)",
        background: annualMismatch ? "rgba(249,57,57,.06)" : cellHover ? "#fff" : showFrame ? "rgba(255,255,255,.7)" : "transparent",
        border: cellHover ? "1px solid var(--sm-primary-600)" : showFrame ? "1px solid var(--slate-300)" : "1px solid transparent",
        borderRadius: 6, cursor: "text",
        boxShadow: cellHover ? "0 0 0 3px rgba(48,171,169,.12)" : "none",
        transition: "border-color .12s, background .12s",
        gap: 4,
      }}>
      {displayValue === 0 ? "—" : COP(displayValue)}
      {annualMismatch ? <i className="ti ti-alert-triangle" style={{ fontSize: 11, color: "var(--rose-600)", flexShrink: 0 }} /> : null}
    </div>
  );
};

// ----- Account row -----
const AccountRow = ({ account, values, refValues, aiRow, selected, onToggleSelect,
                     onEditCell, onDistributeAnnual, onReplicateMonth, onApplyFormula,
                     onFocusCell, onPaste, showRef, refYearLabel, dim, hasError,
                     onCommitAnnual, annualMismatch, desiredTotal, annualMode }) => {
  const [hover, setHover] = React.useState(false);
  const annual = sum12(values);
  // In annual view: show full executed sum; in monthly view: show YTD (4 months executed)
  const ytd = annualMode ? sum12(refValues || []) : getYTD(refValues);
  const indent = account.parent ? 24 : 0;

  return (
    <tr
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: selected ? "rgba(48,171,169,.06)" : hover ? "var(--slate-50)" : "transparent",
      }}>
      <td style={{
        position: "sticky", left: 0, zIndex: 3,
        background: selected ? "rgb(231,247,247)" : hover ? "#F1F5F9" : "#fff",
        width: CW_LABEL, minWidth: CW_LABEL,
        borderBottom: "1px solid var(--slate-100)",
        borderRight: "1px solid var(--slate-200)",
        padding: "0 12px", height: 40,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, height: "100%" }}>
          <input type="checkbox" checked={selected} onChange={onToggleSelect}
            style={{ accentColor: "var(--sm-primary-600)" }} />
          <span style={{
            fontSize: 11, color: "var(--slate-500)", fontVariantNumeric: "tabular-nums",
            width: 48, flexShrink: 0,
          }}>{account.code}</span>
          <span style={{
            fontSize: 13, color: "var(--slate-800)",
            fontWeight: account.parent ? 400 : 500,
            paddingLeft: indent,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{account.name}</span>
          {hover ? (
            <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
              <RowAction icon="layout-distribute-horizontal" title="Distribuir anual en 12 meses"
                onClick={() => onDistributeAnnual(account.code)} />
              <RowAction icon="wand" title="Aplicar fórmula a la fila"
                onClick={() => onApplyFormula(account.code)} />
            </div>
          ) : null}
        </div>
      </td>

      {annualMode ? (
        <>
          {/* Col 1: Presupuesto (editable) — always visible */}
          <td style={{
            width: 160, minWidth: 160, height: 40,
            borderBottom: "1px solid var(--slate-100)",
            borderRight: "1px solid var(--slate-200)",
            padding: 0,
          }}>
            <CellInput
              value={annual} isAI={aiRow && aiRow.every(Boolean)} hasError={hasError} dim={dim}
              rowHover={hover} accountCode={account.code} monthIdx={-1}
              onCommit={(v) => {
                const per = Math.round(v / 12 / 1000) * 1000;
                const arr = Array(12).fill(per); arr[11] = v - per * 11;
                MONTHS.forEach((_, idx) => onEditCell(account.code, idx, arr[idx]));
              }}
              onFocusCell={onFocusCell} onPaste={onPaste} />
          </td>
          {/* Col 2: Ejecutado — only when showRef */}
          {showRef ? (
            <td style={{
              width: 150, minWidth: 150, height: 40,
              background: "var(--slate-50)",
              borderBottom: "1px solid var(--slate-100)",
              borderRight: "1px solid var(--slate-200)",
              padding: "0 10px", textAlign: "right",
              fontSize: 11, color: "var(--slate-600)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.015em", whiteSpace: "nowrap",
            }} title="Ejecución real acumulada Ene–Abr (no editable)">
              {ytd === 0 ? "—" : COP(ytd)}
            </td>
          ) : null}
          {/* Col 3: Diferencia — only when showRef */}
          {showRef ? (() => {
            const diff = ytd - annual; // Ejecutado − Presupuesto: positive = over budget (good for income, bad for costs)
            const pos = diff >= 0;
            return (
              <td style={{
                width: 140, minWidth: 140, height: 40,
                background: annual === 0 && ytd === 0 ? "transparent" : pos ? "rgba(36,159,88,.06)" : "rgba(225,29,72,.05)",
                borderBottom: "1px solid var(--slate-100)",
                borderRight: "1px solid var(--slate-200)",
                padding: "0 10px", textAlign: "right",
                fontSize: 11, fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.015em", whiteSpace: "nowrap",
                color: annual === 0 && ytd === 0 ? "var(--slate-400)" : pos ? "var(--green-500)" : "var(--rose-600)",
              }} title="Diferencia: Ejecutado − Presupuesto">
                {annual === 0 && ytd === 0 ? "—" : (pos ? "+" : "") + COP(diff)}
              </td>
            );
          })() : null}
        </>
      ) : MONTHS.map((m, i) => {
        // Only show real execution for executed months (Ene-Abr, indices 0-3); future months = 0
        const refVal = (refValues && i < YTD_CUTOFF) ? refValues[i] : 0;
        const isPastMonth = i < YTD_CUTOFF;
        return (
          <React.Fragment key={m}>
            <td style={{
              width: CW_MONTH, minWidth: CW_MONTH, height: 40,
              borderBottom: "1px solid var(--slate-100)",
              borderRight: showRef && isPastMonth ? "1px dashed var(--slate-200)" : (i === 11 ? "1px solid var(--slate-200)" : "1px solid var(--slate-100)"),
              padding: 0,
            }}>
              <CellInput
                value={values[i]}
                isAI={aiRow && aiRow[i]}
                hasError={hasError}
                dim={dim}
                rowHover={hover}
                accountCode={account.code} monthIdx={i}
                onCommit={(v) => onEditCell(account.code, i, v)}
                onFocusCell={onFocusCell}
                onPaste={onPaste} />
            </td>
            {showRef ? (
              <td style={{
                width: CW_REF, minWidth: CW_REF, height: 40,
                borderBottom: "1px solid var(--slate-100)",
                borderRight: i === 11 ? "1px solid var(--slate-200)" : "1px solid var(--slate-100)",
                padding: "0 6px", textAlign: "right",
                fontSize: 11, color: "var(--slate-500)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.015em",
                whiteSpace: "nowrap",
                background: "var(--slate-50)",
              }} title={isPastMonth ? `Ejec. real · ${COP(refVal)}` : 'Mes no ejecutado aún'}>
                {refVal === 0 ? "—" : COP(refVal)}
              </td>
            ) : null}
          </React.Fragment>
        );
      })}

      {!annualMode ? (
        <td style={{
          width: CW_TOTAL, minWidth: CW_TOTAL, height: 40,
          background: "#E2E8F0",
          borderBottom: "1px solid var(--slate-100)",
          padding: 0,
          position: "sticky", right: showRef ? CW_TOTAL_REF : 0, zIndex: 3,
        }}>
          <TotalCellInput
            annual={annual}
            desiredTotal={desiredTotal}
            hasError={hasError}
            annualMismatch={annualMismatch}
            rowHover={hover}
            onCommitAnnual={onCommitAnnual} />
        </td>
      ) : null}
      {!annualMode && showRef ? (
        <td style={{
          width: CW_TOTAL_REF, minWidth: CW_TOTAL_REF, height: 40,
          background: "#F1F5F9",
          borderBottom: "1px solid var(--slate-100)",
          borderLeft: "1px solid var(--slate-200)",
          padding: "0 8px",
          fontSize: 11, fontWeight: 500, color: "var(--slate-600)",
          fontVariantNumeric: "tabular-nums", textAlign: "right",
          letterSpacing: "-0.015em", whiteSpace: "nowrap",
          position: "sticky", right: 0, zIndex: 3,
        }} title={`Ejecución real YTD (Ene–Abr)`}>
          {ytd === 0 ? "—" : COP(ytd)}
        </td>
      ) : null}
    </tr>
  );
};

const RowAction = ({ icon, title, onClick }) => (
  <button onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
    title={title}
    style={{
      width: 24, height: 24, borderRadius: 6, border: 0, cursor: "pointer",
      background: "transparent", color: "var(--slate-500)",
      display: "grid", placeItems: "center",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--slate-200)"; e.currentTarget.style.color = "var(--slate-700)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--slate-500)"; }}>
    <i className={`ti ti-${icon}`} style={{ fontSize: 14 }} />
  </button>
);

// Section header row (e.g. "Ingresos operacionales")
const SectionHeaderRow = ({ section, showRef, annualMode }) => (
  <tr>
    <td style={{
      position: "sticky", left: 0, zIndex: 3,
      background: "var(--slate-100)",
      borderBottom: "1px solid var(--slate-200)",
      borderRight: "1px solid var(--slate-200)",
      padding: "0 12px", height: 36,
      fontSize: 11, fontWeight: 600, letterSpacing: ".04em",
      textTransform: "uppercase", color: "var(--slate-700)",
    }}>{section.id}</td>
    {annualMode ? (
      <>
        <td style={{ background: "var(--slate-100)", borderBottom: "1px solid var(--slate-200)", borderRight: "1px solid var(--slate-200)", width: 160 }} />
        {showRef ? <td style={{ background: "var(--slate-100)", borderBottom: "1px solid var(--slate-200)", borderRight: "1px solid var(--slate-200)", width: 150 }} /> : null}
        {showRef ? <td style={{ background: "var(--slate-100)", borderBottom: "1px solid var(--slate-200)", borderRight: "1px solid var(--slate-200)", width: 140 }} /> : null}
      </>
    ) : MONTHS.map((_, i) => (
      <React.Fragment key={i}>
        {showRef ? <td style={{ background: "var(--slate-100)", borderBottom: "1px solid var(--slate-200)", borderRight: "1px dashed var(--slate-200)" }} /> : null}
        <td style={{ background: "var(--slate-100)", borderBottom: "1px solid var(--slate-200)", borderRight: i === 11 ? "1px solid var(--slate-200)" : "1px solid var(--slate-100)" }} />
      </React.Fragment>
    ))}
    {!annualMode ? (
      <td style={{ background: "var(--slate-100)", borderBottom: "1px solid var(--slate-200)", position: "sticky", right: showRef ? CW_TOTAL_REF : 0, zIndex: 2 }} />
    ) : null}
    {showRef && !annualMode ? (
      <td style={{ background: "var(--slate-100)", borderBottom: "1px solid var(--slate-200)", position: "sticky", right: 0, zIndex: 2 }} />
    ) : null}
  </tr>
);

// Section subtotal row (after a section)
const SectionSubtotalRow = ({ label, values, refValues, showRef, accent = "neutral", annualMode }) => {
  // Sticky cells need solid (opaque) backgrounds so they cover values
  // underneath during horizontal scroll. We pre-compose the tint over white.
  const colors = {
    neutral:  { bg: "var(--slate-50)",       solid: "#F8FAFC", fg: "var(--slate-700)" },
    positive: { bg: "rgba(36,159,88,.06)",   solid: "#F4FBF6", fg: "var(--green-500)" },
    negative: { bg: "rgba(225,29,72,.04)",   solid: "#FDF6F7", fg: "var(--rose-600)" },
    bold:     { bg: "rgba(48,171,169,.10)",  solid: "#EAF6F6", fg: "var(--sm-primary-800)" },
  }[accent];
  const annual = sum12(values);
  const refAnnual = refValues ? sum12(refValues) : 0;
  const ytdRef = refValues ? (annualMode ? sum12(refValues) : getYTD(refValues)) : 0;
  return (
    <tr>
      <td style={{
        position: "sticky", left: 0, zIndex: 4,
        background: colors.solid,
        borderTop: "1px solid var(--slate-300)",
        borderBottom: "1px solid var(--slate-200)",
        borderRight: "1px solid var(--slate-200)",
        padding: "0 12px", height: 36,
        fontSize: 12, fontWeight: 700, color: colors.fg,
      }}>{label}</td>
      {annualMode ? (
        <>
          <td style={{ background: colors.bg, borderTop: "1px solid var(--slate-300)", borderBottom: "1px solid var(--slate-200)", borderRight: "1px solid var(--slate-200)", width: 160, padding: "0 10px", textAlign: "right", fontSize: 11, fontWeight: 700, color: colors.fg, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em", whiteSpace: "nowrap" }}>{COP(annual)}</td>
          {showRef ? <td style={{ background: colors.bg, borderTop: "1px solid var(--slate-300)", borderBottom: "1px solid var(--slate-200)", borderRight: "1px solid var(--slate-200)", width: 150, padding: "0 10px", textAlign: "right", fontSize: 11, fontWeight: 500, color: "var(--slate-500)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em", whiteSpace: "nowrap" }}>{ytdRef === 0 ? "—" : COP(ytdRef)}</td> : null}
          {showRef ? (() => { const diff = ytdRef - annual; const pos = diff >= 0; return <td style={{ background: pos ? "rgba(36,159,88,.06)" : "rgba(225,29,72,.05)", borderTop: "1px solid var(--slate-300)", borderBottom: "1px solid var(--slate-200)", borderRight: "1px solid var(--slate-200)", width: 140, padding: "0 10px", textAlign: "right", fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em", whiteSpace: "nowrap", color: pos ? "var(--green-500)" : "var(--rose-600)" }}>{(pos ? "+" : "") + COP(diff)}</td>; })() : null}
        </>
      ) : values.map((v, i) => {
        const rv = (refValues && i < YTD_CUTOFF) ? refValues[i] : 0;
        return (
          <React.Fragment key={i}>
            <td style={{
              background: colors.bg,
              borderTop: "1px solid var(--slate-300)",
              borderBottom: "1px solid var(--slate-200)",
              borderRight: showRef && i < YTD_CUTOFF ? "1px dashed var(--slate-200)" : (i === 11 ? "1px solid var(--slate-200)" : "1px solid var(--slate-100)"),
              padding: "0 6px", textAlign: "right",
              fontSize: 11, fontWeight: 600, color: colors.fg,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.015em",
              whiteSpace: "nowrap",
            }}>{v === 0 ? "—" : COP(v)}</td>
            {showRef ? (
              <td style={{
                background: colors.bg,
                borderTop: "1px solid var(--slate-300)",
                borderBottom: "1px solid var(--slate-200)",
                borderRight: i === 11 ? "1px solid var(--slate-200)" : "1px solid var(--slate-100)",
                padding: "0 6px", textAlign: "right",
                fontSize: 11, fontWeight: 500, color: "var(--slate-500)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.015em",
                whiteSpace: "nowrap",
              }}>{rv === 0 ? "—" : COP(rv)}</td>
            ) : null}
          </React.Fragment>
        );
      })}
      {!annualMode ? (
        <td style={{
          background: colors.solid,
          borderTop: "1px solid var(--slate-300)",
          borderBottom: "1px solid var(--slate-200)",
          padding: "0 12px", textAlign: "right",
          fontSize: 12, fontWeight: 700, color: colors.fg,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.015em", whiteSpace: "nowrap",
          position: "sticky", right: showRef ? CW_TOTAL_REF : 0, zIndex: 4,
        }}>{COP(annual)}</td>
      ) : null}
      {showRef && !annualMode ? (
        <td style={{
          background: colors.solid,
          borderTop: "1px solid var(--slate-300)",
          borderBottom: "1px solid var(--slate-200)",
          borderLeft: "1px solid var(--slate-200)",
          padding: "0 10px", textAlign: "right",
          fontSize: 11, fontWeight: 500, color: "var(--slate-500)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.015em", whiteSpace: "nowrap",
          position: "sticky", right: 0, zIndex: 4,
        }}>{refAnnual === 0 ? "—" : COP(refAnnual)}</td>
      ) : null}
    </tr>
  );
};

Object.assign(window, {
  computeInitialValues, AccountRow, SectionHeaderRow, SectionSubtotalRow, gridStyles,
  CW_LABEL, CW_REF, CW_MONTH, CW_TOTAL, CW_TOTAL_REF,
});
