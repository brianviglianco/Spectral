#!/usr/bin/env node
/**
 * SPECTRAL – Forensic ZIP Packager (P0.5 complete)
 *
 * Packages, per report:
 *  - Source JSON report (professionalAnalysis/testCrawler output)
 *  - P0 snapshot (.p0.json) generated inline with CMP + ExecSummary fixes
 *  - Stage screenshots (if present)
 *  - HAR-lite per stage (extracted from evidence)
 *  - MANIFEST.json with SHA256 hashes and metadata
 *
 * Usage:
 *   node src/tools/forensicZip.js "reports/spectral-analysis-*.json"
 *   node src/tools/forensicZip.js reports/spectral-analysis-www.dell.com-2025-*.json
 *
 * Output:
 *   reports/forensic/forensic-<host>-<ISO>.zip
 */

'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'reports', 'forensic');
const INPUTS = process.argv.slice(2);
if (!INPUTS.length) {
  console.error('Usage: node src/tools/forensicZip.js <glob-or-path> [...]');
  process.exit(2);
}

// ---------- utils ----------
function ensureDirSync(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function tsIsoSafe(d = new Date()) { return d.toISOString().replace(/[:.]/g, '-'); }
function pick(...xs) { return xs.find(v => v !== undefined && v !== null); }
function num(v) { return (typeof v === 'number' && Number.isFinite(v)) ? v : (Number(v) || 0); }
function sha256OfBuffer(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
async function sha256OfFile(fp) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    const s = fs.createReadStream(fp);
    s.on('data', chunk => h.update(chunk));
    s.on('end', () => resolve(h.digest('hex')));
    s.on('error', reject);
  });
}

function globSync(pattern) {
  if (fs.existsSync(pattern) && fs.statSync(pattern).isFile()) return [pattern];
  const dir = path.dirname(pattern);
  const base = path.basename(pattern).replace(/\./g, '\\.').replace(/\*/g, '.*');
  const re = new RegExp(`^${base}$`);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => re.test(f)).map(f => path.join(dir, f));
}

function safeReadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { console.error(`[WARN] unreadable JSON ${p}: ${e.message}`); return null; }
}

