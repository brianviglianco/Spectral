#!/usr/bin/env node
/**
 * manifest-tools.js
 *
 * Simple helper for verifying and indexing SPECTRAL forensic ZIPs.
 *
 * Usage:
 *   node scripts/manifest-tools.js verify reports/forensic
 *   node scripts/manifest-tools.js index reports/forensic
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import AdmZip from "adm-zip";

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function verify(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".zip"));
  let mismatches = 0;
  for (const f of files) {
    const zipPath = path.join(dir, f);
    const zip = new AdmZip(zipPath);
    const entry = zip.getEntry("MANIFEST.json");
    if (!entry) {
      console.error(`[MISSING] MANIFEST.json in ${f}`);
      mismatches++;
      continue;
    }
    const manifest = JSON.parse(zip.readAsText(entry));
    const integrity = manifest.integrity?.files || [];
    for (const file of integrity) {
      try {
        const entry = zip.getEntry(file.path);
        if (!entry) {
          console.error(`[MISSING] ${file.path} in ${f}`);
          mismatches++;
          continue;
        }
        const tmp = path.join("/tmp", file.path.replace(/\//g, "_"));
        fs.writeFileSync(tmp, zip.readFile(entry));
        const calc = sha256File(tmp);
        if (calc !== file.sha256) {
          console.error(`[MISMATCH] ${f}:${file.path}`);
          mismatches++;
        }
      } catch (err) {
        console.error(`[ERROR] ${f}:${file.path} ${err}`);
        mismatches++;
      }
    }
  }
  console.log(`Verification done. mismatches=${mismatches} files=${files.length}`);
  process.exit(mismatches > 0 ? 1 : 0);
}

function index(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".zip"));
  const rows = [["url", "score", "risk", "generatedAt", "zip"]];
  for (const f of files) {
    const zipPath = path.join(dir, f);
    const zip = new AdmZip(zipPath);
    const entry = zip.getEntry("MANIFEST.json");
    if (!entry) continue;
    const manifest = JSON.parse(zip.readAsText(entry));
    const url = manifest?.meta?.url || "";
    const score = manifest?.p0?.score ?? "";
    const risk = manifest?.p0?.risk ?? "";
    const ts = manifest?.meta?.generatedAt || "";
    rows.push([url, score, risk, ts, f]);
  }
  const csv = rows.map(r => r.join(",")).join("\n");
  const outDir = path.join(dir, "_index");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.csv"), csv);
  console.log(`Index written to ${outDir}/index.csv`);
}

const [,, cmd, targetDir] = process.argv;
if (!cmd || !targetDir) {
  console.error("Usage: manifest-tools.js <verify|index> <dir>");
  process.exit(1);
}

if (cmd === "verify") verify(targetDir);
else if (cmd === "index") index(targetDir);
else {
  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}
