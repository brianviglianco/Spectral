// run-matrix.js
// ESM-ready. Robust flag parser. Runs professionalAnalysis.js across regions and sites.
// Example:
//   node run-matrix.js --regions de,fr,it --sites ./sites-anchor.json --outdir reports --zip
//   node run-matrix.js --region de --sites ./sites-anchor.json

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const log = (...a) => console.log('[run-matrix]', ...a);

// --------- arg parsing ----------
function parseArgs(argv) {
  const out = {
    regions: [],
    sitesPath: null,
    concurrency: 1,     // keep simple and predictable for forensics
    outdir: 'reports',
    zip: false,
    latestOnly: true,
    evidence: true,
    extra: [],          // passthrough to professionalAnalysis if needed
  };
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--regions') { out.regions = args[++i].split(',').filter(Boolean); continue; }
    if (a === '--region') { out.regions = [args[++i]]; continue; }
    if (a === '--sites') { out.sitesPath = args[++i]; continue; }
    if (a === '--outdir') { out.outdir = args[++i]; continue; }
    if (a === '--zip') { out.zip = true; continue; }
    if (a === '--all') { out.latestOnly = false; continue; }
    if (a === '--no-evidence') { out.evidence = false; continue; }
    // passthrough unknown flags:
    if (a.startsWith('--')) { out.extra.push(a); if (!a.includes('=')) { const next = args[i+1]; if (next && !next.startsWith('--')) { out.extra.push(next); i++; } } continue; }
    // ignore bare values here
  }
  if (!out.regions.length) out.regions = ['de'];
  if (!out.sitesPath) throw new Error('Missing --sites <path-to-json-or-js>');
  return out;
}

function loadSites(sitesPath) {
  const full = path.isAbsolute(sitesPath) ? sitesPath : path.join(process.cwd(), sitesPath);
  if (!fs.existsSync(full)) throw new Error(`Sites file not found: ${full}`);
  if (full.endsWith('.json')) {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  }
  if (full.endsWith('.js')) {
    // Common simple module export: module.exports = [ ... ]
    const m = require(full); // Node still supports CJS require of external js in many setups
    return Array.isArray(m) ? m : m?.default || [];
  }
  throw new Error('Unsupported sites file. Use .json or .js');
}

function runOne(url, cfg) {
  const cmd = process.execPath; // node
  const args = [
    path.join(__dirname, 'professionalAnalysis.js'),
    url,
    '--outdir', cfg.outdir,
  ];
  if (cfg.zip) args.push('--zip');
  if (!cfg.latestOnly) args.push('--all');
  if (!cfg.evidence) args.push('--no-evidence');
  args.push(...cfg.extra);

  const env = { ...process.env, SPECTRAL_REGION: cfg.region };
  log('EXEC', { region: cfg.region, url, args: args.join(' ') });
  const res = spawnSync(cmd, args, { stdio: 'inherit', env });
  if (res.status !== 0) {
    console.error('[run-matrix] ERROR status', res.status, 'region', cfg.region, 'url', url);
  }
  return res.status;
}

async function main() {
  const cfg = parseArgs(process.argv);
  const sites = loadSites(cfg.sitesPath);
  if (!Array.isArray(sites) || sites.length === 0) throw new Error('Sites list is empty');
  log('Config', { regions: cfg.regions, outdir: cfg.outdir, zip: cfg.zip, latestOnly: cfg.latestOnly, evidence: cfg.evidence, totalSites: sites.length });

  let failures = 0;
  for (const region of cfg.regions) {
    for (const url of sites) {
      const status = runOne(url, { ...cfg, region });
      if (status !== 0) failures++;
    }
  }

  if (failures) {
    console.error(`[run-matrix] Completed with ${failures} failures`);
    process.exit(1);
  } else {
    log('Completed successfully');
  }
}

main().catch(err => {
  console.error('[run-matrix] FATAL', err?.stack || err);
  process.exit(1);
});
