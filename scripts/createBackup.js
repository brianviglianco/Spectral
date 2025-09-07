#!/usr/bin/env node
// scripts/createBackup.js (ESM)
// Creates a git backup commit + timestamped tag and pushes with tags.

import { spawnSync } from 'node:child_process';

function sh(cmd, args, opts = {}) {
  console.log(`[backup] $ ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.status !== 0) {
    console.error(`[backup] ERROR running: ${cmd} ${args.join(' ')}`);
    process.exit(res.status ?? 1);
  }
}

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes())
  );
}

(function main() {
  const tag = `backup-${ts()}`;

  // Ensure git repo
  sh('git', ['rev-parse', '--is-inside-work-tree']);

  // Stage all
  sh('git', ['add', '-A']);

  // Commit (allow empty to always create a snapshot)
  sh('git', ['commit', '--allow-empty', '-m', `Backup before ${tag}`]);

  // Tag
  sh('git', ['tag', tag]);

  // Push
  sh('git', ['push', 'origin', 'HEAD']);
  sh('git', ['push', 'origin', '--tags']);

  console.log(`[backup] DONE tag=${tag}`);
})();
