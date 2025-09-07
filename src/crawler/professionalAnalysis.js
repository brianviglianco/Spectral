#!/usr/bin/env node
/**
 * src/crawler/professionalAnalysis.js  (CommonJS)
 * - Carga CJS crawler con require
 * - Importa ESM forensicZip.js dinámicamente
 * - Guarda raw, normaliza y empaqueta opcionalmente
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { runCrawl, saveReportJSON } = require('./spectralCrawler.js'); // CJS:contentReference[oaicite:1]{index=1}

const log = (...a) => console.log('[professionalAnalysis]', ...a);

function parseArgs(argv) {
  const out = { url: null, outdir: 'reports', zip: false, latestOnly: true, evidence: true };
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

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function dirnameOf(p) { try { return path.dirname(p); } catch { return 'reports'; } }

async function main() {
  const cfg = parseArgs(process.argv);
  if (!cfg.url) {
    console.error('Usage: node professionalAnalysis.js <url> [--outdir reports] [--zip] [--all] [--no-evidence]');
    process.exit(2);
  }

  log('Start', cfg);

  // 1) Crawl
  const report = await runCrawl(cfg.url);

  // 2) Save raw JSON (spectralCrawler writes into ./reports and returns the path)
  const savedPath = await saveReportJSON(report);
  log('Saved raw report:', savedPath);

  // 3) Normalize using ESM module (dynamic import)
  const { normalizeOneReport, packageForensics } = await import('../tools/forensicZip.js');
  const normPath = await normalizeOneReport(savedPath);
  log('Saved normalized report:', normPath);

  // 4) Optional packaging: target dir = folder where raw was saved
  if (cfg.zip) {
    const reportsDir = dirnameOf(savedPath);
    const pkgInfo = await packageForensics({
      reportsDir,
      latestOnly: cfg.latestOnly,
      includeEvidence: cfg.evidence,
    });
    log('Packaging complete:', pkgInfo);
  }

  log('Done.');
}

if (require.main === module) {
  main().catch(err => {
    console.error('[professionalAnalysis] FATAL', err?.stack || err);
    process.exit(1);
  });
}
