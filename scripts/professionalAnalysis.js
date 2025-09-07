#!/usr/bin/env node
// scripts/professionalAnalysis.js
// Wrapper: reenvía al ejecutable real en src/crawler con los mismos argumentos.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta del script real
const target = path.join(__dirname, '../src/crawler/professionalAnalysis.js');

// Reenvía argumentos tal cual
const args = [target, ...process.argv.slice(2)];

// Ejecuta Node sobre el script real
const res = spawnSync(process.execPath, args, { stdio: 'inherit' });

// Propaga el código de salida
process.exit(res.status ?? 0);
