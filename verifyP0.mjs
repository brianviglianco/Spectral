#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(process.cwd(), 'reports');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.norm.json.p0.json')) : [];

let ok = 0, bad = 0;
for (const f of files) {
  const p = path.join(dir, f);
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const hasStages = Array.isArray(j.stages) && j.stages.length > 0;
    const hasDomain = !!j.domain;
    if (hasStages && hasDomain) ok++; else bad++;
  } catch { bad++; }
}

console.log('P0 VERIFY SUMMARY');
console.log('==================');
console.log(`checked=${files.length} ok=${ok} bad=${bad}`);
process.exit(bad ? 1 : 0);
