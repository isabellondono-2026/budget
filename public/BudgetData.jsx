// Budget data model — accounts, actuals, AI predictions, helpers.

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Chart of accounts for an Estado de Resultados (P&L), Spanish, COP.
// Group: ingresos / costos / gastos-op / gastos-fin / impuestos
const ACCOUNTS = [
  // INGRESOS
  { code: "4135", name: "Ventas de mercancía",        group: "ingresos",     section: "Ingresos operacionales", parent: null },
  { code: "4135.01", name: "Ventas mostrador",        group: "ingresos",     section: "Ingresos operacionales", parent: "4135" },
  { code: "4135.02", name: "Ventas mayorista",        group: "ingresos",     section: "Ingresos operacionales", parent: "4135" },
  { code: "4140", name: "Servicios de consultoría",   group: "ingresos",     section: "Ingresos operacionales", parent: null },
  { code: "4170", name: "Otros ingresos operacionales", group: "ingresos",   section: "Ingresos operacionales", parent: null },
  { code: "4250", name: "Rendimientos financieros",   group: "ingresos-no",  section: "Ingresos no operacionales", parent: null },

  // COSTOS
  { code: "6135", name: "Costo de mercancía vendida", group: "costos",       section: "Costos de venta",        parent: null },
  { code: "6140", name: "Costo de servicios",         group: "costos",       section: "Costos de venta",        parent: null },

  // GASTOS OPERACIONALES — administración
  { code: "5105", name: "Gastos de personal",         group: "gastos-admin", section: "Gastos de administración", parent: null },
  { code: "5105.01", name: "Sueldos y salarios",      group: "gastos-admin", section: "Gastos de administración", parent: "5105" },
  { code: "5105.02", name: "Aportes parafiscales",    group: "gastos-admin", section: "Gastos de administración", parent: "5105" },
  { code: "5105.03", name: "Prestaciones sociales",   group: "gastos-admin", section: "Gastos de administración", parent: "5105" },
  { code: "5110", name: "Honorarios",                 group: "gastos-admin", section: "Gastos de administración", parent: null },
  { code: "5115", name: "Impuestos",                  group: "gastos-admin", section: "Gastos de administración", parent: null },
  { code: "5120", name: "Arrendamientos",             group: "gastos-admin", section: "Gastos de administración", parent: null },
  { code: "5130", name: "Seguros",                    group: "gastos-admin", section: "Gastos de administración", parent: null },
  { code: "5135", name: "Servicios públicos",         group: "gastos-admin", section: "Gastos de administración", parent: null },
  { code: "5140", name: "Gastos legales",             group: "gastos-admin", section: "Gastos de administración", parent: null },
  { code: "5145", name: "Mantenimiento y reparaciones", group: "gastos-admin", section: "Gastos de administración", parent: null },
  { code: "5155", name: "Gastos de viaje",            group: "gastos-admin", section: "Gastos de administración", parent: null },
  { code: "5160", name: "Depreciaciones",             group: "gastos-admin", section: "Gastos de administración", parent: null },

  // GASTOS DE VENTAS
  { code: "5205", name: "Personal de ventas",         group: "gastos-venta", section: "Gastos de ventas",       parent: null },
  { code: "5210", name: "Comisiones de venta",        group: "gastos-venta", section: "Gastos de ventas",       parent: null },
  { code: "5235", name: "Publicidad y mercadeo",      group: "gastos-venta", section: "Gastos de ventas",       parent: null },
  { code: "5240", name: "Transporte y fletes",        group: "gastos-venta", section: "Gastos de ventas",       parent: null },

  // GASTOS NO OPERACIONALES
  { code: "5305", name: "Gastos financieros",         group: "gastos-fin",   section: "Gastos no operacionales", parent: null },
  { code: "5315", name: "Gastos extraordinarios",     group: "gastos-fin",   section: "Gastos no operacionales", parent: null },

  // IMPUESTOS
  { code: "5405", name: "Impuesto de renta",          group: "impuestos",    section: "Impuestos",              parent: null },
];

