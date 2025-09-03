#!/usr/bin/env node
// InSpec Report (auxiliar): extrae top endpoints y cookies desde los JSON crudos.
// Uso: node scripts/inspec-report.js reports/spectral-analysis-*.json > inspec/summary.md

const fs = require("fs");
const path = require("path");

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Uso: node scripts/inspec-report.js reports/spectral-analysis-*.json");
  process.exit(1);
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}
function countMap(arr) {
  const m = new Map();
  for (const k of arr) m.set(k, (m.get(k)||0)+1);
  return [...m.entries()].sort((a,b)=>b[1]-a[1]);
}
function toHostPath(u) {
  try {
    const URL0 = new URL(u);
    const base = URL0.pathname.split("?")[0];
    return `${URL0.hostname}${base}`;
  } catch { return null; }
}

const allSummaries = [];

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const j = safeJson(raw) || {};
  const url = j.url || (file.includes("spectral-analysis-") ? file.split("spectral-analysis-")[1].split("-20")[0] : path.basename(file));

  // 1) Top endpoints (por host + path, sin query)
  const urls = (raw.match(/https?:\/\/[^\s"'\\)]+/g) || []).map(toHostPath).filter(Boolean);
  const topEndpoints = countMap(urls).slice(0, 10);

  // 2) Top cookies (por nombre)
  // Buscamos nombres cerca de "set-cookie" y también patrón general clave=
  const setCookieBlobs = (raw.match(/set-cookie[^:"]*":\s*"[^"]+/gi) || [])
    .join("\n") + "\n" + (raw.match(/set-cookie:[^\n]+/gi) || []).join("\n");
  const cookieNameRegex = /(^|[\s;,])([A-Za-z0-9_\-]{1,64})=/g;
  const names = [];
  for (const blob of [setCookieBlobs, raw]) {
    let m; let c = 0;
    while ((m = cookieNameRegex.exec(blob)) && c < 50000) { // cap defensivo
      c++; const name = m[2];
      if (name && !/^(path|expires|max-age|domain|secure|httponly|samesite)$/i.test(name))
        names.push(name);
    }
  }
  const topCookies = countMap(names).slice(0, 10);

  // 3) Métricas básicas (si existen)
  const metrics = j.metrics || j || {};
  const pick = k => (metrics[k] && typeof metrics[k]==="object") ? metrics[k] : {};
  const basic = {
    baseline: pick("baseline"),
    reject: pick("reject"),
    accept_pre: pick("accept_pre"),
    accept: pick("accept"),
  };

  allSummaries.push({ url, topEndpoints, topCookies, basic });
}

// SALIDA: consola (markdown) + JSON auxiliar
let md = `# InSpec Report (auxiliar)\n\n`;
md += `| URL | Top Endpoints (top 5) | Top Cookies (top 5) |\n|---|---|---|\n`;
for (const s of allSummaries) {
  const eps = s.topEndpoints.slice(0,5).map(([e,c])=>`${e} (${c})`).join("<br>");
  const cks = s.topCookies.slice(0,5).map(([n,c])=>`${n} (${c})`).join("<br>");
  md += `| ${s.url} | ${eps || "—"} | ${cks || "—"} |\n`;
}
console.log(md);

// guardar JSON para usos posteriores
fs.writeFileSync("inspec/summary.json", JSON.stringify(allSummaries, null, 2));
