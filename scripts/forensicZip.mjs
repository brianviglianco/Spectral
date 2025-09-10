#!/usr/bin/env node
// Thin launcher that calls src/tools/forensicZip.mjs CLI.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const target = path.join(__dirname, '../src/tools/forensicZip.mjs');

const args = [target, ...process.argv.slice(2)];
const res = spawnSync(process.execPath, args, { stdio: 'inherit' });
process.exit(res.status ?? 0);
