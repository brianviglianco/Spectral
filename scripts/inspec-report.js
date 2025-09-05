#!/usr/bin/env node
/**
 * InSpec Report v0.2 (auxiliar con fases)
 *
 * Lee 1..N reportes JSON (professionalAnalysis.js), de-duplica por dominio
 * (escoge el más reciente por timestamp en el filename), y genera:
 *  - Tabla por dominio (Top Endpoints, Top Cookies).
 *  - Bloques <details> por FASE (baseline/reject_pre/reject/accept_pre/accept).
 *  - JSON técnico inspec/summary.json.
 *
 * Soporta múltiples esquemas:
 *  - Campos tipo: phases.*, stages.*, baseline/reject/accept(_pre), network*, hits*, topTrackingUrls*, requests*...
 *  - Headers: responseHeaders['set-cookie'], requestHeaders['cookie'].
 *  - Evidencias: stages.*.networkEvidence.setCookies[].setCookie, stages.*.cookies, stages.*.networkEvidence.cookieBreakdown
 */

const fs = require('fs');
const path = require('path');

const ARG = process.argv[2] || 'reports/spectral-analysis-*.json';
const OUTPUT_JSON = 'inspec/summary.json';

// ---------- Utils ----------
function globSync(pattern) {
  const dir = path.dirname(pattern);
  const base = path.basename(pattern);
  const regex = new RegExp('^' + base.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
  return (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
    .filter(f => regex.test(f))
    .map(f => path.join(dir, f));
}

function safeReadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function extractDomainFromURL(u) {
  try { return new URL(u).hostname; } catch { return null; }
}

function extractHostPath(u) {
  try {
    const url = new URL(u);
    return `${url.hostname}${url.pathname}`;
  } catch { return null; }
}

function countMapAdd(map, key, inc = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + inc);
}

function sortTop(map, topN = 5) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topN);
}

function isLikelyCookiePair(str) {
  return typeof str === 'string' && str.includes('=') && !str.includes('\n');
}

function parseCookieHeaderLine(line) {
  const names = [];
  if (typeof line !== 'string') return names;
  line.split(';').forEach(kv => {
    const [name] = kv.trim().split('=');
    if (name) names.push(name.trim());
  });
  return names;
}

function parseSetCookieHeaderLine(line) {
  if (!isLikelyCookiePair(line)) return null;
  const first = line.split(';')[0];
  const [name] = first.split('=');
  return name ? name.trim() : null;
}

function pullFromNode(node, acc) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const it of node) pullFromNode(it, acc);
    return;
  }
  if (typeof node !== 'object') return;

  for (const [k, v] of Object.entries(node)) {
    // URLs "obvias"
    if (k.match(/url|src|href|endpoint|location/i)) {
      if (typeof v === 'string') acc.urls.push(v);
      else if (Array.isArray(v)) v.forEach(x => typeof x === 'string' && acc.urls.push(x));
    }

    // Colecciones de network/requests/hits
    if (k.match(/requests?|hits|network|toptracking|resources?/i) && Array.isArray(v)) {
      v.forEach(entry => {
        if (!entry) return;
        if (typeof entry === 'string') {
          acc.urls.push(entry);
        } else if (typeof entry === 'object') {
          if (entry.url) acc.urls.push(entry.url);
          if (entry.request && typeof entry.request.url === 'string') acc.urls.push(entry.request.url);
          if (entry.response && typeof entry.response.url === 'string') acc.urls.push(entry.response.url);

          // Cookie (request)
          const rh = entry.requestHeaders || entry.request_headers || entry.request_headers_raw;
          if (rh) {
            const cookieLine = rh['cookie'] || rh['Cookie'];
            if (cookieLine) parseCookieHeaderLine(cookieLine).forEach(n => acc.cookieNames.push(n));
          }

          // Set-Cookie (response)
          const sh = entry.responseHeaders || entry.response_headers || entry.response_headers_raw;
          if (sh) {
            const setc = sh['set-cookie'] || sh['Set-Cookie'] || sh['Set-cookie'];
            if (Array.isArray(setc)) {
              setc.forEach(line => {
                const n = parseSetCookieHeaderLine(line);
                if (n) acc.cookieNames.push(n);
              });
            } else if (typeof setc === 'string') {
              setc.split(/\r?\n/).forEach(line => {
                const n = parseSetCookieHeaderLine(line.trim());
                if (n) acc.cookieNames.push(n);
              });
            }
          }
        }
      });
    }

    // Campos crudos Set-Cookie / Cookie en cualquier objeto
    if (k.toLowerCase() === 'set-cookie') {
      if (Array.isArray(v)) {
        v.forEach(line => {
          const n = parseSetCookieHeaderLine(line);
          if (n) acc.cookieNames.push(n);
        });
      } else if (typeof v === 'string') {
        v.split(/\r?\n/).forEach(line => {
          const n = parseSetCookieHeaderLine(line.trim());
          if (n) acc.cookieNames.push(n);
        });
      }
    }
    if (k.toLowerCase() === 'cookie' && typeof v === 'string') {
      parseCookieHeaderLine(v).forEach(n => acc.cookieNames.push(n));
    }
  }

  // Recorrer profundamente
  for (const val of Object.values(node)) pullFromNode(val, acc);
}

