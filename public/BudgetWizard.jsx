// Wizard inicial — 2 pasos para crear el presupuesto.

const wizardStyles = {
  shell: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,.6)",
    display: "grid", placeItems: "center", zIndex: 50,
  },
  card: {
    width: 840, maxWidth: "calc(100vw - 32px)",
    maxHeight: "calc(100vh - 48px)",
    background: "#fff", borderRadius: 16,
    boxShadow: "var(--shadow-xl)", overflow: "hidden",
    display: "flex", flexDirection: "column",
  },
  rail: {
    width: 220, padding: "28px 20px",
    background: "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
    borderRight: "1px solid var(--slate-200)",
    display: "flex", flexDirection: "column", gap: 20,
  },
  body: { flex: 1, padding: "28px 36px", overflow: "auto", minWidth: 0 },
  footer: {
    padding: "14px 20px", borderTop: "1px solid var(--slate-200)",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    background: "#fff",
  },
};

const STEPS = [
  { id: "conexion", label: "Conexión Alegra",       icon: "plug-connected" },
  { id: "config",  label: "Configuración",          icon: "adjustments-horizontal" },
  { id: "datos",   label: "Prellenado",             icon: "sparkles" },
];

// ── Step 0: Conexión con cuenta Alegra ────────────────────────────────────────
const Step0 = ({ data, set }) => {
  const [testing,    setTesting]    = React.useState(false);
  const [testResult, setTestResult] = React.useState(null); // null | "ok" | "error"
  const [errorMsg,   setErrorMsg]   = React.useState("");

  const testConnection = async () => {
    if (!data.alegraEmail || !data.alegraToken) return;
    setTesting(true);
    setTestResult(null);
    setErrorMsg("");
    try {
      // Llama al proxy de Netlify (evita CORS)
      const company = await window.testAlegraConnection(data.alegraEmail, data.alegraToken);
      set({ companyName: company.name || "Mi empresa", alegraConnected: true });
      setTestResult("ok");
    } catch (err) {
      setTestResult("error");
      setErrorMsg(err.message || "No se pudo conectar");
    } finally {
      setTesting(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14,
    border: "1px solid var(--slate-300)", outline: "none",
    fontFamily: "var(--font-sans)", color: "var(--slate-900)",
    background: "#fff", boxSizing: "border-box",
    transition: "border-color 120ms ease",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "var(--slate-900)" }}>
          Conecta tu cuenta de Alegra
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--slate-500)", lineHeight: 1.6 }}>
          Ingresa tus credenciales para cargar el catálogo de cuentas y los movimientos reales.
          Tus datos no se almacenan — solo se usan durante esta sesión.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-700)" }}>
          Correo electrónico de tu cuenta Alegra
        </label>
        <input
          type="email"
          placeholder="usuario@empresa.com"
          value={data.alegraEmail || ""}
          onChange={(e) => { set({ alegraEmail: e.target.value }); setTestResult(null); }}
          style={inputStyle} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-700)" }}>
          Token de API
        </label>
        <input
          type="password"
          placeholder="••••••••••••••••••••••"
          value={data.alegraToken || ""}
          onChange={(e) => { set({ alegraToken: e.target.value }); setTestResult(null); }}
          style={inputStyle} />
        <span style={{ fontSize: 12, color: "var(--slate-400)" }}>
          Encuéntralo en{" "}
          <a href="https://app.alegra.com/configuration/profile/user" target="_blank" rel="noopener"
            style={{ color: "var(--sm-primary-700)", textDecoration: "underline" }}>
            Alegra → Configuración → Mi perfil → Token de API
          </a>
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={testConnection}
          disabled={testing || !data.alegraEmail || !data.alegraToken}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: "1px solid var(--slate-300)", background: "#fff",
            color: "var(--slate-700)", cursor: "pointer",
            opacity: (!data.alegraEmail || !data.alegraToken) ? 0.5 : 1,
          }}>
          {testing
            ? <><i className="ti ti-loader-2" style={{ fontSize: 15, animation: "spin .8s linear infinite" }} /> Verificando…</>
            : <><i className="ti ti-plug-connected" style={{ fontSize: 15 }} /> Probar conexión</>}
        </button>

        {testResult === "ok" && (
          <div style={{ display: "flex", alignItems: "center", gap: 7,
            color: "var(--green-600,#16a34a)", fontSize: 13, fontWeight: 600 }}>
            <i className="ti ti-circle-check-filled" style={{ fontSize: 18 }} />
            {data.companyName ? `Conectado · ${data.companyName}` : "Conexión exitosa"}
          </div>
        )}
        {testResult === "error" && (
          <div style={{ display: "flex", alignItems: "center", gap: 7,
            color: "var(--rose-600,#e11d48)", fontSize: 13, fontWeight: 500 }}>
            <i className="ti ti-circle-x-filled" style={{ fontSize: 18 }} />
            {errorMsg}
          </div>
        )}
      </div>

      <div style={{
        display: "flex", gap: 10, padding: "12px 14px", borderRadius: 10,
        background: "var(--slate-50)", border: "1px solid var(--slate-200)",
      }}>
        <i className="ti ti-shield-lock" style={{ fontSize: 18, color: "var(--slate-400)", flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12, color: "var(--slate-500)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--slate-700)" }}>Privacidad:</strong>{" "}
          tus credenciales se envían a un servidor intermediario seguro que las usa para
          consultar tu cuenta de Alegra. No se guardan en ningún lado y desaparecen al cerrar la pestaña.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

