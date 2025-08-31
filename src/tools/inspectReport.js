#!/usr/bin/env node
/**
 * SPECTRAL - Report Inspector (robusto: V2 con stages y legacy)
 * Uso:
 *   node src/tools/inspectReport.js
 *   node src/tools/inspectReport.js --file "reports/spectral-analysis-*.json"
 */
const fs = require('fs');
const path = require('path');

function latest(dir) {
  if (!fs.existsSync(dir)) return null;
  return fs.readdirSync(dir)
    .filter(f => f.startsWith('spectral-analysis-') && f.endsWith('.json'))
    .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0]?.f || null;
}

function load(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const d = JSON.parse(raw);
  const stages = d.stages || d.evidence?.stages || null;
  return { d, stages };
}

function main() {
  const reportsDir = path.resolve(process.cwd(), 'reports');
  const argFile = process.argv.includes('--file') ? process.argv[process.argv.indexOf('--file') + 1] : null;
  const file = argFile ? path.resolve(argFile) :
    (latest(reportsDir) ? path.join(reportsDir, latest(reportsDir)) : null);

  if (!file || !fs.existsSync(file)) {
    console.error('❌ No se encontró reporte. Usa: node src/tools/inspectReport.js --file "ruta/reporte.json"');
    process.exit(1);
  }

  console.log('📄 Reporte:', file);
  const { d, stages } = load(file);

  if (!Array.isArray(stages)) {
    console.log('⚠️ El reporte no contiene stages. Claves disponibles:', Object.keys(d));
    process.exit(0);
  }

  // Resumen general de stages
  const resumen = stages.map(s => ({
    stage: s.stage,
    hits: (s.networkEvidence?.trackingHits || []).length,
    setCookies: (s.networkEvidence?.setCookies || []).length,
    ls: (s.storage?.localStorage || []).length,
    ss: (s.storage?.sessionStorage || []).length,
    banner: s.banner?.provider || 'None'
  }));
  console.log(JSON.stringify(resumen, null, 2));

  // Evidencia clave en baseline y reject_pre
  const show = new Set(['baseline', 'reject_pre']);
  const pick = stages.filter(s => show.has(s.stage));
  for (const s of pick) {
    console.log(`\n== ${s.stage} ==`);
    console.log('Hits (max 10):');
    for (const h of (s.networkEvidence?.trackingHits || []).slice(0, 10)) {
      console.log(`- ${h.status || ''} ${h.method || ''} ${h.type || ''} ${h.url}`);
    }
    console.log('Set-Cookie (max 5):');
    for (const c of (s.networkEvidence?.setCookies || []).slice(0, 5)) {
      const line = typeof c === 'string' ? c : (c.line || '');
      console.log(`- ${String(line).split(';')[0]}...`);
    }
  }
}

main();
