#!/usr/bin/env node
// scripts/createBackup.js (ESM)
import { execSync } from 'node:child_process';

function sh(cmd) {
  console.log(`[backup] $ ${cmd}`);
  return execSync(cmd, { stdio: 'pipe' }).toString().trim();
}

try {
  const inside = sh('git rev-parse --is-inside-work-tree');
  if (inside !== 'true') throw new Error('not a git repo');
  sh('git add -A');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0,19);
  const tag = `backup-${ts.replace('T','-').replace(/-/g,'').slice(0,15)}`;
  sh(`git commit --allow-empty -m "Backup before ${tag}"`);
  sh('git push origin HEAD');
  sh(`git tag ${tag}`);
  sh('git push origin --tags');
  console.log(`[backup] DONE tag=${tag}`);
} catch (e) {
  console.error('[backup] ERROR', e.message);
  process.exit(1);
}
