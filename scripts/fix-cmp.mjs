#!/usr/bin/env node
/**
 * scripts/fix-cmp.js
 * Re-etiqueta cmpDetected/cmpProvider en *.norm.json usando el RAW vecino (*.json).
 * Solo marca OneTrust si hay evidencia FUERTE en el RAW (evita falsos positivos por el string "OneTrust").
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = process.cwd();
const targetDir = path.resolve(root, process.argv[2] || "reports");

// ---------- heurísticas ----------
const STRONG_PATTERNS = [
  /cdn\.cookielaw\.org/i,                      // estático/recursos OT
  /privacyportal\.onetrust\.com/i,             // APIs OT
  /\bOptanon\b/i,                               // marca histórica de OT
  /otSDK/i,                                     // SDK de OT
  /cookiepro\.com/i,                            // CookiePro (OT)
  /id=["']onetrust[-_][a-z0-9_-]+/i,            // nodos DOM típicos: #onetrust-xxx
  /class=["'][^"']*\bot[-_][a-z0-9_-]+/i        // clases ot-*
];

const WEAK_PATTERNS = [
  /\bonetrust\b/i,                              // texto suelto "OneTrust" (débil)
];

function loadJson(fp) {
  try { return JSON.parse(fs.readFileSync(fp, "utf8")); }
  catch { return null; }
}

function rawPathFor(normPath) {
  // …/X.norm.json -> …/X.json  (no toca p0 extras)
  if (!normPath.endsWith(".norm.json")) return null;
  const raw = normPath.replace(/\.norm\.json$/, ".json");
  return fs.existsSync(raw) ? raw : null;
}

function stringifyRaw(rawObj) {
  // compactamos grandes campos donde suelen estar huellas
  if (!rawObj) return "";
  const buckets = [];
  // intenta cubrir: html, recursos, network, scripts, rawText
  const keys = [
    "html", "htmlHead", "htmlBody",
    "resources", "scripts", "requests", "network", "console",
    "raw", "rawText", "content", "pageHTML", "pageSource"
  ];
  for (const k of keys) {
    if (rawObj[k]) {
      try { buckets.push(JSON.stringify(rawObj[k])); } catch {}
    }
  }
  // fallback: todo el objeto
  if (!buckets.length) {
    try { buckets.push(JSON.stringify(rawObj)); } catch {}
  }
  return buckets.join("\n");
}

function hasStrongOneTrustEvidence(text) {
  return STRONG_PATTERNS.some(rx => rx.test(text));
}

function hasWeakOneTrustEvidence(text) {
  return WEAK_PATTERNS.some(rx => rx.test(text));
}

function inferOneTrust(rawObj) {
  const text = stringifyRaw(rawObj);

  // Regla: marcar OneTrust SOLO si:
  //  - hay AL MENOS un patrón fuerte, o
  //  - hay “OneTrust” (débil) Y además otro indicio técnico (otSDK/Optanon/etc.)
  if (hasStrongOneTrustEvidence(text)) return true;

  const weak = hasWeakOneTrustEvidence(text);
  const anyTech = /otSDK|Optanon|cdn\.cookielaw\.org|cookiepro\.com|privacyportal\.onetrust\.com|id=["']onetrust-|class=["'][^"']*\bot-/i.test(text);
  return weak && anyTech;
}

function fixOne(normPath) {
  const rawPath = rawPathFor(normPath);
  if (!rawPath) return { updated:false, reason:"no-raw" };

  const norm = loadJson(normPath) ?? {};
  const raw  = loadJson(rawPath);

  // reseteo por defecto
  norm.cmpDetected = false;
  norm.cmpProvider = "None";

  if (inferOneTrust(raw)) {
    norm.cmpDetected = true;
    norm.cmpProvider = "OneTrust";
  }

  // asegurar domain si falta
  if (!norm.domain && raw && raw.domain) {
    norm.domain = raw.domain;
  }

  fs.writeFileSync(normPath, JSON.stringify(norm, null, 2));
  return { updated:true, provider:norm.cmpProvider, detected:norm.cmpDetected };
}

function run(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith(".norm.json"))
    .map(f => path.join(dir, f));

  // incluir recursivo: también subcarpetas (forensic/*)
  const stack = [dir];
  const allNorm = [];
  while (stack.length) {
    const d = stack.pop();
    for (const entry of fs.readdirSync(d, { withFileTypes:true })) {
      const fp = path.join(d, entry.name);
      if (entry.isDirectory()) stack.push(fp);
      else if (entry.isFile() && fp.endsWith(".norm.json")) allNorm.push(fp);
    }
  }

  let updated=0, skipped=0;
  for (const f of allNorm) {
    const res = fixOne(f);
    if (res.updated) {
      updated++;
      console.log(`[fix-cmp] ${res.detected ? "OneTrust" : "None"} -> ${f}`);
    } else {
      skipped++;
    }
  }
  console.log(`\nFIX-CMP SUMMARY\n===============\nupdated=${updated} skipped=${skipped}`);
}

run(targetDir);