function pullAll(obj) {
  const acc = { urls: [], cookieNames: [] };
  pullFromNode(obj, acc);
  return acc;
}

// Paths adicionales específicos de SPECTRAL (stages.*)
function pullCookiesFromStages(stageObj, acc) {
  if (!stageObj || typeof stageObj !== 'object') return;

  const ne = stageObj.networkEvidence || stageObj.network_evidence;
  if (ne) {
    // setCookies[].setCookie
    if (Array.isArray(ne.setCookies)) {
      ne.setCookies.forEach(s => {
        const line = s && s.setCookie;
        if (typeof line === 'string') {
          const n = parseSetCookieHeaderLine(line);
          if (n) acc.cookieNames.push(n);
        }
      });
    }
    // cookieBreakdown (puede venir como {name: count} o array)
    const cb = ne.cookieBreakdown || ne.cookie_breakdown;
    if (cb && typeof cb === 'object') {
      if (Array.isArray(cb)) {
        cb.forEach(x => {
          if (x && typeof x.name === 'string') countMapAdd(acc.cookieCount, x.name, x.count || 1);
        });
      } else {
        for (const [name, cnt] of Object.entries(cb)) {
          countMapAdd(acc.cookieCount, name, Number(cnt) || 1);
        }
      }
    }
  }

  // stages.*.cookies (array de strings o objetos)
  if (Array.isArray(stageObj.cookies)) {
    stageObj.cookies.forEach(c => {
      if (typeof c === 'string') {
        const n = parseSetCookieHeaderLine(c) || (c.split('=')[0] || '').trim();
        if (n) acc.cookieNames.push(n);
      } else if (c && typeof c === 'object') {
        if (typeof c.name === 'string') acc.cookieNames.push(c.name);
        if (typeof c.cookie === 'string') {
          const n = parseSetCookieHeaderLine(c.cookie) || (c.cookie.split('=')[0] || '').trim();
          if (n) acc.cookieNames.push(n);
        }
      }
    });
  }
}

function fileTimestampFromName(p) {
  // ...-YYYY-MM-DDTHH-MM-SS-sssZ.json
  const base = path.basename(p);
  const m = base.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/);
  if (!m) return 0;
  const re = /T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/;
  const iso2 = m[0].replace(re, (_s, H, M, S, ms) => `T${H}:${M}:${S}.${ms}Z`);
  const t = Date.parse(iso2);
  return isNaN(t) ? 0 : t;
}

function domainKeyFromReport(json, filename) {
  if (json && json.url) {
    const h = extractDomainFromURL(json.url);
    if (h) return h;
  }
  const base = path.basename(filename);
  const m = base.match(/spectral-analysis-(.+?)-\d{4}-\d{2}-\d{2}T/);
  if (m) return m[1];
  return base;
}

// map de índice → nombre de fase
const PHASE_BY_INDEX = ['baseline', 'reject_pre', 'reject', 'accept_pre', 'accept'];

function extractStageBlocks(json) {
  // Devuelve array de { phaseLabel, block }
  const blocks = [];

  // Preferir `phases` si existe
  if (json && typeof json.phases === 'object') {
    for (const [k, v] of Object.entries(json.phases)) {
      blocks.push({ phaseLabel: k, block: v });
    }
    return blocks;
  }

  // Si no, probar `stages`
  if (json && Array.isArray(json.stages)) {
    json.stages.forEach((stg, idx) => {
      const label = PHASE_BY_INDEX[idx] || `stage${idx}`;
      blocks.push({ phaseLabel: label, block: stg });
    });
    return blocks;
  }

  // Si viniera otra forma (p.ej. baseline/reject/...), recogerlas
  const fallbackKeys = ['baseline', 'reject_pre', 'reject', 'accept_pre', 'accept'];
  let any = false;
  fallbackKeys.forEach(k => {
    if (json && json[k]) { blocks.push({ phaseLabel: k, block: json[k] }); any = true; }
  });
  if (any) return blocks;

  // Último recurso: todo el JSON como una única "fase"
  return [{ phaseLabel: 'all', block: json || {} }];
}