const StepRail = ({ step }) => (
  <div style={wizardStyles.rail}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <img src="assets/logos/alegra-mark.svg" style={{ height: 22 }} alt="" />
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em",
        textTransform: "uppercase", color: "var(--sm-primary-700)" }}>
        Nuevo presupuesto
      </div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
            borderRadius: 10,
            background: active ? "#fff" : "transparent",
            boxShadow: active ? "var(--shadow-sm)" : "none",
            border: active ? "1px solid var(--slate-200)" : "1px solid transparent",
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 999, flexShrink: 0,
              display: "grid", placeItems: "center",
              background: done ? "var(--sm-primary-600)" : active ? "#fff" : "var(--slate-200)",
              color: done ? "#fff" : active ? "var(--sm-primary-700)" : "var(--slate-500)",
              border: active ? "2px solid var(--sm-primary-600)" : "0",
              fontSize: 12, fontWeight: 600,
            }}>
              {done ? <i className="ti ti-check" style={{ fontSize: 14 }} /> : (i + 1)}
            </div>
            <div>
              <div style={{
                fontSize: 13, fontWeight: active ? 600 : 500,
                color: active ? "var(--slate-900)" : done ? "var(--slate-700)" : "var(--slate-500)",
              }}>{s.label}</div>
              <div style={{ fontSize: 10, color: "var(--slate-400)" }}>Paso {i + 1} de 2</div>
            </div>
          </div>
        );
      })}
    </div>
    <div style={{ flex: 1 }} />
    <div style={{
      padding: "10px 12px", background: "rgba(48,171,169,.08)",
      borderRadius: 10, fontSize: 11, color: "var(--slate-700)", lineHeight: 1.5,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3,
        fontWeight: 600, color: "var(--sm-primary-800)" }}>
        <i className="ti ti-lock" style={{ fontSize: 13 }} />
        Parámetros fijos
      </div>
      Una vez creado, el periodo y el método de prellenado no se pueden cambiar desde el editor.
    </div>
  </div>
);

// ----- Choice card -----
const ChoiceCard = ({ icon, title, description, badge, selected, onSelect, disabled, children }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <div onClick={disabled ? undefined : onSelect}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", padding: 14, borderRadius: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        background: selected ? "rgba(48,171,169,.06)" : "#fff",
        border: `1px solid ${selected ? "var(--sm-primary-600)" : hover && !disabled ? "var(--slate-300)" : "var(--slate-200)"}`,
        boxShadow: selected ? "0 0 0 3px rgba(48,171,169,.15)" : "none",
        opacity: disabled ? 0.5 : 1,
        transition: "all 120ms ease",
      }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: selected ? "var(--sm-primary-600)" : "var(--sm-primary-100)",
          color: selected ? "#fff" : "var(--sm-primary-700)",
          display: "grid", placeItems: "center",
        }}>
          <i className={`ti ti-${icon}`} style={{ fontSize: 18 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--slate-900)" }}>{title}</span>
            {badge ? (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 999,
                background: "var(--slate-100)", color: "var(--slate-600)",
                textTransform: "uppercase", letterSpacing: ".04em",
              }}>{badge}</span>
            ) : null}
          </div>
          <div style={{ fontSize: 12, color: "var(--slate-600)", lineHeight: 1.5 }}>{description}</div>
          {children}
        </div>
        <div style={{
          width: 16, height: 16, borderRadius: 999, flexShrink: 0, marginTop: 2,
          border: `2px solid ${selected ? "var(--sm-primary-600)" : "var(--slate-300)"}`,
          background: selected ? "var(--sm-primary-600)" : "#fff",
          display: "grid", placeItems: "center",
        }}>
          {selected ? <i className="ti ti-check" style={{ fontSize: 10, color: "#fff" }} /> : null}
        </div>
      </div>
    </div>
  );
};