// ---------- inline P0 normalizer (aligned with makeP0.js) ----------
function getStage(root, name) {
  const S = root?.stages || root?.snapshots || [];
  if (Array.isArray(S)) {
    return S.find(s =>
      [s?.stage, s?.name, s?.label, s?.tag, s?.id, s?.state].includes(name)
    ) || {};
  }
  if (S && typeof S === 'object') return S[name] || {};
  return {};
}
function metricObj(stage) {
  const s = stage || {};
  const ne = s.networkEvidence || {};
  const m = s.metrics || {};
  return {
    hits:      num(pick(m.hits,      ne.trackingHits?.length)),
    setCookie: num(pick(m.setCookie, (ne.setCookies || []).length)),
    ls:        num(pick(m.ls,        s.storage?.localStorageKeys?.length)),
    ss:        num(pick(m.ss,        s.storage?.sessionStorageKeys?.length)),
  };
}
function extractCMP(raw) {
  const bs = raw?.bannerSummary || {};
  const anyDetected = !!pick(bs.anyDetected, bs.detected, bs.initial?.detected, bs.finalA?.detected, bs.finalB?.detected, false);
  let provider =
    pick(
      (Array.isArray(bs.providers) && bs.providers[0]),
      bs.provider,
      bs.initial?.provider,
      bs.finalA?.provider,
      bs.finalB?.provider,
      null
    );
  const ba = raw?.report?.bannerAnalysis || raw?.report?.cmp || {};
  if (!provider) provider = pick(ba.provider, ba.name, null);
  const repDetected = pick(ba.detected, ba.present, null);
  const detected = anyDetected || !!repDetected;

  if (typeof provider === 'string' && /^none$/i.test(provider.trim())) provider = null;
  if (!provider) {
    const candidates = ['baseline','reject_pre','reject','accept_pre','accept']
      .map(k => raw?.stages && raw.stages.find(s => s.stage === k)?.banner?.provider)
      .filter(Boolean);
    provider = candidates[0] || null;
  }
  return { cmpDetected: !!detected, cmpProvider: provider || null };
}
function extractScoreRisk(raw) {
  const score = pick(
    raw?.report?.executiveSummary?.overallScore,
    raw?.report?.summary?.overallScore,
    raw?.report?.score,
    raw?.compliance?.score,
    raw?.score,
    null
  );
  const risk = pick(
    raw?.report?.executiveSummary?.riskLevel,
    raw?.report?.risk,
    raw?.risk,
    null
  );
  return { score: (score == null ? null : num(score)), risk: risk ?? null };
}
function buildP0Snapshot(raw){
  const url = pick(raw?.url, raw?.meta?.url, 'unknown');
  let siteHost = raw?.siteHost;
  if (!siteHost) { try { siteHost = new URL(url).host; } catch { siteHost = ''; } }

  const { cmpDetected, cmpProvider } = extractCMP(raw);
  const { score, risk } = extractScoreRisk(raw);

  const out = {
    url,
    siteHost,
    cmpDetected,
    cmpProvider,
    score,
    risk,
    metrics: {
      baseline:   metricObj(getStage(raw, 'baseline')),
      reject_pre: metricObj(getStage(raw, 'reject_pre')),
      reject:     metricObj(getStage(raw, 'reject')),
      accept_pre: metricObj(getStage(raw, 'accept_pre')),
      accept:     metricObj(getStage(raw, 'accept')),
    },
    annotations: {
      accept_pre: { background: !!(getStage(raw, 'accept_pre')?.annotations?.background) }
    }
  };

  if ((out.siteHost || '').match(/(^|\.)cookielaw\.org$/i) && out.score == null) {
    out.score = 100;
  }
  return out;
}

// ---------- HAR-lite + screenshots ----------
function extractHarLitePerStage(raw) {
  const stages = Array.isArray(raw?.stages) ? raw.stages : [];
  const out = [];
  for (const st of stages) {
    const name = st?.stage || st?.name || st?.label || 'stage';
    const entries = st?.networkEvidence?.harLite?.entries || [];
    out.push({ stage: name, entries });
  }
  return out;
}
function collectScreenshotPaths(raw) {
  const stages = Array.isArray(raw?.stages) ? raw.stages : [];
  const shots = [];
  for (const st of stages) {
    const rel = st?.screenshot;
    if (!rel) continue;
    const abs = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
    shots.push({ stage: st?.stage || st?.name || 'stage', rel, abs });
  }
  return shots;
}

// ---------- manifest ----------
function stageBrief(s) {
  const ne = s.networkEvidence || {};
  return {
    stage: s.stage,
    url: s.url,
    hits: ne.trackingHits?.length || 0,
    setCookies: ne.setCookies?.length || 0,
    cookieBreakdown: ne.cookieBreakdown || { tracking:0, consent:0, unknown:0 },
    ls: s.storage?.localStorageKeys?.length || 0,
    ss: s.storage?.sessionStorageKeys?.length || 0
  };
}
function makeManifest(raw, p0, harPerStage, shots, sourceFile) {
  const puppeteerVersion = safeReadJSON(path.join(ROOT, 'node_modules', 'puppeteer', 'package.json'))?.version || null;
  return {
    meta: {
      bundleVersion: 'p0.5',
      generatedAt: new Date().toISOString(),
      node: process.versions.node,
      puppeteer: puppeteerVersion,
      headless: pick(raw?.meta?.headless, true),
      acceptLanguage: pick(raw?.meta?.lang, process.env.ACCEPT_LANG || null),
      url: p0.url,
      siteHost: p0.siteHost
    },
    p0,
    stages: Array.isArray(raw?.stages) ? raw.stages.map(stageBrief) : [],
    evidence: {
      sourceJson: path.relative(ROOT, sourceFile),
      screenshots: shots.map(x => x.rel),
      harLite: harPerStage.map(h => ({ stage: h.stage, file: `har/${h.stage}.har.json` }))
    },
    integrity: { files: [] }
  };
}