// Deterministic pseudo-random per account+month so refresh shows the same data.
function seeded(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5; let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seasonal multipliers: ventas pico nov-dic; aguinaldo en gastos personal en jun y dic.
const SEASON = {
  ingresos:     [0.85, 0.78, 0.92, 0.95, 1.02, 0.98, 1.05, 1.00, 1.04, 1.10, 1.18, 1.43],
  "ingresos-no":[1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00],
  costos:       [0.86, 0.80, 0.93, 0.95, 1.00, 0.98, 1.04, 1.00, 1.04, 1.10, 1.18, 1.40],
  "gastos-admin":[1.00, 1.00, 1.00, 1.00, 1.00, 1.18, 1.00, 1.00, 1.00, 1.00, 1.00, 1.45],
  "gastos-venta":[0.92, 0.90, 0.95, 0.98, 1.00, 1.00, 1.05, 1.00, 1.04, 1.10, 1.20, 1.30],
  "gastos-fin": [1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00],
  impuestos:    [0,    0,    0,    1.0,  0,    0,    0,    0,    0,    0,    0,    0  ], // pago en abril
};

// Base annual amounts for 2025 (the most recent actuals year).
// Revenues ~$724M, Costs ~$280M, Expenses ~$200M → Operating profit ~$244M (~34% margin)
const BASE_2025 = {
  "4135":    520_000_000,
  "4135.01": 320_000_000,
  "4135.02": 200_000_000,
  "4140":    180_000_000,
  "4170":    24_000_000,
  "4250":    8_400_000,
  // Costos — 38% of revenues
  "6135":    198_000_000,
  "6140":    52_000_000,
  // Gastos admin — leaner
  "5105":    96_000_000,
  "5105.01": 66_000_000,
  "5105.02": 14_000_000,
  "5105.03": 16_000_000,
  "5110":    18_000_000,
  "5115":    8_400_000,
  "5120":    24_000_000,
  "5130":    4_800_000,
  "5135":    9_600_000,
  "5140":    2_400_000,
  "5145":    3_600_000,
  "5155":    6_000_000,
  "5160":    14_400_000,
  // Gastos ventas
  "5205":    38_000_000,
  "5210":    18_000_000,
  "5235":    22_000_000,
  "5240":    9_600_000,
  // No operacionales
  "5305":    6_000_000,
  "5315":    2_000_000,
  // Impuestos
  "5405":    28_000_000,
};

// Build a 12-month series for an account+year, deterministic and with seasonality.
function buildMonthly(code, year) {
  const acc = ACCOUNTS.find(a => a.code === code);
  if (!acc) return Array(12).fill(0);
  const yearFactor = year === 2023 ? 0.78 : year === 2024 ? 0.88 : 1.0; // growth
  const annual = (BASE_2025[code] || 0) * yearFactor;
  const season = SEASON[acc.group] || Array(12).fill(1);
  const seasonSum = season.reduce((s, x) => s + x, 0) || 12;
  const rand = seeded(code + ":" + year);
  // distribute by season, then add small noise
  const arr = season.map((s) => {
    const base = (annual * s) / seasonSum;
    const noise = 1 + (rand() - 0.5) * 0.08; // ±4%
    return Math.round(base * noise / 1000) * 1000;
  });
  return arr;
}

// Pre-build actuals for 2023, 2024, 2025.
const ACTUALS = {};
[2023, 2024, 2025].forEach(y => {
  ACTUALS[y] = {};
  ACCOUNTS.forEach(a => { ACTUALS[y][a.code] = buildMonthly(a.code, y); });
});

// ACTUALS 2026: real executed Jan–Apr (YTD), zero for future months.
// Accounts in ZERO_ACCOUNTS_2026 have no execution yet → demo "Ocultar líneas en cero".
const ZERO_ACCOUNTS_2026 = new Set(["5140", "5145", "5155", "5315"]);
const ACTUALS_2026 = {};
ACCOUNTS.forEach(a => {
  if (ZERO_ACCOUNTS_2026.has(a.code)) {
    ACTUALS_2026[a.code] = Array(12).fill(0);
  } else {
    const base2025 = buildMonthly(a.code, 2025);
    const rand = seeded(a.code + ":2026exec");
    const growth = 1.08 + (rand() - 0.5) * 0.06; // ~8% crecimiento ± 3%
    const arr = Array(12).fill(0);
    for (let m = 0; m < 4; m++) {
      const noise = 1 + (seeded(a.code + ":2026m" + m)() - 0.5) * 0.10;
      arr[m] = Math.round(base2025[m] * growth * noise / 1000) * 1000;
    }
    ACTUALS_2026[a.code] = arr;
  }
});

// AI prediction for 2026: applies inflation + growth trend + seasonality from 2025.
// Returns { values: [12], rationale: string, confidence: 'high'|'med'|'low' }.
const INFLATION_2026 = 0.072; // Colombia ~7.2%

function aiPredict(code) {
  const acc = ACCOUNTS.find(a => a.code === code);
  if (!acc) return { values: Array(12).fill(0), rationale: "Sin datos.", confidence: "low" };
  const a23 = ACTUALS[2023][code];
  const a24 = ACTUALS[2024][code];
  const a25 = ACTUALS[2025][code];
  const sum23 = a23.reduce((s,x)=>s+x,0);
  const sum24 = a24.reduce((s,x)=>s+x,0);
  const sum25 = a25.reduce((s,x)=>s+x,0);
  const g1 = sum23 ? (sum24 / sum23 - 1) : 0;
  const g2 = sum24 ? (sum25 / sum24 - 1) : 0;
  // weighted growth (more weight to recent year), capped sensibly.
  const trend = Math.max(-0.15, Math.min(0.25, 0.4 * g1 + 0.6 * g2));
  // Add inflation on top for income/cost-bearing accounts.
  const totalUplift = 1 + trend + INFLATION_2026 * 0.6;
  // Use 2025 monthly shape as seasonality base.
  const values = a25.map((v) => Math.round(v * totalUplift / 1000) * 1000);
  // confidence depends on stability of growth
  const stability = Math.abs(g2 - g1);
  const confidence = stability < 0.04 ? "high" : stability < 0.10 ? "med" : "low";
  const trendPct = Math.round(trend * 1000) / 10;
  const rationale = [
    `Tendencia ${trendPct >= 0 ? "+" : ""}${trendPct}% (promedio ponderado 2024-2025).`,
    `Inflación Colombia 2026 ≈ 7,2% aplicada parcial a este tipo de cuenta.`,
    `Estacionalidad heredada de 2025 (pico ${MONTHS[a25.indexOf(Math.max(...a25))]}).`,
  ].join(" ");
  return { values, rationale, confidence };
}

const AI_2026 = {};
ACCOUNTS.forEach(a => { AI_2026[a.code] = aiPredict(a.code); });

// Helpers
const sum12 = (arr) => arr.reduce((s, x) => s + (x || 0), 0);
const COP = (n) => {
  if (n == null || n === "" || isNaN(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "$ " + abs.toLocaleString("es-CO");
};
const fmtAbbr = (n) => {
  if (n == null || isNaN(n) || n === 0) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "$" + (abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1) + "M";
  if (abs >= 1_000)     return sign + "$" + Math.round(abs / 1_000) + "k";
  return sign + "$" + abs;
};

// SECTIONS list (in display order)
const SECTIONS = [
  { id: "Ingresos operacionales",   group: "ingresos",     sign: +1, isHeader: true,  totalLabel: "Total ingresos operacionales" },
  { id: "Ingresos no operacionales",group: "ingresos-no",  sign: +1, isHeader: true,  totalLabel: "Total ingresos no oper." },
  { id: "Costos de venta",          group: "costos",       sign: -1, isHeader: true,  totalLabel: "Total costos" },
  { id: "Utilidad bruta",           group: "calc-bruta",   sign: +1, isHeader: false, isCalc: true },
  { id: "Gastos de administración", group: "gastos-admin", sign: -1, isHeader: true,  totalLabel: "Total gastos administración" },
  { id: "Gastos de ventas",         group: "gastos-venta", sign: -1, isHeader: true,  totalLabel: "Total gastos de ventas" },
  { id: "Utilidad operacional",     group: "calc-oper",    sign: +1, isHeader: false, isCalc: true },
  { id: "Gastos no operacionales",  group: "gastos-fin",   sign: -1, isHeader: true,  totalLabel: "Total gastos no oper." },
  { id: "Impuestos",                group: "impuestos",    sign: -1, isHeader: true,  totalLabel: "Total impuestos" },
  { id: "Utilidad neta",            group: "calc-neta",    sign: +1, isHeader: false, isCalc: true },
];

Object.assign(window, {
  MONTHS, ACCOUNTS, ACTUALS, ACTUALS_2026, ZERO_ACCOUNTS_2026, AI_2026, SECTIONS, INFLATION_2026,
  sum12, COP, fmtAbbr, aiPredict,
});
