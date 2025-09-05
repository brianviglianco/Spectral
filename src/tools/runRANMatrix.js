#!/usr/bin/env node
// SPECTRAL – RAN Matrix (local, sin proxy) – soporta archivo de regiones
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const url = process.argv[2];
if (!url) {
  console.error('Uso: node src/tools/runRANMatrix.js <URL> [ruta/al/regions.*.ran.json | CODIGOS]');
  process.exit(1);
}

// 2º arg: o bien path a JSON de regiones (recomendado) o lista de códigos separada por coma
const arg2 = process.argv[3] || 'config/regions.ran.json'; // fallback (no lo usás, pero por compatibilidad)

function loadRegions(input) {
  // si es archivo json existente → leerlo
  if (input && input.endsWith('.json') && fs.existsSync(input)) {
    const obj = JSON.parse(fs.readFileSync(input, 'utf8'));
    return Object.entries(obj).map(([code, cfg]) => ({
      code,
      acceptLanguage: cfg.acceptLanguage,
      tz: cfg.tz
    }));
  }
  // si viene lista "DE,FR,IT" → construir con defaults seguros
  if (input && /^[A-Z]{2}(,[A-Z]{2})*$/.test(input)) {
    return input.split(',').map(code => ({
      code,
      acceptLanguage: `${code.toLowerCase()}-${code};q=0.9`,
      tz: 'UTC'
    }));
  }
  // si no hay archivo y tampoco lista → error claro
  if (input && input.endsWith('.json')) {
    console.error(`No se encontró el archivo de regiones: ${input}`);
    process.exit(1);
  }
  console.error('Proveé un JSON de regiones (p.ej. config/regions.smoke.ran.json) o una lista "DE,FR,IT".');
  process.exit(1);
}

const regions = loadRegions(arg2);

console.log('SPECTRAL – RAN Matrix (local, no proxy)');
console.log('URL:', url);
console.log('Regions file/codes:', arg2);

// asegurar carpetas por región
for (const r of regions) {
  const outDir = path.join('reports', 'ran', r.code);
  fs.mkdirSync(outDir, { recursive: true });

  console.log('\n==========================================');
  console.log(`RAN ▶ region=${r.code} lang=${r.acceptLanguage} tz=${r.tz}`);
  console.log('==========================================');

  // Ejecuta el entrypoint “professionalAnalysis.js” en la raíz del proyecto
  const env = {
    ...process.env,
    RAN_REGION: r.code,
    RAN_ACCEPT_LANGUAGE: r.acceptLanguage,
    RAN_TZ: r.tz
  };

  const run = spawnSync(
    process.execPath, // node actual
    ['professionalAnalysis.js', url],
    { stdio: 'inherit', env }
  );

  if (run.status !== 0) {
    console.error(`[ERROR] professionalAnalysis failed for ${r.code} (exit ${run.status})`);
    continue;
  }

  // Mover el último JSON generado a la carpeta de la región (lo hace tu analysis, pero dejamos “net”)
  // Si tu analysis ya mueve, esto no estorba.
  try {
    const files = fs.readdirSync('reports')
      .filter(f => f.startsWith('spectral-analysis-') && f.endsWith('.json'))
      .sort()
      .reverse(); // último
    if (files[0]) {
      const src = path.join('reports', files[0]);
      const dst = path.join('reports', 'ran', r.code, files[0]);
      if (fs.existsSync(src)) {
        fs.renameSync(src, dst);
        console.log(`[MOVE] ${files[0]} → reports/ran/${r.code}/${files[0]}`);
      }
    }
  } catch (_) {}
}

console.log('\nHecho.');
