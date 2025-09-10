// professionalAnalysis.js
// ESM-ready. Runs a single crawl, saves raw report, normalizes, and optionally packages.
// Node v22+ required. Project "type":"module" supported.

// ----------------- Imports -----------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { runCrawl, saveReportJSON } from './backend/spectralCrawler.js';
import { normalizeOneReport, packageForensics } from './forensicZip.js';

// ----------------- Constants -----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Console visibility
const log = (...a) => console.log('[professionalAnalysis]', ...a);

// ----------------- Arg parsing -----------------
function parseArgs(argv) {
  const out = {
    url: null,
    outdir: 'reports',
    zip: false,
    latestOnly: true,  // default: keep only latest per domain during packaging
    evidence: true,    // include evidence files in ZIP
  };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!out.url && !a.startsWith('-')) { out.url = a; continue; }
    if (a === '--outdir') { out.outdir = args[++i]; continue; }
    if (a === '--zip') { out.zip = true; continue; }
    if (a === '--all') { out.latestOnly = false; continue; }
    if (a === '--no-evidence') { out.evidence = false; continue; }
  }
  return out;
}

// ----------------- Helpers -----------------
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function ts() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function domainFromUrl(u) {
  try { return new URL(u).hostname.replace(/^www\./,''); } catch { return 'invalid-domain'; }
}

// ----------------- Main -----------------
async function main() {
  const cfg = parseArgs(process.argv);
  if (!cfg.url) {
    console.error('Usage: node professionalAnalysis.js <url> [--outdir reports] [--zip] [--all] [--no-evidence]');
    process.exit(2);
  }

  log('Start', { url: cfg.url, outdir: cfg.outdir, zip: cfg.zip, latestOnly: cfg.latestOnly, evidence: cfg.evidence });

  ensureDir(cfg.outdir);

  // 1) Crawl
  log('Crawling...');
  const report = await runCrawl(cfg.url);

  // 2) Save raw JSON
  const dom = domainFromUrl(cfg.url);
  const outFile = path.join(cfg.outdir, `spectral-analysis-${dom}-${ts()}.json`);
  await saveReportJSON(outFile, report);
  log('Saved raw report:', outFile);

  // 3) Normalize immediately to catch CMP bug and produce .norm.json next to raw
  log('Normalizing for P0.5...');
  const normPath = await normalizeOneReport(outFile);
  log('Saved normalized report:', normPath);

  // 4) Optional packaging
  if (cfg.zip) {
    log('Packaging forensic evidence...');
    const pkgInfo = await packageForensics({
      reportsDir: cfg.outdir,
      latestOnly: cfg.latestOnly,
      includeEvidence: cfg.evidence,
    });
    log('Packaging complete:', pkgInfo);
  }

  log('Done.');
}

main().catch(err => {
  console.error('[professionalAnalysis] FATAL', err?.stack || err);
  process.exit(1);
});