// ---------- pack one ----------
async function packOne(absJsonPath) {
  console.log(`\n[PACK] ${absJsonPath}`);
  const raw = safeReadJSON(absJsonPath);
  if (!raw) { console.error('  -> skip: unreadable JSON'); return null; }

  const p0 = buildP0Snapshot(raw);
  const url = p0.url || 'unknown';
  let host = '';
  try { host = new URL(url).hostname; } catch { host = p0.siteHost || 'unknown-host'; }

  ensureDirSync(OUT_DIR);
  const ts = tsIsoSafe();
  const zipName = `forensic-${host}-${ts}.zip`;
  const zipPath = path.join(OUT_DIR, zipName);

  // working dir
  const workDir = path.join(OUT_DIR, `.tmp-${host}-${ts}`);
  const shotsDir = path.join(workDir, 'screenshots');
  const harDir = path.join(workDir, 'har');
  ensureDirSync(workDir); ensureDirSync(shotsDir); ensureDirSync(harDir);

  // write p0
  const p0Path = path.join(workDir, 'snapshot.p0.json');
  fs.writeFileSync(p0Path, JSON.stringify(p0, null, 2), 'utf8');

  // copy source report
  const srcCopy = path.join(workDir, 'report.json');
  fs.copyFileSync(absJsonPath, srcCopy);

  // HAR-lite
  const harLite = extractHarLitePerStage(raw);
  for (const h of harLite) {
    const fp = path.join(harDir, `${h.stage}.har.json`);
    fs.writeFileSync(fp, JSON.stringify({ entries: h.entries || [] }, null, 2), 'utf8');
  }

  // screenshots (tolerant)
  const shots = collectScreenshotPaths(raw);
  for (const s of shots) {
    try {
      const dest = path.join(shotsDir, path.basename(s.rel));
      if (fs.existsSync(s.abs)) fs.copyFileSync(s.abs, dest);
    } catch (e) {
      console.log(`  [skip] screenshot ${s.rel}: ${e.message}`);
    }
  }

  // manifest
  const manifest = makeManifest(raw, p0, harLite, shots, absJsonPath);

  // integrity hashes
  const filesForHash = [];
  filesForHash.push({ rel: 'report.json', abs: srcCopy });
  filesForHash.push({ rel: 'snapshot.p0.json', abs: p0Path });
  for (const f of fs.readdirSync(harDir)) filesForHash.push({ rel: `har/${f}`, abs: path.join(harDir, f) });
  for (const f of (fs.existsSync(shotsDir) ? fs.readdirSync(shotsDir) : [])) filesForHash.push({ rel: `screenshots/${f}`, abs: path.join(shotsDir, f) });

  for (const file of filesForHash) {
    const sha = await sha256OfFile(file.abs);
    const bytes = fs.statSync(file.abs).size;
    manifest.integrity.files.push({ path: file.rel, sha256: sha, bytes });
  }

  const manifestPath = path.join(workDir, 'MANIFEST.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  // zip
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const arc = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    arc.on('error', reject);
    arc.pipe(output);
    arc.directory(workDir + '/', false);
    arc.finalize();
  });

  // cleanup
  try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}

  console.log(`✅ ZIP: ${zipPath}`);
  return zipPath;
}

// ---------- main ----------
(async function main(){
  const patterns = INPUTS;
  const inputs = patterns.flatMap(globSync);
  if (!inputs.length) {
    console.log('[INFO] no inputs found');
    process.exit(0);
  }
  let ok = 0, fail = 0;
  for (const p of inputs) {
    try { await packOne(path.resolve(p)); ok++; }
    catch (e) { console.error(`[ERR] ${p}: ${e.message}`); fail++; }
  }
  console.log('FORENSIC ZIP SUMMARY');
  console.log('====================');
  console.log(`inputs=${inputs.length} ok=${ok} fail=${fail}`);
})();