// ----- Step 1: Configuración (tipo + año + nombre) -----
const Step1 = ({ data, set }) => {
  const currentYear = new Date().getFullYear(); // 2026
  const nextYear    = currentYear + 1;           // 2027
  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "var(--slate-900)" }}>
        Configura tu presupuesto
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--slate-500)", lineHeight: 1.5 }}>
        Elige el tipo, el año fiscal y dale un nombre. El periodo no se puede cambiar luego.
      </p>

      {/* Tipo */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--slate-500)",
        textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Tipo de presupuesto</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <ChoiceCard icon="report-money" title="Estado de Resultados (P&G)"
          description="Proyecta ingresos, costos y utilidad del periodo."
          selected={data.tipoBudget === "ER"} onSelect={() => set({ tipoBudget: "ER" })} />
        <ChoiceCard icon="building-bank" title="Estado de Situación Financiera"
          description="Presupuesta activos, pasivos y patrimonio."
          selected={data.tipoBudget === "ESF"} onSelect={() => set({ tipoBudget: "ESF" })} />
      </div>

      {/* Año + Periodicidad en una fila */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--slate-500)",
            textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Año fiscal</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[currentYear, nextYear].map(y => (
              <button key={y} onClick={() => set({ anio: y, nombre: `Presupuesto ${y} — La Esquina SAS` })}
                style={{
                  flex: 1, padding: "10px", borderRadius: 8, fontSize: 15, fontWeight: 600,
                  border: `1px solid ${data.anio === y ? "var(--sm-primary-600)" : "var(--slate-300)"}`,
                  background: data.anio === y ? "var(--sm-primary-100)" : "#fff",
                  color: data.anio === y ? "var(--sm-primary-900)" : "var(--slate-700)",
                  cursor: "pointer", transition: "all .12s",
                }}>{y}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--slate-500)",
            textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Periodicidad</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { id: "mensual", label: "Mensual" },
              { id: "anual",   label: "Anual" },
            ].map(p => (
              <button key={p.id} onClick={() => set({ periodicidad: p.id })}
                style={{
                  flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  border: `1px solid ${data.periodicidad === p.id ? "var(--sm-primary-600)" : "var(--slate-300)"}`,
                  background: data.periodicidad === p.id ? "var(--sm-primary-100)" : "#fff",
                  color: data.periodicidad === p.id ? "var(--sm-primary-900)" : "var(--slate-700)",
                  cursor: "pointer", transition: "all .12s",
                }}>{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Nombre */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--slate-500)",
          textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Nombre</div>
        <TextField value={data.nombre} onChange={(v) => set({ nombre: v })}
          placeholder={`Presupuesto ${data.anio} — La Esquina SAS`} />
      </div>

      {/* Excel shortcut */}
      <div style={{ padding: 12, borderRadius: 10, border: "1px dashed var(--slate-300)",
        background: "var(--slate-50)", display: "flex", alignItems: "center", gap: 10 }}>
        <i className="ti ti-file-spreadsheet" style={{ fontSize: 22, color: "var(--green-500)" }} />
        <div style={{ flex: 1, fontSize: 12, color: "var(--slate-600)" }}>
          <b style={{ color: "var(--slate-900)" }}>¿Ya tienes los datos en Excel?</b><br />
          Descarga la plantilla, complétala y súbela en el paso siguiente.
        </div>
        <Button variant="outline" size="sm" icon="download">Plantilla</Button>
      </div>
    </div>
  );
};

