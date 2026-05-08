/**
 * alegra-data.js
 * ─────────────────────────────────────────────────────────────────
 * Recibe el token del usuario (ingresado en el wizard),
 * lo envía al proxy de Netlify Functions en cada petición
 * via header X-Alegra-Auth — nunca llega directo a Alegra.
 *
 * Uso:
 *   window.loadAlegraData(email, token) → Promise<void>
 *
 * Después de resolver expone:
 *   window.ALEGRA_COMPANY, ALEGRA_ACCOUNTS,
 *   ALEGRA_ACTUALS, ALEGRA_ACTUALS_PREV
 */
(function () {
  const PROXY = "/api/alegra";

  // Construye el header Basic y lo guarda en sesión
  function buildHeader(email, token) {
    return "Basic " + btoa(`${email}:${token}`);
  }

  async function get(authHeader, apiPath, params = {}) {
    const qs = new URLSearchParams({ path: apiPath, ...params }).toString();
    const res = await fetch(`${PROXY}?${qs}`, {
      headers: { "X-Alegra-Auth": authHeader },
    });
    if (!res.ok) throw new Error(`Proxy error ${res.status}: ${apiPath}`);
    return res.json();
  }

  function mapGroup(cat) {
    const t = (cat.type || "").toLowerCase();
    const n = (cat.name || "").toLowerCase();
    if (t.includes("income") && !t.includes("other"))                                    return "ingresos";
    if (t.includes("other-income") || (n.includes("no operacional") && t.includes("income"))) return "ingresos-no";
    if (t.includes("cost") || n.includes("costo"))                                       return "costos";
    if (t.includes("expense") && (n.includes("admin") || n.includes("administrac")))     return "gastos-admin";
    if (t.includes("expense") && (n.includes("venta") || n.includes("comerc")))          return "gastos-venta";
    if (t.includes("other-expense") || n.includes("no oper") || n.includes("financiero")) return "gastos-fin";
    if (n.includes("impuesto") || n.includes("renta") || t.includes("tax"))              return "impuestos";
    if (t.includes("expense"))                                                            return "gastos-admin";
    return null;
  }

  async function fetchActuals(authHeader, year) {
    const result = {};
    (window.ALEGRA_ACCOUNTS || []).forEach((a) => { result[a.code] = Array(12).fill(0); });

    try {
      const report = await get(authHeader, "/accounting/profit-and-loss", {
        "date-start": `${year}-01-01`,
        "date-end":   `${year}-12-31`,
      }).catch(() => null);

      if (report?.categories) {
        (function parse(cats) {
          cats.forEach((c) => {
            const code = String(c.id || "");
            if (result[code] && c.months) {
              c.months.forEach((m, i) => {
                if (i < 12) result[code][i] = Math.abs(parseFloat(m.amount || 0));
              });
            }
            if (c.children) parse(c.children);
          });
        })(report.categories);
        return result;
      }
    } catch { /* fallback a journals */ }

    try {
      const journals = await get(authHeader, "/journals", {
        "date-start": `${year}-01-01`,
        "date-end":   `${year}-12-31`,
        limit: 500,
      });
      const entries = Array.isArray(journals) ? journals : (journals.data || []);
      entries.forEach((j) => {
        (j.lines || j.entries || []).forEach((line) => {
          const cId = String(line.accountId || line.account?.id || "");
          if (!result[cId]) return;
          const d = new Date(j.date || j.createdAt || "");
          const m = d.getMonth();
          if (d.getFullYear() === year && m >= 0 && m < 12) {
            result[cId][m] += Math.abs(parseFloat(line.debit || line.credit || line.amount || 0));
          }
        });
      });
    } catch (e) {
      console.warn(`Journals ${year}:`, e.message);
    }
    return result;
  }

  // ── Función principal — llamada desde el wizard ──────────────────────────
  window.loadAlegraData = async function (email, token) {
    const authHeader = buildHeader(email, token);
    // Guardarlo en sesión para reusarlo si el prototipo recarga datos
    window._alegraAuthHeader = authHeader;

    // 1. Empresa
    const company = await get(authHeader, "/company");
    window.ALEGRA_COMPANY = {
      name:     company.name     || "Mi empresa",
      currency: company.currency || "COP",
    };

    // 2. Catálogo de cuentas
    const catsRaw  = await get(authHeader, "/categories", { limit: 200 });
    const cats     = Array.isArray(catsRaw) ? catsRaw : (catsRaw.data || []);
    window.ALEGRA_ACCOUNTS = cats
      .filter((c) => mapGroup(c))
      .map((c) => ({
        code:   String(c.id),
        name:   c.name || `Cuenta ${c.id}`,
        group:  mapGroup(c),
        parent: c.parentId ? String(c.parentId) : null,
      }));

    // 3. Ejecutado — año actual y anterior
    const yearCur  = new Date().getFullYear();
    const [cur, prev] = await Promise.all([
      fetchActuals(authHeader, yearCur),
      fetchActuals(authHeader, yearCur - 1),
    ]);
    window.ALEGRA_ACTUALS      = cur;
    window.ALEGRA_ACTUALS_PREV = prev;

    console.log(`✅ Alegra · ${window.ALEGRA_COMPANY.name} · ${window.ALEGRA_ACCOUNTS.length} cuentas`);
  };

  // También exponer una función de prueba rápida para el wizard
  window.testAlegraConnection = async function (email, token) {
    const authHeader = buildHeader(email, token);
    const res = await fetch(`${PROXY}?path=/company`, {
      headers: { "X-Alegra-Auth": authHeader },
    });
    if (!res.ok) throw new Error(res.status === 401 ? "Credenciales incorrectas" : `Error ${res.status}`);
    return res.json(); // devuelve { name, ... }
  };
})();
