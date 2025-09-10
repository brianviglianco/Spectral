// src/tools/forensicZip.js
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const log = (...a) => console.log('[forensicZip]', ...a);

function safeGet(obj, p, d = undefined) {
  return p.split('.').reduce((o,k) => (o && k in o ? o[k] : undefined), obj) ?? d;
}
function domainFromUrl(u) {
  try { return new URL(u).hostname.replace(/^www\./,''); } catch { return 'invalid-domain'; }
}
function which(cmd) {
  const isWin = process.platform === 'win32';
  const r = spawnSync(isWin ? 'where' : 'which', [cmd], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split(/\r?\n/).filter(Boolean)[0] : null;
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// ---------- Provider heuristics ----------
const PROVIDER_HINTS = [
  { provider: 'OneTrust', match: /cookielaw\.org|onetrust|ot-sdk/i },
  { provider: 'Cookiebot', match: /cookiebot|consent\.cookiebot|consentcdn|usercentrics\.eu|uc-cdp/i }, // Cookiebot or UC hints
  { provider: 'Usercentrics', match: /usercentrics|uc-cmp|consent\.cdn\.uc/i },
  { provider: 'Didomi', match: /didomi|consent\.didomi|sdk\.privacy-center\.org/i },
  { provider: 'TrustArc', match: /trustarc|truste|consent\.prefmgr/i },
  { provider: 'Quantcast', match: /quantcast|cmp\.quantcast/i },
  { provider: 'IAB TCF', match: /__tcfapi|iabeurope/i },
];

function inferProviderFromArtifacts(raw) {
  const bag = [];

  // scripts
  for (const s of raw.scripts || []) {
    if (typeof s === 'string') bag.push(s);
    else if (s?.src) bag.push(String(s.src));
  }
  // requests
  for (const r of raw.requests || []) {
    if (typeof r === 'string') bag.push(r);
    else if (r?.url) bag.push(String(r.url));
    else if (r?.request?.url) bag.push(String(r.request.url));
  }
  // cookies (names and domains)
  for (const c of raw.cookies || []) {
    if (c?.name) bag.push(String(c.name));
    if (c?.domain) bag.push(String(c.domain));
  }

  const hay = bag.join(' ');
  for (const h of PROVIDER_HINTS) {
    if (h.match.test(hay)) return h.provider;
  }
  return null;
}

// ---------- CMP ----------
export function extractCMP(bannerSummary = {}, rawReport = {}) {
  const stages = ['initial','finalA','finalB'];
  let anyDetected = false, provider = null, type = null;
  for (const s of stages) {
    const st = bannerSummary?.[s];
    if (!st) continue;
    if (st.detected) anyDetected = true;
    if (!provider && st.provider) provider = st.provider;
    if (!type && st.type) type = st.type;
  }
  // fallback: infer from artifacts
  if (!provider) provider = inferProviderFromArtifacts(rawReport);
  return { cmpDetected: !!anyDetected, cmpProvider: provider || null, cmpType: type || null, bannerSummary };
}

export function buildP0Snapshot(rawReport = {}) {
  const snapshot = {
    url: rawReport.url || rawReport.targetUrl || null,
    domain: domainFromUrl(rawReport.url || rawReport.targetUrl || ''),
    startedAt: rawReport.startedAt || rawReport.timestamp || new Date().toISOString(),
    region: process.env.SPECTRAL_REGION || rawReport.region || null,
    cookies: rawReport.cookies || [],
    localStorage: rawReport.localStorage || [],
    sessionStorage: rawReport.sessionStorage || [],
    requests: rawReport.requests || [],
    scripts: rawReport.scripts || [],
    stages: {
      baseline: rawReport.baseline || null,
      reject: rawReport.reject || null,
      accept: rawReport.accept || null,
    },
  };
  const mergedBannerSummary =
    rawReport.bannerSummary ||
    safeGet(rawReport, 'baseline.bannerSummary') ||
    safeGet(rawReport, 'reject.bannerSummary') ||
    safeGet(rawReport, 'accept.bannerSummary') || {};
  const cmp = extractCMP(mergedBannerSummary, rawReport);
  snapshot.cmpDetected = cmp.cmpDetected;
  snapshot.cmpProvider = cmp.cmpProvider;
  snapshot.cmpType = cmp.cmpType;
  snapshot.bannerSummary = cmp.bannerSummary;
  return snapshot;
}

// ---------- I/O ----------
export async function normalizeOneReport(rawPath) {
  const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  const snapshot = buildP0Snapshot(raw);
  const normPath = rawPath.replace(/\.json$/i, '.norm.json');
  fs.writeFileSync(normPath, JSON.stringify(snapshot, null, 2), 'utf8');
  return normPath;
}
export function listReports(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && !f.endsWith('.norm.json'))
    .map(f => path.join(dir, f))
    .sort();
}
export function listNorms(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.norm.json'))
    .map(f => path.join(dir, f))
    .sort();
}

// ---------- Manifest + ZIP ----------
function buildManifest(normPaths, { latestOnly }) {
  const byDomain = new Map();
  for (const p of normPaths) {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const d = j.domain || 'unknown';
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d).push({ path: p, ts: fs.statSync(p).mtimeMs, url: j.url, cmpDetected: j.cmpDetected, cmpProvider: j.cmpProvider });
  }
  const domains = [];
  for (const [domain, arr] of byDomain.entries()) {
    arr.sort((a,b)=>a.ts-b.ts);
    domains.push({ domain, items: latestOnly ? [arr[arr.length-1]] : arr });
  }
  return { generatedAt: new Date().toISOString(), latestOnly, domains };
}

