// BudgetEditor — the main screen the user spends most of their time in.

const editorStyles = {
  page: {
    padding: "20px 24px 32px", maxWidth: "100%", width: "100%",
    minWidth: 0, display: "flex", flexDirection: "column", gap: 14,
  },
  header: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    gap: 16, flexWrap: "wrap",
  },
  toolbarPrimary: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 12,
    padding: "8px 10px", flexWrap: "wrap",
  },
  searchBox: {
    display: "flex", alignItems: "center", gap: 8,
    height: 34, padding: "0 12px",
    background: "var(--slate-100)", borderRadius: 8,
    color: "var(--slate-500)", fontSize: 13,
    minWidth: 240, flex: 1, maxWidth: 360,
  },
  pill: (active) => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 12px", borderRadius: 999,
    border: `1px solid ${active ? "var(--sm-primary-600)" : "var(--slate-300)"}`,
    background: active ? "var(--sm-primary-100)" : "#fff",
    color: active ? "var(--sm-primary-900)" : "var(--slate-700)",
    fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer",
  }),
};

const BudgetEditor = ({ wizardData, onReopenWizard }) => {
  const [name, setName] = React.useState(
    wizardData.companyName
      ? `Presupuesto ${wizardData.anio || new Date().getFullYear()} — ${wizardData.companyName}`
      : wizardData.nombre
  );
  const [editingName, setEditingName] = React.useState(false);

  // Budget values: { code: [12 numbers] }
  const [values, setValues] = React.useState(() => computeInitialValues(wizardData.fuente));
  const [fuente, setFuente] = React.useState(wizardData.fuente);

  // ── Load real Alegra data when a token is available ──────────────────────
  React.useEffect(() => {
    const basic = wizardData.alegraBasic;
    if (!basic) return;

    const alegraFetch = (path) =>
      fetch(`https://api.alegra.com/api/v1${path}`, {
        headers: { Authorization: `Basic ${basic}`, Accept: "application/json" },
      }).then((r) => r.json());

    async function loadRealData() {
      try {
        // 1. Categorías / catálogo de cuentas
        const cats = await alegraFetch("/categories?limit=200");
        const categories = Array.isArray(cats) ? cats : (cats.data || []);

        // 2. Mapear tipos de cuenta al grupo del prototipo
        function mapGroup(cat) {
          const t = (cat.type || "").toLowerCase();
          const n = (cat.name || "").toLowerCase();
          if (t.includes("income") || n.includes("ingreso") || n.includes("venta"))   return "ingresos";
          if (n.includes("no operacional") || n.includes("financiero") || t.includes("other-income")) return "ingresos-no";
          if (t.includes("cost") || n.includes("costo"))                               return "costos";
          if (n.includes("admin") || n.includes("administrac"))                        return "gastos-admin";
          if (n.includes("venta") || n.includes("comerc") || n.includes("mercadeo"))   return "gastos-venta";
          if (n.includes("financiero") || n.includes("no oper") || t.includes("other-expense")) return "gastos-fin";
          if (n.includes("impuesto") || n.includes("renta"))                           return "impuestos";
          return null; // omitir sin grupo
        }

        const realAccounts = categories
          .filter((c) => mapGroup(c))
          .map((c) => ({
            code:   String(c.id),
            name:   c.name || `Cuenta ${c.id}`,
            group:  mapGroup(c),
            parent: c.parentId ? String(c.parentId) : null,
          }));

        if (!realAccounts.length) return; // sin cuentas, mantener sintéticas

        // 3. Movimientos ejecutados — año configurado en el wizard
        const year = wizardData.anio || new Date().getFullYear();
        const dateStart = `${year}-01-01`;
        const dateEnd   = `${year}-12-31`;

        const journals = await alegraFetch(
          `/journals?date-start=${dateStart}&date-end=${dateEnd}&limit=500`
        );
        const entries = Array.isArray(journals) ? journals : (journals.data || []);

        // Agrupar montos por cuenta y mes
        const executed = {};
        realAccounts.forEach((a) => { executed[a.code] = Array(12).fill(0); });

        entries.forEach((j) => {
          (j.lines || j.entries || []).forEach((line) => {
            const cId = String(line.accountId || line.account?.id || "");
            if (!executed[cId]) return;
            const d = new Date(j.date || j.createdAt || "");
            const m = d.getMonth();
            if (d.getFullYear() === year && m >= 0 && m < 12) {
              executed[cId][m] += Math.abs(parseFloat(line.debit || line.credit || line.amount || 0));
            }
          });
        });

        // 4. Actualizar globals que usa el prototipo
        window.ACCOUNTS    = realAccounts;
        window.ACTUALS_2026 = executed;

        // 5. Reinicializar valores presupuestados con la nueva fuente de datos
        setValues(computeInitialValues(wizardData.fuente));

        console.log(`✅ Datos reales cargados: ${realAccounts.length} cuentas, año ${year}`);
      } catch (err) {
        console.warn("No se pudieron cargar datos reales de Alegra:", err.message);
      }
    }

    loadRealData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Undo stack — stores previous values snapshots, max 20
  const undoStack = React.useRef([]);
  const [canUndo, setCanUndo] = React.useState(false);
  const undoRef = React.useRef(null);
  const pushUndo = (snapshot) => {
    undoStack.current = [...undoStack.current.slice(-19), snapshot];
    setCanUndo(true);
  };
  const undo = React.useCallback(() => {
    if (!undoStack.current.length) return;
    const prev = undoStack.current[undoStack.current.length - 1];
    undoStack.current = undoStack.current.slice(0, -1);
    setCanUndo(undoStack.current.length > 0);
    setValues(prev);
    setAnnualMismatches({});
    setAnnualOverrides({});
    setRowErrors({});
    setToast({ msg: "Acción deshecha.", tone: "success" });
  }, []);
  undoRef.current = undo;
  // Keyboard shortcut Ctrl/Cmd+Z
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undoRef.current && undoRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Track which cells were AI-generated and have NOT been touched by the user.
  const [aiCells, setAiCells] = React.useState(() => {
    const out = {};
    ACCOUNTS.forEach(a => { out[a.code] = wizardData.fuente === "ai" ? Array(12).fill(true) : Array(12).fill(false); });
    return out;
  });
  // Per-row annual overrides — when user types a total, we distribute it equally
  const [annualOverrides, setAnnualOverrides] = React.useState({});
  // Per-row mismatch: when user typed an annual total that doesn't match sum of months
  const [annualMismatches, setAnnualMismatches] = React.useState({});

  const commitAnnual = (code, newTotal) => {
    if (newTotal === 0) {
      setAnnualMismatches(prev => { const n = { ...prev }; delete n[code]; return n; });
      setAnnualOverrides(prev => { const n = { ...prev }; delete n[code]; return n; });
      return;
    }
    const monthSum = sum12(values[code]);
    const mismatch = Math.abs(newTotal - monthSum) > 1;
    if (mismatch) {
      // Store the desired total but DON'T redistribute — show error, let user decide
      setAnnualMismatches(prev => ({ ...prev, [code]: { desired: newTotal, monthSum } }));
      setAnnualOverrides(prev => ({ ...prev, [code]: newTotal }));
      setToast({
        msg: `El total digitado (${COP(newTotal)}) no coincide con la suma de los meses (${COP(monthSum)}). Edita los meses individualmente o usa "Distribuir" al lado del nombre.`,
        tone: "danger",
      });
    } else {
      setAnnualMismatches(prev => { const n = { ...prev }; delete n[code]; return n; });
      setAnnualOverrides(prev => { const n = { ...prev }; delete n[code]; return n; });
      setToast({ msg: `Total anual confirmado: ${COP(newTotal)}.`, tone: "success" });
    }
  };

  // Per-row paste mismatch error
  const [rowErrors, setRowErrors] = React.useState({}); // {code: true}
  const [showRef,    setShowRef]    = React.useState(true);
  const [refYear,    setRefYear]    = React.useState(2025);
  const [hideZeros,  setHideZeros]  = React.useState(false);
  const [view,       setView]       = React.useState("mensual"); // mensual | anual
  const [search,     setSearch]     = React.useState("");
  const [selected,   setSelected]   = React.useState({}); // {code:true}
  const [aiOpen,     setAiOpen]     = React.useState(false);
  const [focusedAccount, setFocusedAccount] = React.useState(null);
  const [savedAt,    setSavedAt]    = React.useState(new Date());

  // Modals
  const [formulaModal, setFormulaModal]       = React.useState(null); // {code} or null
  const [seasonModal,  setSeasonModal]        = React.useState(null); // {code} or null
  const [importModal,  setImportModal]        = React.useState(false);
  const [exportModal,  setExportModal]        = React.useState(false);
  const [forecastOpen, setForecastOpen]       = React.useState(false);
  const [toast,        setToast]              = React.useState(null);

  // Period is fixed after wizard — read-only in editor
  const anio          = wizardData.anio;
  const periodicidad  = wizardData.periodicidad || "mensual";

  // Save state — explicit "Guardar" button alongside autosave pulse
  const [dirty,    setDirty]    = React.useState(false);
  const [saving,   setSaving]   = React.useState(false);
  const handleSave = () => {
    if (saving) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setDirty(false);
      setSavedAt(new Date());
      setToast({ msg: "Presupuesto guardado.", tone: "success" });
    }, 700);
  };
  // Mark dirty whenever values/name change
  const firstRun = React.useRef(true);
  React.useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setDirty(true);
  }, [values, name]);
  // Cmd/Ctrl+S to save
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Autosave indicator pulse
  React.useEffect(() => {
    const t = setTimeout(() => setSavedAt(new Date()), 800);
    return () => clearTimeout(t);
  }, [values, name]);

  // ---- Edit handlers ----
  const editCell = (code, monthIdx, val) => {
    pushUndo(values);
    setValues(prev => {
      const next = { ...prev, [code]: prev[code].slice() };
      next[code][monthIdx] = val;
      return next;
    });
    setAiCells(prev => {
      const next = { ...prev, [code]: prev[code].slice() };
      next[code][monthIdx] = false;
      return next;
    });
    setRowErrors(prev => { const n = { ...prev }; delete n[code]; return n; });
    // Clear annual mismatch when any month cell is edited
    setAnnualMismatches(prev => { const n = { ...prev }; delete n[code]; return n; });
    setAnnualOverrides(prev => { const n = { ...prev }; delete n[code]; return n; });
  };

  const distributeAnnual = (code) => {
    // Use the override total if the user typed an annual value that didn't match months
    const total = annualOverrides[code] || sum12(values[code]);
    if (total === 0) {
      setToast({ msg: "Esta cuenta no tiene total para distribuir.", tone: "warning" });
      return;
    }
    pushUndo(values);
    const per = Math.round(total / 12 / 1000) * 1000;
    const arr = Array(12).fill(per);
    arr[11] = total - per * 11;
    setValues(prev => ({ ...prev, [code]: arr }));
    setAiCells(prev => ({ ...prev, [code]: Array(12).fill(false) }));
    // Clear any annual mismatch since we just re-distributed
    setAnnualMismatches(prev => { const n = { ...prev }; delete n[code]; return n; });
    setAnnualOverrides(prev => { const n = { ...prev }; delete n[code]; return n; });
    setToast({ msg: `${COP(total)} distribuido en partes iguales en los 12 meses.`, tone: "success" });
  };

  const replicateMonthValue = (code, monthIdx) => {
    pushUndo(values);
    const v = values[code][monthIdx];
    setValues(prev => ({ ...prev, [code]: Array(12).fill(v) }));
    setAiCells(prev => ({ ...prev, [code]: Array(12).fill(false) }));
  };

  const applyFormulaToRow = (code, formula) => {
    // formula: { kind: "fixed"|"percent"|"inflation", value }
    const ref = ACTUALS[refYear][code] || Array(12).fill(0);
    let arr;
    if (formula.kind === "fixed") {
      arr = Array(12).fill(Math.round(formula.value));
    } else if (formula.kind === "percent") {
      const f = 1 + formula.value / 100;
      arr = ref.map(v => Math.round(v * f / 1000) * 1000);
    } else if (formula.kind === "inflation") {
      // Apply inflation compounding monthly: month i factor = (1+infl/12)^i+1, off baseline ref
      const monthly = formula.value / 100 / 12;
      arr = ref.map((v, i) => Math.round(v * Math.pow(1 + monthly, i + 1) / 1000) * 1000);
    } else {
      arr = ref.slice();
    }
    pushUndo(values);
    setValues(prev => ({ ...prev, [code]: arr }));
    setAiCells(prev => ({ ...prev, [code]: Array(12).fill(false) }));
    setFormulaModal(null);
    setToast({ msg: "Fórmula aplicada a la fila.", tone: "success" });
  };

  const applyFormulaBatch = (formula) => {
    const codes = Object.keys(selected).filter(k => selected[k]);
    if (codes.length === 0) return;
    const next = { ...values }, nextAi = { ...aiCells };
    codes.forEach(code => {
      const ref = ACTUALS[refYear][code] || Array(12).fill(0);
      let arr;
      if (formula.kind === "fixed") {
        arr = Array(12).fill(Math.round(formula.value));
      } else if (formula.kind === "percent") {
        const f = 1 + formula.value / 100;
        arr = ref.map(v => Math.round(v * f / 1000) * 1000);
      } else {
        const monthly = formula.value / 100 / 12;
        arr = ref.map((v, i) => Math.round(v * Math.pow(1 + monthly, i + 1) / 1000) * 1000);
      }
      next[code] = arr;
      nextAi[code] = Array(12).fill(false);
    });
    pushUndo(values);
    setValues(next);
    setAiCells(nextAi);
    setFormulaModal(null);
    setToast({ msg: `Fórmula aplicada a ${codes.length} cuenta(s).`, tone: "success" });
  };

  const applySeasonal = (code, curve) => {
    const ref = ACTUALS[refYear][code] || Array(12).fill(0);
    const refTotal = sum12(ref) || 1;
    let weights;
    if (curve === "lineal")     weights = Array(12).fill(1);
    else if (curve === "scurve") weights = [.55,.6,.7,.85,1.0,1.1,1.2,1.25,1.2,1.1,1.0,.85];
    else weights = ref.map(v => v / refTotal); // historical
    const wSum = weights.reduce((s,x)=>s+x,0);
    const annual = sum12(values[code]) || sum12(ref);
    const arr = weights.map(w => Math.round(annual * w / wSum / 1000) * 1000);
    pushUndo(values);
    setValues(prev => ({ ...prev, [code]: arr }));
    setAiCells(prev => ({ ...prev, [code]: Array(12).fill(false) }));
    setSeasonModal(null);
    setToast({ msg: `Distribución estacional aplicada (${curve === "scurve" ? "S-curve" : curve === "lineal" ? "lineal" : "histórica"}).`, tone: "success" });
  };

  // Excel paste: parse pasted text, map up to 12 numbers into the row.
  const handlePaste = (e, code, startIdx) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text || !/[\t,]/.test(text) && !/\n/.test(text) && text.split(/\s+/).length === 1) return;
    e.preventDefault();
    const cells = text.split(/[\t\n,]+/).map(s => s.trim()).filter(Boolean);
    const nums = cells.map(s => Number(s.replace(/[^\d.-]/g, ""))).filter(n => !isNaN(n));
    if (nums.length === 0) return;

    const row = values[code].slice();
    let mismatch = false;
    if (nums.length === 13) {
      // last is annual total — verify
      const monthly = nums.slice(0, 12);
      const declaredTotal = nums[12];
      const sum = monthly.reduce((s,x)=>s+x,0);
      monthly.forEach((v, i) => row[i] = v);
      if (Math.abs(sum - declaredTotal) > 1) mismatch = true;
    } else {
      nums.slice(0, 12 - startIdx).forEach((v, i) => { row[startIdx + i] = v; });
    }
    pushUndo(values);
    setValues(prev => ({ ...prev, [code]: row }));
    setAiCells(prev => ({ ...prev, [code]: Array(12).fill(false) }));
    if (mismatch) {
      setRowErrors(prev => ({ ...prev, [code]: true }));
      setToast({ msg: "El total anual pegado no coincide con la suma de los meses.", tone: "danger" });
    } else {
      setRowErrors(prev => { const n = { ...prev }; delete n[code]; return n; });
      setToast({ msg: `Pegados ${Math.min(nums.length, 12)} valores desde Excel.`, tone: "success" });
    }
  };

  // Batch actions
  const selectedCodes = Object.keys(selected).filter(k => selected[k]);
  const selectAll = (on) => {
    if (on) {
      const all = {}; ACCOUNTS.forEach(a => { all[a.code] = true; });
      setSelected(all);
    } else setSelected({});
  };
  const clearReferenceForSelected = () => {
    const next = { ...values }, nextAi = { ...aiCells };
    selectedCodes.forEach(c => { next[c] = Array(12).fill(0); nextAi[c] = Array(12).fill(false); });
    pushUndo(values);
    setValues(next); setAiCells(nextAi);
    setToast({ msg: `Datos borrados en ${selectedCodes.length} cuenta(s). Puedes recopiarlos desde "Volver a copiar referencia".`, tone: "warning" });
  };
  const recopyReferenceForSelected = () => {
    const next = { ...values }, nextAi = { ...aiCells };
    selectedCodes.forEach(c => {
      next[c] = fuente === "ai" ? AI_2026[c].values.slice() : ACTUALS[refYear][c].slice();
      nextAi[c] = fuente === "ai" ? Array(12).fill(true) : Array(12).fill(false);
    });
    pushUndo(values);
    setValues(next); setAiCells(nextAi);
    setToast({ msg: `Referencia recopiada en ${selectedCodes.length} cuenta(s).`, tone: "success" });
  };

  const changeFuente = (newF) => {
    setFuente(newF);
    setValues(computeInitialValues(newF));
    const ai = {};
    ACCOUNTS.forEach(a => { ai[a.code] = newF === "ai" ? Array(12).fill(true) : Array(12).fill(false); });
    setAiCells(ai);
    setRowErrors({});
    setToast({ msg: "Datos de referencia cambiados — todas las cuentas se reescribieron.", tone: "warning" });
  };

  // Compute group sums
  const sumGroup = (group) => {
    const out = Array(12).fill(0);
    ACCOUNTS.forEach(a => {
      if (a.group === group && !a.parent) {
        for (let i = 0; i < 12; i++) out[i] += values[a.code][i];
      }
    });
    return out;
  };
  const sumGroupRef = (group) => {
    const out = Array(12).fill(0);
    ACCOUNTS.forEach(a => {
      if (a.group === group && !a.parent) {
        for (let i = 0; i < 12; i++) out[i] += ACTUALS_2026[a.code][i];
      }
    });
    return out;
  };
  // Calculated reference rows (Utilidad bruta, etc.) — same formula on actuals
  const refIngresos    = sumGroupRef("ingresos");
  const refIngresosNo  = sumGroupRef("ingresos-no");
  const refCostos      = sumGroupRef("costos");
  const refGAdmin      = sumGroupRef("gastos-admin");
  const refGVenta      = sumGroupRef("gastos-venta");
  const refGFin        = sumGroupRef("gastos-fin");
  const refImp         = sumGroupRef("impuestos");
  const refUtilBruta   = refIngresos.map((v, i) => v - refCostos[i]);
  const refUtilOper    = refUtilBruta.map((v, i) => v - refGAdmin[i] - refGVenta[i]);
  const refUtilNeta    = refUtilOper.map((v, i) => v + refIngresosNo[i] - refGFin[i] - refImp[i]);
  const ingresos = sumGroup("ingresos");
  const ingresosNo = sumGroup("ingresos-no");
  const costos = sumGroup("costos");
  const gAdmin = sumGroup("gastos-admin");
  const gVenta = sumGroup("gastos-venta");
  const gFin = sumGroup("gastos-fin");
  const imp = sumGroup("impuestos");
  const utilidadBruta = ingresos.map((v, i) => v - costos[i]);
  const utilidadOper  = utilidadBruta.map((v, i) => v - gAdmin[i] - gVenta[i]);
  const utilidadNeta  = utilidadOper.map((v, i) => v + ingresosNo[i] - gFin[i] - imp[i]);

  // Filter accounts by search and hideZeros
  const visible = (a) => {
    if (search) {
      const s = search.toLowerCase();
      if (!(a.name.toLowerCase().includes(s) || a.code.includes(s))) return false;
    }
    if (hideZeros && sum12(values[a.code]) === 0 && sum12(ACTUALS_2026[a.code]) === 0) return false;
    return true;
  };

  // Render rows by section
  const renderSection = (sectionDef) => {
    if (sectionDef.isCalc) {
      let arr, refArr, accent;
      if (sectionDef.id === "Utilidad bruta")             { arr = utilidadBruta; refArr = refUtilBruta; accent = "neutral"; }
      else if (sectionDef.id === "Utilidad operacional")  { arr = utilidadOper;  refArr = refUtilOper;  accent = "bold"; }
      else                                                { arr = utilidadNeta;  refArr = refUtilNeta;  accent = "bold"; }
      return [<SectionSubtotalRow key={sectionDef.id} label={"= " + sectionDef.id} values={arr} refValues={refArr} accent={accent} showRef={showRef} annualMode={annualMode} />];
    }
    const accountsInSection = ACCOUNTS.filter(a => a.group === sectionDef.group);
    const visibleAccounts = accountsInSection.filter(visible);
    if (visibleAccounts.length === 0 && hideZeros) return [];
    const rows = [];
    rows.push(<SectionHeaderRow key={"h-" + sectionDef.id} section={sectionDef} showRef={showRef} annualMode={annualMode} />);
    visibleAccounts.forEach(a => {
      rows.push(<AccountRow key={a.code}
        account={a}
        values={values[a.code]}
        refValues={ACTUALS_2026[a.code]}
        aiRow={aiCells[a.code]}
        hasError={!!rowErrors[a.code]}
        showRef={showRef}
        annualMode={annualMode}
        refYearLabel={refYear}
        selected={!!selected[a.code]}
        dim={false}
        onToggleSelect={() => setSelected(prev => ({ ...prev, [a.code]: !prev[a.code] }))}
        onEditCell={editCell}
        onDistributeAnnual={distributeAnnual}
        onReplicateMonth={replicateMonthValue}
        onApplyFormula={(c) => setFormulaModal({ code: c })}
        annualMismatch={annualMismatches[a.code] ? true : false}
        desiredTotal={annualOverrides[a.code] || null}
        onCommitAnnual={(v) => commitAnnual(a.code, v)}
        onPaste={handlePaste}
      />);
    });
    // Section subtotal
    const sectionSum = sumGroup(sectionDef.group);
    const refArr = sumGroupRef(sectionDef.group);
    rows.push(<SectionSubtotalRow
      key={"st-" + sectionDef.id}
      label={sectionDef.totalLabel}
      values={sectionSum} refValues={refArr} showRef={showRef} annualMode={annualMode} accent="neutral" />);
    return rows;
  };

  // Annual view: reduce 12 months to 1
  const annualMode = view === "anual";

  return (
    <div style={editorStyles.page}>
      {/* Title bar */}
      <div style={editorStyles.header}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--sm-primary-700)",
            letterSpacing: ".04em", textTransform: "uppercase" }}>
            Informes › Presupuestos
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {editingName ? (
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
                style={{
                  fontSize: 24, fontWeight: 700, color: "var(--slate-900)",
                  border: "1px solid var(--sm-primary-600)", borderRadius: 6,
                  padding: "2px 8px", outline: 0, width: 480, maxWidth: "100%",
                  fontFamily: "var(--font-sans)",
                }} />
            ) : (
              <h1 onClick={() => setEditingName(true)}
                style={{
                  margin: 0, fontSize: 24, lineHeight: "32px", fontWeight: 700,
                  color: "var(--slate-900)", cursor: "text",
                  borderRadius: 6, padding: "2px 8px",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--slate-100)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                {name}
                <i className="ti ti-pencil" style={{ fontSize: 14, marginLeft: 8, color: "var(--slate-400)" }} />
              </h1>
            )}
            {(() => {
              const fuenteLabels = {
                ai:          { icon: "sparkles",  label: "Calculado con IA",         color: "var(--sm-primary-700)", bg: "var(--sm-primary-50,rgba(48,171,169,.08))" },
                actual_2025: { icon: "history",    label: "Datos 2025",               color: "var(--slate-700)",       bg: "var(--slate-100)" },
                promedio:    { icon: "chart-bar",  label: "Promedio últimos 3 años",  color: "var(--sm-indigo-700,#4338ca)", bg: "rgba(99,102,241,.08)" },
                cero:        { icon: "circle",     label: "Empezado en ceros",        color: "var(--slate-500)",       bg: "var(--slate-100)" },
              };
              const fl = fuenteLabels[fuente] || { icon: "database", label: fuente, color: "var(--slate-500)", bg: "var(--slate-100)" };
              return (
                <span style={{
                  fontSize: 12, color: fl.color, fontWeight: 500,
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 999, background: fl.bg,
                  border: `1px solid ${fl.color}22`,
                }}>
                  <i className={`ti ti-${fl.icon}`} style={{ fontSize: 13 }} />
                  {fl.label}
                </span>
              );
            })()}
            <span title={`Última vez guardado a las ${savedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`} style={{
              fontSize: 12, color: dirty ? "var(--slate-500)" : "var(--green-500)", fontWeight: 500,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <i className={`ti ti-${dirty ? "circle-dot" : "cloud-check"}`} style={{ fontSize: 14 }} />
              {dirty ? "Cambios sin guardar" : `Guardado ${savedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Button variant="outline" icon="trending-up" onClick={() => setForecastOpen(true)}>Forecast</Button>
          <ImportExportMenu onImport={() => setImportModal(true)} onExport={() => setExportModal(true)} />
          <Button variant="outline" icon="sparkles" onClick={() => setAiOpen(true)}>Asistente IA</Button>
          <button onClick={handleSave} disabled={saving || !dirty} title="Guardar (⌘/Ctrl+S)" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, border: 0,
            background: dirty ? "var(--sm-primary-600)" : "var(--slate-200)",
            color: dirty ? "#fff" : "var(--slate-500)",
            fontSize: 13, fontWeight: 600,
            cursor: dirty && !saving ? "pointer" : "default",
            boxShadow: dirty ? "0 1px 2px rgba(48,171,169,.25)" : "none",
            transition: "background .12s",
          }}>
            <i className={`ti ti-${saving ? "loader-2" : "device-floppy"}`} style={{
              fontSize: 14,
              animation: saving ? "alegra-spin .8s linear infinite" : "none",
            }} />
            {saving ? "Guardando…" : dirty ? "Guardar" : "Guardado"}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={editorStyles.toolbarPrimary}>
        <div style={editorStyles.searchBox}>
          <i className="ti ti-search" style={{ fontSize: 16 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cuenta por nombre o número…"
            style={{ flex: 1, border: 0, outline: 0, background: "transparent",
              fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--slate-900)" }} />
          {search ? (
            <button onClick={() => setSearch("")} style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--slate-500)" }}>
              <i className="ti ti-x" style={{ fontSize: 14 }} />
            </button>
          ) : null}
        </div>

        <div style={{ width: 1, height: 24, background: "var(--slate-200)" }} />

        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <ViewDropdown value={view} onChange={setView} />
        </div>

        <button onClick={() => setShowRef(s => !s)} style={editorStyles.pill(showRef)}>
          <i className={`ti ti-${showRef ? "eye" : "eye-off"}`} style={{ fontSize: 14 }} />
          Ver ejecución real
        </button>

        <button onClick={() => setHideZeros(z => !z)} style={editorStyles.pill(hideZeros)}>
          <i className="ti ti-arrow-down-square" style={{ fontSize: 14 }} />
          Ocultar líneas en cero
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={undo} disabled={!canUndo}
          title="Deshacer última acción (⌘/Ctrl+Z)"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "6px 12px", borderRadius: 8,
            border: "1px solid var(--slate-300)",
            background: canUndo ? "#fff" : "var(--slate-100)",
            color: canUndo ? "var(--slate-700)" : "var(--slate-400)",
            fontSize: 13, fontWeight: 500,
            cursor: canUndo ? "pointer" : "default",
            transition: "all .12s",
          }}>
          <i className="ti ti-arrow-back-up" style={{ fontSize: 15 }} />
          Deshacer
        </button>

        <div style={{ fontSize: 12, color: "var(--slate-500)" }}>
          {ACCOUNTS.length} cuentas · {Object.values(annualMismatches).filter(Boolean).length > 0 ?
            <span style={{ color: "var(--rose-600)", fontWeight: 600 }}>
              {Object.values(annualMismatches).filter(Boolean).length} con error en total
            </span> : "Sin errores"}
        </div>
      </div>

      {/* Batch action bar (shown when rows are selected) */}
      {selectedCodes.length > 0 ? (
        <div style={{
          background: "var(--slate-900)", color: "#fff",
          borderRadius: 12, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: "var(--shadow-lg)",
        }}>
          <i className="ti ti-checks" style={{ fontSize: 18, color: "var(--sm-primary-300)" }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {selectedCodes.length} cuenta{selectedCodes.length === 1 ? "" : "s"} seleccionada{selectedCodes.length === 1 ? "" : "s"}
          </span>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,.2)" }} />
          <BatchBtn icon="wand"        onClick={() => setFormulaModal({ batch: true })}>Aplicar fórmula</BatchBtn>
          <BatchBtn icon="trash"       onClick={clearReferenceForSelected}>Borrar valores</BatchBtn>
          <BatchBtn icon="copy"        onClick={recopyReferenceForSelected}>Volver a copiar referencia</BatchBtn>
          <div style={{ flex: 1 }} />
          <button onClick={() => setSelected({})} style={{
            background: "transparent", border: 0, color: "rgba(255,255,255,.7)",
            fontSize: 12, cursor: "pointer", padding: "6px 10px", borderRadius: 6,
          }}>Cancelar</button>
        </div>
      ) : null}

      {/* TABLE */}
      <div style={gridStyles.tableWrap}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "max-content", minWidth: "100%" }}>
          <thead>
            <tr>
              <th rowSpan={showRef || annualMode ? 2 : 1} style={{
                position: "sticky", left: 0, top: 0, zIndex: 5,
                background: "#fff", borderBottom: "1px solid var(--slate-300)",
                borderRight: "1px solid var(--slate-200)",
                width: CW_LABEL, minWidth: CW_LABEL,
                padding: "10px 12px", textAlign: "left",
                fontSize: 11, fontWeight: 600, color: "var(--slate-600)",
                textTransform: "uppercase", letterSpacing: ".04em",
                verticalAlign: "middle",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  Cuenta
                </div>
              </th>
              {(annualMode ? ["Año"] : MONTHS).map((m, i) => (
                <th key={m + i} colSpan={annualMode ? (showRef ? 3 : 1) : (showRef ? 2 : 1)} style={{
                  position: "sticky", top: 0, zIndex: 4,
                  background: "#fff",
                  borderBottom: "1px solid var(--slate-200)",
                  borderRight: "1px solid var(--slate-200)",
                  width: annualMode ? (showRef ? 450 : 160) : (showRef ? CW_REF + CW_MONTH : CW_MONTH),
                  minWidth: annualMode ? (showRef ? 450 : 160) : (showRef ? CW_REF + CW_MONTH : CW_MONTH),
                  padding: "10px 12px", textAlign: "center",
                  fontSize: 11, fontWeight: 600, color: "var(--slate-600)",
                  textTransform: "uppercase", letterSpacing: ".04em",
                }}>{annualMode ? String(anio) : `${m} ${anio}`}</th>
              ))}
              {!annualMode ? (
                <th rowSpan={1} colSpan={showRef && !annualMode ? 2 : 1} style={{
                  position: "sticky", top: 0, right: 0, zIndex: 6,
                  background: "var(--slate-100)",
                  borderBottom: showRef && !annualMode ? "1px solid var(--slate-200)" : "1px solid var(--slate-300)",
                  width: showRef && !annualMode ? (CW_TOTAL + CW_TOTAL_REF) : CW_TOTAL,
                  minWidth: showRef && !annualMode ? (CW_TOTAL + CW_TOTAL_REF) : CW_TOTAL,
                  padding: "10px 12px", textAlign: "center",
                  fontSize: 11, fontWeight: 700, color: "var(--slate-700)",
                  textTransform: "uppercase", letterSpacing: ".04em",
                }}>Total año</th>
              ) : null}
            </tr>
            {showRef || annualMode ? (
              <tr>
                {annualMode ? (
                  <React.Fragment key="annual-sub">
                    <th style={{ position: "sticky", top: 35, zIndex: 4, background: "#fff", borderBottom: "1px solid var(--slate-300)", borderRight: "1px solid var(--slate-200)", width: 160, minWidth: 160, padding: "6px 10px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "var(--sm-primary-800)", textTransform: "uppercase", letterSpacing: ".04em" }}>Presupuesto</th>
                    {showRef ? <th style={{ position: "sticky", top: 35, zIndex: 4, background: "var(--slate-50)", borderBottom: "1px solid var(--slate-300)", borderRight: "1px solid var(--slate-200)", width: 150, minWidth: 150, padding: "6px 10px", textAlign: "right", fontSize: 10, fontWeight: 600, color: "var(--slate-600)", textTransform: "uppercase", letterSpacing: ".04em" }}>Ejecutado</th> : null}
                    {showRef ? <th style={{ position: "sticky", top: 35, zIndex: 4, background: "#fff", borderBottom: "1px solid var(--slate-300)", borderRight: "1px solid var(--slate-200)", width: 140, minWidth: 140, padding: "6px 10px", textAlign: "right", fontSize: 10, fontWeight: 600, color: "var(--slate-700)", textTransform: "uppercase", letterSpacing: ".04em" }}>Diferencia</th> : null}
                  </React.Fragment>
                ) : MONTHS.map((m, i) => (
                  <React.Fragment key={"sub-" + m}>
                    <th style={{
                      position: "sticky", top: 35, zIndex: 4,
                      background: "#fff",
                      borderBottom: "1px solid var(--slate-300)",
                      borderRight: "1px dashed var(--slate-200)",
                      width: CW_MONTH, minWidth: CW_MONTH,
                      padding: "6px 12px", textAlign: "right",
                      fontSize: 10, fontWeight: 700, color: "var(--sm-primary-800)",
                      textTransform: "uppercase", letterSpacing: ".04em",
                    }}>Presupuesto</th>
                    <th style={{
                      position: "sticky", top: 35, zIndex: 4,
                      background: "var(--slate-50)",
                      borderBottom: "1px solid var(--slate-300)",
                      borderRight: i === 11 ? "1px solid var(--slate-200)" : "1px solid var(--slate-100)",
                      width: CW_REF, minWidth: CW_REF,
                      padding: "6px 8px", textAlign: "right",
                      fontSize: 10, fontWeight: 600, color: "var(--slate-500)",
                      textTransform: "uppercase", letterSpacing: ".04em",
                    }}>Ejecutado</th>
                  </React.Fragment>
                ))}
                {!annualMode ? (
                  <>
                    <th style={{
                      position: "sticky", top: 35, right: showRef ? CW_TOTAL_REF : 0, zIndex: 6,
                      background: "#E2E8F0",
                      borderBottom: "1px solid var(--slate-300)",
                      borderLeft: "1px solid var(--slate-200)",
                      width: CW_TOTAL, minWidth: CW_TOTAL,
                      padding: "6px 12px", textAlign: "right",
                      fontSize: 10, fontWeight: 700, color: "var(--slate-800)",
                      textTransform: "uppercase", letterSpacing: ".04em",
                    }}>Presupuesto</th>
                    {showRef ? (
                      <th style={{
                        position: "sticky", top: 35, right: 0, zIndex: 6,
                        background: "#F1F5F9",
                        borderBottom: "1px solid var(--slate-300)",
                        width: CW_TOTAL_REF, minWidth: CW_TOTAL_REF,
                        padding: "6px 10px", textAlign: "right",
                        fontSize: 10, fontWeight: 600, color: "var(--slate-500)",
                        textTransform: "uppercase", letterSpacing: ".04em",
                      }}>Ejecutado</th>
                    ) : null}
                  </>
                ) : null}
              </tr>
            ) : null}
          </thead>
          <tbody>
            {SECTIONS.flatMap(renderSection)}
          </tbody>
        </table>
      </div>

      {/* AI Panel */}
      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} focusedAccount={focusedAccount}
        onRecalculate={(params) => {
          setToast({ msg: `Recalculando con crecimiento ${(params.growth*100).toFixed(1)}% + inflación ${(params.inflation*100).toFixed(1)}%…`, tone: "success" });
          const next = {};
          ACCOUNTS.forEach(a => {
            const ref = ACTUALS[refYear][a.code] || Array(12).fill(0);
            const f = 1 + params.growth + params.inflation * 0.6;
            next[a.code] = ref.map(v => Math.round(v * f / 1000) * 1000);
          });
          setValues(next);
          const nextAi = {};
          ACCOUNTS.forEach(a => { nextAi[a.code] = Array(12).fill(true); });
          setAiCells(nextAi);
        }} />

      {/* Modals */}
      {formulaModal ? (
        <FormulaModal
          batch={!!formulaModal.batch}
          accountCode={formulaModal.code}
          inflation={INFLATION_2026 * 100}
          onCancel={() => setFormulaModal(null)}
          onApply={(f) => formulaModal.batch ? applyFormulaBatch(f) : applyFormulaToRow(formulaModal.code, f)} />
      ) : null}
      {importModal ? <ImportModal onClose={() => setImportModal(false)} /> : null}
      {exportModal ? <ExportModal onClose={() => setExportModal(false)} /> : null}
      {forecastOpen ? <ForecastModal onClose={() => setForecastOpen(false)} budget={values} /> : null}

      {/* Toast */}
      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
};

const PeriodPicker = ({ open, setOpen, anio, setAnio, periodicidad, setPeriodicidad }) => {
  const years = [anio - 2, anio - 1, anio, anio + 1, anio + 2];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} title="Cambiar periodo del presupuesto" style={{
        fontSize: 12, color: "var(--slate-700)", fontWeight: 500,
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 10px", borderRadius: 999,
        background: open ? "var(--sm-primary-100)" : "var(--slate-100)",
        border: 0, cursor: "pointer",
      }}>
        <i className="ti ti-calendar" style={{ fontSize: 13 }} />
        Periodo {anio} · {periodicidad === "mensual" ? "Mensual" : "Anual"}
        <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{ fontSize: 12, color: "var(--slate-400)" }} />
      </button>
      {open ? (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 21,
            background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 12,
            boxShadow: "var(--shadow-lg)", padding: 14, minWidth: 280,
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em",
              textTransform: "uppercase", color: "var(--slate-500)" }}>Año del presupuesto</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {years.map(y => (
                <button key={y} onClick={() => setAnio(y)} style={{
                  padding: "6px 12px", borderRadius: 8,
                  border: `1px solid ${y === anio ? "var(--sm-primary-600)" : "var(--slate-200)"}`,
                  background: y === anio ? "var(--sm-primary-100)" : "#fff",
                  color: y === anio ? "var(--sm-primary-900)" : "var(--slate-700)",
                  fontSize: 13, fontWeight: y === anio ? 600 : 500, cursor: "pointer",
                  fontVariantNumeric: "tabular-nums",
                }}>{y}</button>
              ))}
            </div>

            <div style={{ height: 1, background: "var(--slate-100)" }} />

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em",
              textTransform: "uppercase", color: "var(--slate-500)" }}>Periodicidad</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { id: "mensual",     label: "Mensual",     sub: "12 columnas" },
                { id: "trimestral",  label: "Trimestral",  sub: "4 columnas" },
                { id: "anual",       label: "Anual",       sub: "1 columna" },
              ].map(p => (
                <button key={p.id} onClick={() => setPeriodicidad(p.id)} style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10,
                  border: `1px solid ${p.id === periodicidad ? "var(--sm-primary-600)" : "var(--slate-200)"}`,
                  background: p.id === periodicidad ? "var(--sm-primary-100)" : "#fff",
                  color: p.id === periodicidad ? "var(--sm-primary-900)" : "var(--slate-700)",
                  cursor: "pointer", textAlign: "left",
                  display: "flex", flexDirection: "column", gap: 2,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</span>
                  <span style={{ fontSize: 10, color: "var(--slate-500)" }}>{p.sub}</span>
                </button>
              ))}
            </div>

            <div style={{
              padding: "8px 10px", borderRadius: 8, background: "var(--slate-50)",
              fontSize: 11, color: "var(--slate-600)", lineHeight: 1.5,
              display: "flex", gap: 6, alignItems: "flex-start",
            }}>
              <i className="ti ti-info-circle" style={{ fontSize: 13, color: "var(--slate-400)", marginTop: 2 }} />
              <span>Cambiar el año o la periodicidad no borra los valores ingresados; solo cambia cómo se muestran y agrupan.</span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setOpen(false)} style={{
                padding: "6px 14px", borderRadius: 8, border: 0,
                background: "var(--sm-primary-600)", color: "#fff",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Aplicar</button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

const ImportExportMenu = ({ onImport, onExport }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} title="Importar o exportar el presupuesto" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 8,
        border: "1px solid var(--slate-300)", background: "#fff",
        color: "var(--slate-700)", fontSize: 13, fontWeight: 500, cursor: "pointer",
      }}>
        <i className="ti ti-arrows-up-down" style={{ fontSize: 14 }} />
        Importar / Exportar
        <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{ fontSize: 13, color: "var(--slate-400)" }} />
      </button>
      {open ? (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 11,
            background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 12,
            boxShadow: "var(--shadow-lg)", padding: 4, minWidth: 260,
          }}>
            <button onClick={() => { setOpen(false); onImport(); }} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", borderRadius: 8, border: 0,
              background: "transparent", color: "var(--slate-800)",
              fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left",
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--slate-100)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <i className="ti ti-upload" style={{ fontSize: 16, color: "var(--sm-primary-700)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span>Importar desde Excel</span>
                <span style={{ fontSize: 10, color: "var(--slate-500)", fontWeight: 500 }}>Sube tu plantilla con los valores</span>
              </div>
            </button>
            <button onClick={() => { setOpen(false); onExport(); }} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", borderRadius: 8, border: 0,
              background: "transparent", color: "var(--slate-800)",
              fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left",
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--slate-100)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <i className="ti ti-download" style={{ fontSize: 16, color: "var(--sm-primary-700)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span>Exportar a Excel o PDF</span>
                <span style={{ fontSize: 10, color: "var(--slate-500)", fontWeight: 500 }}>Descarga el presupuesto actual</span>
              </div>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
};

const ViewDropdown = ({ value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const labels = {
    mensual: { ic: "calendar-month", t: "Mensual",     sub: "12 columnas" },
    anual:   { ic: "calendar",       t: "Anual",       sub: "1 columna" },
  };
  const cur = labels[value];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 999, fontSize: 13, fontWeight: 500,
        border: "1px solid var(--slate-300)", background: "#fff",
        color: "var(--slate-700)", cursor: "pointer",
      }}>
        <i className={`ti ti-${cur.ic}`} style={{ fontSize: 14, color: "var(--slate-500)" }} />
        Vista: {cur.t}
        <i className="ti ti-chevron-down" style={{ fontSize: 14, color: "var(--slate-400)" }} />
      </button>
      {open ? (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 11,
            background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 12,
            boxShadow: "var(--shadow-lg)", padding: 4, minWidth: 220,
          }}>
            {Object.entries(labels).map(([k, l]) => (
              <button key={k} onClick={() => { onChange(k); setOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "8px 12px", borderRadius: 8, border: 0,
                background: value === k ? "var(--sm-primary-100)" : "transparent",
                color: value === k ? "var(--sm-primary-900)" : "var(--slate-700)",
                fontSize: 13, fontWeight: value === k ? 600 : 500, cursor: "pointer",
                textAlign: "left",
              }}>
                <i className={`ti ti-${l.ic}`} style={{ fontSize: 14 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span>{l.t}</span>
                  <span style={{ fontSize: 10, color: "var(--slate-500)", fontWeight: 500 }}>{l.sub}</span>
                </div>
                {value === k ? <i className="ti ti-check" style={{ fontSize: 14, marginLeft: "auto" }} /> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

const Segmented = ({ options, value, onChange }) => (
  <div style={{ display: "inline-flex", padding: 3, borderRadius: 8, background: "var(--slate-100)" }}>
    {options.map(o => (
      <button key={o.id} onClick={() => onChange(o.id)} style={{
        padding: "6px 14px", borderRadius: 6, border: 0,
        background: value === o.id ? "#fff" : "transparent",
        color: value === o.id ? "var(--slate-900)" : "var(--slate-600)",
        fontSize: 13, fontWeight: value === o.id ? 600 : 500, cursor: "pointer",
        boxShadow: value === o.id ? "0 1px 2px rgba(15,23,42,.08)" : "none",
      }}>{o.label}</button>
    ))}
  </div>
);

const FuenteDropdown = ({ value, onChange }) => {
  const [open, setOpen] = React.useState(false);
  const labels = {
    ai: { ic: "sparkles", t: "Calculado con IA" },
    actual_2025: { ic: "history", t: "Real 2025" },
    actual_2024: { ic: "history", t: "Real 2024" },
    promedio: { ic: "chart-bar", t: "Promedio 3 años" },
    cero: { ic: "circle", t: "Vacío" },
  };
  const cur = labels[value];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 999, fontSize: 13, fontWeight: 500,
        border: "1px solid var(--slate-300)", background: "#fff",
        color: "var(--slate-700)", cursor: "pointer",
      }}>
        <i className={`ti ti-${cur.ic}`} style={{ fontSize: 14, color: value === "ai" ? "var(--sm-primary-700)" : "var(--slate-500)" }} />
        Referencia: {cur.t}
        <i className="ti ti-chevron-down" style={{ fontSize: 14, color: "var(--slate-400)" }} />
      </button>
      {open ? (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 11,
            background: "#fff", border: "1px solid var(--slate-200)", borderRadius: 12,
            boxShadow: "var(--shadow-lg)", padding: 4, minWidth: 240,
          }}>
            {Object.entries(labels).map(([k, l]) => (
              <button key={k} onClick={() => { onChange(k); setOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "8px 12px", borderRadius: 8, border: 0,
                background: value === k ? "var(--sm-primary-100)" : "transparent",
                color: value === k ? "var(--sm-primary-900)" : "var(--slate-700)",
                fontSize: 13, fontWeight: value === k ? 600 : 500, cursor: "pointer",
                textAlign: "left",
              }}>
                <i className={`ti ti-${l.ic}`} style={{ fontSize: 14 }} />
                {l.t}
                {value === k ? <i className="ti ti-check" style={{ fontSize: 14, marginLeft: "auto" }} /> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

const BatchBtn = ({ icon, onClick, children }) => (
  <button onClick={onClick} style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 12px", borderRadius: 8, border: 0,
    background: "rgba(255,255,255,.08)", color: "#fff",
    fontSize: 13, fontWeight: 500, cursor: "pointer",
  }}>
    <i className={`ti ti-${icon}`} style={{ fontSize: 14 }} />
    {children}
  </button>
);

const Toast = ({ toast, onDismiss }) => {
  React.useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const colors = {
    success: { bg: "#0F172A", icon: "circle-check", iconColor: "var(--green-500)" },
    warning: { bg: "#0F172A", icon: "alert-triangle", iconColor: "#FFDA2C" },
    danger:  { bg: "#0F172A", icon: "circle-x", iconColor: "var(--rose-600)" },
  }[toast.tone] || { bg: "#0F172A", icon: "info-circle", iconColor: "#fff" };
  return (
    <div style={{
      position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)",
      background: colors.bg, color: "#fff",
      padding: "10px 14px", borderRadius: 10,
      display: "flex", alignItems: "center", gap: 10,
      fontSize: 13, fontWeight: 500, zIndex: 60,
      boxShadow: "var(--shadow-xl)",
    }}>
      <i className={`ti ti-${colors.icon}`} style={{ fontSize: 18, color: colors.iconColor }} />
      {toast.msg}
      <button onClick={onDismiss} style={{
        marginLeft: 8, padding: 2, border: 0, background: "transparent",
        color: "rgba(255,255,255,.5)", cursor: "pointer",
      }}><i className="ti ti-x" style={{ fontSize: 14 }} /></button>
    </div>
  );
};

Object.assign(window, { BudgetEditor });