// ----- Step 2: Prellenado -----
const Step2 = ({ data, set }) => {
  const prevYear = data.anio - 1;
  const opts = [
    { id: "ai", icon: "sparkles", title: "Calcular con IA", ai: true,
      description: "Combinamos tu histórico, estacionalidad e inflación local para sugerir los valores. Tú revisas y ajustas." },
    { id: "actual_prev", icon: "history", title: `Copiar de ${prevYear}`,
      description: `Usa los valores reales del año pasado como punto de partida.` },
    { id: "promedio", icon: "chart-bar", title: "Promedio últimos 3 años",
      description: `Promediamos ${prevYear - 2}, ${prevYear - 1} y ${prevYear} para suavizar años atípicos.` },
    { id: "cero", icon: "circle", title: "Empezar en ceros",
      description: "Todas las cuentas inician en cero. Completa los valores manualmente o importa desde Excel." },
  ];

  const fuenteKey = data.fuente === "actual_prev" ? "actual_2025" : data.fuente;

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "var(--slate-900)" }}>
        ¿Con qué datos quieres comenzar?
      </h2>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--slate-500)", lineHeight: 1.5 }}>
        Esta selección es permanente. Para cambiarla necesitarás crear un nuevo presupuesto.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {opts.map(o => (
          <ChoiceCard key={o.id} icon={o.icon}
            title={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {o.title}
                {o.ai ? (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
                    background: "linear-gradient(90deg, #30ABA9 0%, #837FF3 100%)",
                    color: "#fff", display: "inline-flex", alignItems: "center", gap: 3,
                  }}>
                    <i className="ti ti-sparkles" style={{ fontSize: 10 }} /> IA
                  </span>
                ) : null}
              </span>
            }
            description={o.description}
            selected={data.fuente === o.id}
            onSelect={() => set({ fuente: o.id })}>
            {o.id === "ai" && data.fuente === "ai" ? (
              <div style={{ marginTop: 10, padding: 10, borderRadius: 8,
                background: "#fff", border: "1px solid var(--slate-200)",
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                {[
                  ["chart-line",    "Tendencia histórica"],
                  ["calendar-event","Estacionalidad mensual"],
                  ["trending-up",   "Inflación Colombia 7,2%"],
                  ["categories",    "Tipo de cuenta"],
                ].map(([ic, t]) => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 5,
                    fontSize: 11, color: "var(--slate-700)" }}>
                    <i className={`ti ti-${ic}`} style={{ fontSize: 12, color: "var(--sm-primary-600)" }} />
                    {t}
                  </div>
                ))}
              </div>
            ) : null}
            {o.id === "cero" && data.fuente === "cero" ? (
              <div style={{ marginTop: 10 }}>
                <Button variant="subtle" size="sm" icon="upload">Importar desde Excel</Button>
              </div>
            ) : null}
          </ChoiceCard>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: 12, borderRadius: 10,
        background: "rgba(48,171,169,.06)", border: "1px solid var(--sm-primary-200)",
        display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--slate-700)" }}>
        <i className="ti ti-info-circle" style={{ fontSize: 16, color: "var(--sm-primary-700)" }} />
        <span>
          El presupuesto de <b>{data.anio}</b> se comparará automáticamente con la ejecución real
          al activar <b>"Ver ejecución real"</b> en el editor.
        </span>
      </div>
    </div>
  );
};

// ----- Wizard root (2 pasos) -----
const BudgetWizard = ({ onCreate, onCancel }) => {
  const currentYear = new Date().getFullYear();
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({
    tipoBudget: "ER",
    formato: "consolidado",
    anio: currentYear,
    periodicidad: "mensual",
    fuente: "ai",
    nombre: `Presupuesto ${currentYear} — La Esquina SAS`,
    importarExcel: false,
    alegraEmail: "",
    alegraToken: "",
    alegraBasic: null,
    companyName: "",
  });
  const set = (patch) => setData(d => ({ ...d, ...patch }));

  const TOTAL = 3;

  const [loadingData, setLoadingData] = React.useState(false);

  const next = async () => {
    if (step === 0) {
      if (!data.alegraConnected) {
        alert("Por favor prueba la conexión antes de continuar.");
        return;
      }
      // Cargar cuentas y movimientos reales en background mientras avanza
      setLoadingData(true);
      try {
        await window.loadAlegraData(data.alegraEmail, data.alegraToken);
      } catch (e) {
        console.warn("loadAlegraData falló:", e.message);
      } finally {
        setLoadingData(false);
      }
      setStep(1);
      return;
    }
    if (step < TOTAL - 1) {
      setStep(step + 1);
    } else {
      onCreate({ ...data, fuente: data.fuente === "actual_prev" ? "actual_2025" : data.fuente });
    }
  };
  const back = () => step > 0 ? setStep(step - 1) : onCancel();

  const StepCmp = [Step0, Step1, Step2][step];

  return (
    <div style={wizardStyles.shell}>
      <div style={wizardStyles.card}>
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <StepRail step={step} />
          <div style={wizardStyles.body}>
            <StepCmp data={data} set={set} />
          </div>
        </div>
        <div style={wizardStyles.footer}>
          <Button variant="ghost" onClick={back}>
            {step === 0 ? "Cancelar" : "Atrás"}
          </Button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--slate-400)" }}>Paso {step + 1} de {TOTAL}</span>
            <Button
              variant="filled"
              icon={loadingData ? null : (step === TOTAL - 1 ? "check" : null)}
              onClick={next}
              disabled={(step === 0 && !data.alegraConnected) || loadingData}>
              {loadingData
                ? "Cargando datos…"
                : step === TOTAL - 1 ? "Crear presupuesto" : "Continuar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { BudgetWizard });
