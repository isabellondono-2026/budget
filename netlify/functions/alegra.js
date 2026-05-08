/**
 * Netlify Function: alegra.js
 * ─────────────────────────────────────────────────────
 * Proxy entre el navegador y api.alegra.com.
 * El token lo envía el navegador en el header X-Alegra-Auth.
 * Nunca va directo a Alegra desde el navegador (evita CORS).
 */

const https = require("https");

exports.handler = async function (event) {
  const CORS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Alegra-Auth",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  // Token enviado por el navegador en header X-Alegra-Auth (Basic base64)
  const authHeader = (event.headers || {})["x-alegra-auth"] || "";
  if (!authHeader) {
    return {
      statusCode: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Falta el header X-Alegra-Auth" }),
    };
  }

  // Construir el path hacia api.alegra.com
  const params = event.queryStringParameters || {};
  const apiPath = params.path || "/company";
  const qs = Object.entries(params)
    .filter(([k]) => k !== "path")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  const fullPath = `/api/v1${apiPath}${qs ? "?" + qs : ""}`;

  const data = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.alegra.com",
        path: fullPath,
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on("error", reject);
    req.end();
  });

  return {
    statusCode: data.status,
    headers: { ...CORS, "Content-Type": "application/json" },
    body: data.body,
  };
};
