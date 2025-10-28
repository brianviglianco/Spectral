#!/usr/bin/env node
// Spectral – Batch runner (10 sites) using backend/config/sites-anchor.json
// Runs each site with the single-site strict+enrich flow (serial execution)
// Usage:
//   node runConsoleBatch.mjs --lang de-DE
//
// Output:
// - Clear banner per site
// - Continues on failure; prints PASS/FAIL per site
// - Final summary with counts

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LIST_PATHS = [
  path.join(ROOT, 'backend', 'config', 'sites-anchor.json'),
  path.join(ROOT, 'sites-anchor.json')
];

function findListFile() {
  for (const p of LIST_PATHS) if (fs.existsSync(p)) return p;
  console.error('ERROR: sites-anchor.json not found in', LIST_PATHS.join(' or '));
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { lang: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--lang') out.lang = args[++i];
  }
  return out;
}

function runSingle(url, lang) {
  const args = ['runConsoleSingle.mjs', '--host', url];
  if (lang) args.push('--lang', lang);
  const res = spawnSync('node', args, { stdio: 'inherit', env: { ...process.env } });
  return res.status === 0;
}

function main() {
  const { lang } = parseArgs();
  const listPath = findListFile();
  const urls = JSON.parse(fs.readFileSync(listPath, 'utf8'));
  if (!Array.isArray(urls) || urls.length === 0) {
    console.error('ERROR: sites list is empty in', listPath);
    process.exit(1);
  }

  console.log('\n=== Spectral Batch (10 sites, strict+enrich) ===');
  console.log('Node:', process.version);
  console.log('ROOT:', ROOT);
  console.log('List:', listPath);
  console.log('Total sites:', urls.length);
  console.log('==================================================');

  let pass = 0, fail = 0;
  for (const url of urls) {
    console.log('==================================================');
    console.log('TARGET:', url);
    console.log('==================================================');
    const ok = runSingle(url, lang);
    if (ok) { pass++; console.log(`[BATCH] OK -> ${url}`); }
    else    { fail++; console.log(`[BATCH] FAIL -> ${url}`); }
  }

  console.log('==================================================');
  console.log(`BATCH SUMMARY  ok=${pass}  fail=${fail}  total=${pass+fail}`);
  console.log('Reports in ./reports  Logs in console output (per site)');
  if (fail > 0) process.exit(1);
}

main();