function zipPaths(outputZip, paths, cwd) {
  const zipBin = which('zip');
  if (zipBin) {
    const args = ['-r', outputZip, ...paths];
    const r = spawnSync(zipBin, args, { stdio: 'inherit', cwd });
    return r.status === 0;
  }
  const tarBin = which('tar');
  if (tarBin) {
    const outTgz = outputZip.replace(/\.zip$/i, '.tar.gz');
    const args = ['-czf', outTgz, ...paths];
    const r = spawnSync(tarBin, args, { stdio: 'inherit', cwd });
    return r.status === 0;
  }
  console.warn('[forensicZip] Neither zip nor tar present. Skipping archive.');
  return true;
}

export async function packageForensics({ reportsDir, latestOnly = true, includeEvidence = true }) {
  let norms = listNorms(reportsDir);
  if (!norms.length) {
    const raws = listReports(reportsDir);
    for (const r of raws) await normalizeOneReport(r);
    norms = listNorms(reportsDir);
  }
  if (!norms.length) throw new Error('No normalized reports found');

  const manifest = buildManifest(norms, { latestOnly });
  const manifestPath = path.join(reportsDir, 'MANIFEST.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  const created = [];
  for (const d of manifest.domains) {
    const dom = d.domain || 'unknown';
    const outDir = path.join(reportsDir, `forensic-${dom}`);
    fs.mkdirSync(outDir, { recursive: true });

    for (const it of d.items) {
      const normPath = it.path;
      const rawPath = normPath.replace(/\.norm\.json$/i, '.json');
      fs.copyFileSync(normPath, path.join(outDir, path.basename(normPath)));
      if (fs.existsSync(rawPath)) fs.copyFileSync(rawPath, path.join(outDir, path.basename(rawPath)));
    }

    if (includeEvidence) {
      const entries = fs.readdirSync(reportsDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && e.name.toLowerCase().includes(dom.toLowerCase()) && !e.name.startsWith('forensic-')) {
          copyDir(path.join(reportsDir, e.name), path.join(outDir, e.name));
        }
      }
    }

    fs.writeFileSync(
      path.join(outDir, 'MANIFEST.json'),
      JSON.stringify({ ...manifest, domains: [d] }, null, 2),
      'utf8'
    );

    const outZip = path.join(reportsDir, `forensic-${dom}.zip`);
    const ok = zipPaths(outZip, ['.'], outDir);
    created.push(ok ? outZip : outDir);
  }

  return { created, manifest: manifestPath };
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const reportsDir = path.resolve(args[0] || path.join(process.cwd(), 'reports'));
  const latestOnly = !args.includes('--all');
  const includeEvidence = !args.includes('--no-evidence');
  packageForensics({ reportsDir, latestOnly, includeEvidence })
    .then(r => { log('OK', r); })
    .catch(e => { console.error('[forensicZip] FATAL', e?.stack || e); process.exit(1); });
}
