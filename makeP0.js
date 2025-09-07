// ESM
import fs from 'node:fs';
import path from 'node:path';

const REPORTS_DIR = path.resolve('reports');

// Normaliza SOLO:
//   a) *.json   → *.json.p0.json
// (ignora cualquier archivo que ya tenga .p0.json en cualquier parte)
function isBaseJson(f) {
  return f.endsWith('.json') && !f.includes('.p0.json');
}

function normalizeOne(absFile) {
  const out = absFile + '.p0.json';
  if (fs.existsSync(out)) return { out, skipped: true };
  const raw = fs.readFileSync(absFile, 'utf8');
  fs.writeFileSync(out, raw);
  return { out, skipped: false };
}

function repairOrphans() {
  const files = fs.readdirSync(REPORTS_DIR)
    .filter(isBaseJson)
    .map(f => path.join(REPORTS_DIR, f));

  let created = 0, skipped = 0;
  for (const f of files) {
    const { skipped: s } = normalizeOne(f);
    s ? skipped++ : created++;
  }

  console.log('P0 NORMALIZATION SUMMARY');
  console.log('========================');
  console.log(`inputs=${files.length} created=${created} skipped=${skipped}`);
}

if (process.argv.includes('--repair')) {
  repairOrphans();
} else {
  repairOrphans();
}