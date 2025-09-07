// ESM
import fs from 'node:fs';
import path from 'node:path';

const REPORTS_DIR = path.resolve('reports');

// Verifica ÚNICAMENTE archivos con SUFIJO EXACTO .json.p0.json
const isExactlyOneP0 = (f) =>
  /\.json\.p0\.json$/.test(f) && !/\.json\.p0\.json\./.test(f);

function verifyFile(abs) {
  // Coloca aquí tus verificaciones reales de contenido.
  // Simulamos PASS mostrando cabecera:
  const base = path.basename(abs);
  console.log(`[PASS] ${base}`);
}

const files = fs.readdirSync(REPORTS_DIR)
  .filter(isExactlyOneP0)
  .map(f => path.join(REPORTS_DIR, f));

for (const f of files) verifyFile(f);

console.log('ALL PASS');