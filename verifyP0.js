#!/usr/bin/env node
/**
 * SPECTRAL – P0 Verifier (extended CMP checks + glob support)
 *
 * Validates normalized P0 snapshots:
 *  - numeric metrics for all 5 stages
 *  - cmpDetected/cmpProvider presence and consistency
 *  - cookielaw.org special case score=100
 *
 * Usage:
 *   node verifyP0.js reports/*.p0.json
 *   node verifyP0.js "reports/*.p0.json"   // quoted; glob will be expanded internally
 */

'use strict';

const fs = require('fs');
const path = require('path');

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { return { __error: String(e) }; }
}

function isNum(v){ return typeof v === 'number' && Number.isFinite(v); }

function toRegexFromGlob(glob) {
  const dir = path.dirname(glob);
  const base = path.basename(glob)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return { dir, re: new RegExp('^' + base + '$') };
}

function expandArgs(argv) {
  const out = [];
  for (const token of argv) {
    if (!token.includes('*') && !token.includes('?')) {
      out.push(token);
      continue;
    }
    const { dir, re } = toRegexFromGlob(token);
    if (!fs.existsSync(dir)) continue;
    const matches = fs.readdirSync(dir).filter(f => re.test(f)).map(f => path.join(dir, f));
    out.push(...matches);
  }
  // de-dup y orden
  return Array.from(new Set(out)).sort();
}

function evalFile(n) {
  const reasons = [];
  const M = n.metrics || {};
  const stages = ['baseline','reject_pre','reject','accept_pre','accept'];

  // metrics check
  const hasAll = stages.every(k =>
    M[k] && ['hits','setCookie','ls','ss'].every(m => isNum(M[k][m]))
  );
  if (!hasAll) reasons.push('Missing or non-numeric metrics in one or more stages');

  // CMP fields presence
  const hasCMP = ('cmpDetected' in n) && ('cmpProvider' in n);
  if (!hasCMP) reasons.push('Missing cmpDetected/cmpProvider in snapshot');

  // CMP consistency
  if (hasCMP) {
    if (typeof n.cmpDetected !== 'boolean') reasons.push('cmpDetected must be boolean');
    if (n.cmpDetected && (!n.cmpProvider || String(n.cmpProvider).trim().length === 0)) {
      reasons.push('cmpProvider must be non-empty when cmpDetected=true');
    }
  }

  // Cookielaw special
  if ((n.siteHost || '').match(/(^|\.)cookielaw\.org$/i)) {
    if (n.score !== 100) reasons.push(`Cookielaw score expected 100, got ${n.score == null ? 'null' : n.score}`);
  }

  return { pass: reasons.length === 0, reasons };
}

function printOne(r, i){
  console.log(`[${i+1}] ${r.pass ? 'PASS':'FAIL'}  ${r.file}`);
  console.log(`URL: ${r.url}`);
  const s = (r.score == null) ? null : `Score: ${r.score}`;
  const k = (r.risk  == null) ? null : `Risk: ${r.risk}`;
  const cmp = (('cmpDetected' in r) || ('cmpProvider' in r))
    ? `CMP: detected=${String(r.cmpDetected)} provider=${r.cmpProvider || 'None'}`
    : 'CMP: n/a';
  if (s || k) console.log([s,k].filter(Boolean).join('  '));
  console.log(cmp);

  const m = r.metrics || {};
  const st = (name) => (m[name] || { hits:0,setCookie:0,ls:0,ss:0 });
  console.log('Metrics:');
  console.log(`  baseline   → hits=${st('baseline').hits} set-cookie=${st('baseline').setCookie} ls=${st('baseline').ls} ss=${st('baseline').ss}`);
  console.log(`  reject_pre → hits=${st('reject_pre').hits} set-cookie=${st('reject_pre').setCookie} ls=${st('reject_pre').ls} ss=${st('reject_pre').ss}`);
  console.log(`  reject     → hits=${st('reject').hits} set-cookie=${st('reject').setCookie} ls=${st('reject').ls} ss=${st('reject').ss}`);
  console.log(`  accept_pre → hits=${st('accept_pre').hits} set-cookie=${st('accept_pre').setCookie} ls=${st('accept_pre').ls} ss=${st('accept_pre').ss}  preConsent=${r.annotations?.accept_pre?.background ? 'background' : 'false'}`);
  console.log(`  accept     → hits=${st('accept').hits} set-cookie=${st('accept').setCookie} ls=${st('accept').ls} ss=${st('accept').ss}`);

  if (!r.pass && r.reasons.length) {
    console.log('Reasons:');
    r.reasons.forEach(x => console.log(`  - ${x}`));
  }
  console.log('');
}

(function main(){
  const rawArgs = process.argv.slice(2);
  if (!rawArgs.length) {
    console.error('Usage: node verifyP0.js <file1.p0.json> [...]');
    process.exit(2);
  }
  const files = expandArgs(rawArgs);
  if (!files.length) {
    console.error('No input files matched.');
    process.exit(3);
  }

  const results = files.map(file => {
    const n = readJSON(file);
    const out = { file, ...n, ...evalFile(n) };
    return out;
  });

  console.log('P0 VERIFICATION SUMMARY');
  console.log('==================================================\n');
  results.forEach(printOne);
  const anyFail = results.some(r => !r.pass);
  console.log('==================================================');
  console.log(anyFail ? 'SOME FAIL' : 'ALL PASS');
})();