// ---------- Carga + de-dup por dominio ----------
const files = globSync(ARG).sort();
if (files.length === 0) {
  console.error(`No se encontraron archivos con patrón: ${ARG}`);
  process.exit(1);
}

const byDomain = new Map();
for (const f of files) {
  const j = safeReadJSON(f);
  if (!j) continue;
  const dk = domainKeyFromReport(j, f);
  const ts = fileTimestampFromName(f);
  const prev = byDomain.get(dk);
  if (!prev || ts >= prev.ts) byDomain.set(dk, { file: f, ts, json: j });
}

// ---------- Extracción por dominio ----------
const results = [];

for (const [domainKey, { json }] of byDomain.entries()) {
  const url = (json && json.url) ? json.url : (json && json.target) ? json.target : `https://${domainKey}`;

  // (A) Consolidados a nivel dominio
  const all = pullAll(json);
  const epCounts = new Map();
  all.urls.forEach(u => {
    const hp = extractHostPath(u);
    if (hp) countMapAdd(epCounts, hp, 1);
  });
  const ckCounts = new Map();
  all.cookieNames.forEach(n => countMapAdd(ckCounts, n, 1));

  // (B) Por fases
  const phaseDetails = [];
  const blocks = extractStageBlocks(json);

  for (const { phaseLabel, block } of blocks) {
    // Recolector base
    const acc = { urls: [], cookieNames: [], cookieCount: new Map() };

    // Recorrido genérico
    pullFromNode(block, acc);

    // Enriquecimiento específico stages.*
    pullCookiesFromStages(block, acc);

    // Contabilizar
    const ep = new Map();
    acc.urls.forEach(u => {
      const hp = extractHostPath(u);
      if (hp) countMapAdd(ep, hp, 1);
    });

    const ck = new Map();
    // 1) Conteo directo por nombre detectado
    acc.cookieNames.forEach(n => countMapAdd(ck, n, 1));
    // 2) Sumar si cookieBreakdown trajo conteos agregados
    for (const [name, cnt] of (acc.cookieCount || new Map()).entries()) {
      countMapAdd(ck, name, cnt);
    }

    phaseDetails.push({
      phase: phaseLabel,
      topEndpoints: sortTop(ep, 5).map(([name, count]) => ({ name, count })),
      topCookies: sortTop(ck, 5).map(([name, count]) => ({ name, count })),
    });
  }

  results.push({
    url,
    domainKey,
    topEndpoints: sortTop(epCounts, 5).map(([name, count]) => ({ name, count })),
    topCookies: sortTop(ckCounts, 5).map(([name, count]) => ({ name, count })),
    phases: phaseDetails
  });
}

// Ordenar por URL
results.sort((a, b) => a.url.localeCompare(b.url));

// ---------- Emitir Markdown ----------
let md = `# InSpec Report (auxiliar v0.2)\n\n`;
md += `| URL | Top Endpoints (top 5) | Top Cookies (top 5) |\n`;
md += `|---|---|---|\n`;

for (const r of results) {
  const ep = r.topEndpoints.length
    ? r.topEndpoints.map(e => `${e.name} (${e.count})`).join('<br>')
    : '(none)';
  const ck = r.topCookies.length
    ? r.topCookies.map(c => `${c.name} (${c.count})`).join('<br>')
    : '(none)';
  md += `| ${r.url} | ${ep} | ${ck} |\n\n`;

  // Detalle por fase
  md += `<details>\n<summary><strong>Detalle por fase — ${r.url}</strong></summary>\n\n`;
  for (const p of r.phases) {
    md += `**Fase:** \`${p.phase}\`\n\n`;
    md += `| Top Endpoints (top 5) | Top Cookies (top 5) |\n|---|---|\n`;
    const ep2 = p.topEndpoints.length
      ? p.topEndpoints.map(e => `${e.name} (${e.count})`).join('<br>')
      : '(none)';
    const ck2 = p.topCookies.length
      ? p.topCookies.map(c => `${c.name} (${c.count})`).join('<br>')
      : '(none)';
    md += `| ${ep2} | ${ck2} |\n\n`;
  }
  md += `</details>\n\n`;
}

// STDOUT → Markdown
process.stdout.write(md);

// JSON técnico
try {
  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ generatedAt: new Date().toISOString(), items: results }, null, 2));
} catch (e) {
  console.error(`No se pudo escribir ${OUTPUT_JSON}: ${e.message}`);
}