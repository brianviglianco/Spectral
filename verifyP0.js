// verifyP0.js — robusto, imprime resumen y valida presencia de métricas
const fs = require('fs');

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { return { __error: String(e) }; }
}

function isNum(v){ return typeof v === 'number' && Number.isFinite(v); }

function evaluate(n) {
  const M = n.metrics || {};
  const stages = ['baseline','reject_pre','reject','accept_pre','accept'];
  const reasons = [];

  const hasAll = stages.every(k =>
    M[k] && ['hits','setCookie','ls','ss'].every(m => isNum(M[k][m]))
  );
  if (!hasAll) reasons.push('Missing or non-numeric metrics in one or more stages');

  if ((n.siteHost || '').match(/(^|\.)cookielaw\.org$/i) && n.score !== 100) {
    reasons.push(`Cookielaw score expected 100, got ${n.score == null ? 'null' : n.score}`);
  }
  return { pass: reasons.length === 0, reasons };
}

function printOne(r, i){
  console.log(`[${i+1}] ${r.pass ? 'PASS':'FAIL'}  ${r.file}`);
  console.log(`URL: ${r.url}`);
  if (r.score != null || r.risk != null) {
    const s = r.score != null ? `Score: ${r.score}` : null;
    const k = r.risk  != null ? `Risk: ${r.risk}`   : null;
    if (s || k) console.log([s,k].filter(Boolean).join('  '));
  }
  const m = r.metrics;
  console.log('Metrics:');
  console.log(`  baseline   → hits=${m.baseline.hits} set-cookie=${m.baseline.setCookie} ls=${m.baseline.ls} ss=${m.baseline.ss}`);
  console.log(`  reject     → hits=${m.reject.hits} set-cookie=${m.reject.setCookie}`);
  console.log(`  accept_pre → hits=${m.accept_pre.hits} set-cookie=${m.accept_pre.setCookie}  preConsent=${r.annotations.accept_pre.background ? 'background' : 'false'}`);
  console.log(`  accept     → hits=${m.accept.hits} set-cookie=${m.accept.setCookie}`);
  if (!r.pass && r.reasons.length) {
    console.log('Reasons:');
    r.reasons.forEach(x => console.log(`  - ${x}`));
  }
  console.log('');
}

function main(){
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: node verifyP0.js <file1.p0.json> [...]');
    process.exit(2);
  }
  const results = files.map(file => {
    const n = readJson(file);
    const out = { file, ...n, ...evaluate(n) };
    return out;
  });

  console.log('P0 VERIFICATION SUMMARY');
  console.log('==================================================\n');
  results.forEach(printOne);
  const anyFail = results.some(r => !r.pass);
  console.log('==================================================');
  console.log(anyFail ? 'SOME FAIL' : 'ALL PASS');
}

main();
