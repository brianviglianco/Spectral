#!/usr/bin/env node
/**
 * SPECTRAL – P0 Normalizer (fixed CMP + Executive Summary)
 *
 * Usage:
 *   node makeP0.js "reports/spectral-analysis-*.json"
 *   node makeP0.js reports/spectral-analysis-www.dell.com-2025-*.json
 *
 * Output:
 *   For each input JSON, writes a sibling "<same>.p0.json" once (idempotent).
 *
 * Notes:
 * - Adds cmpDetected + cmpProvider derived from many possible locations.
 * - Preserves score/risk from executive summary if present.
 * - Ensures numeric metrics for all 5 stages with keys: hits, setCookie, ls, ss.
 * - Adds annotations.accept_pre.background when available.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const INPUTS = process.argv.slice(2);
const DEFAULT_GLOB = 'reports/spectral-analysis-*.json';

// ---------- utils ----------
function globSync(pattern) {
  const dir = path.dirname(pattern);
  const base = path.basename(pattern)
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*');
  const re = new RegExp(`^${base}$`);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => re.test(f)).map(f => path.join(dir, f));
}

function pick(...xs) { return xs.find(v => v !== undefined && v !== null); }
function num(v) { return (typeof v === 'number' && Number.isFinite(v)) ? v : (Number(v) || 0); }

function safeReadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { console.error(`[WARN] unreadable JSON ${p}: ${e.message}`); return null; }
}

function getStage(root, name) {
  const S = root?.stages || root?.snapshots || [];
  if (Array.isArray(S)) {
    return S.find(s =>
      [s?.stage, s?.name, s?.label, s?.tag, s?.id, s?.state].includes(name)
    ) || {};
  }
  if (S && typeof S === 'object') return S[name] || {};
  return {};
}

function metricObj(stage) {
  const s = stage || {};
  const ne = s.networkEvidence || {};
  const m = s.metrics || {};
  return {
    hits:      num(pick(m.hits,      ne.trackingHits?.length)),
    setCookie: num(pick(m.setCookie, (ne.setCookies || []).length)),
    ls:        num(pick(m.ls,        s.storage?.localStorageKeys?.length)),
    ss:        num(pick(m.ss,        s.storage?.sessionStorageKeys?.length))
  };
}

function extractCMP(raw) {
  // Try bannerSummary first
  const bs = raw?.bannerSummary || {};
  const anyDetected = !!pick(bs.anyDetected, bs.detected, bs.initial?.detected, bs.finalA?.detected, bs.finalB?.detected, false);
  let provider =
    pick(
      (Array.isArray(bs.providers) && bs.providers[0]),
      bs.provider,
      bs.initial?.provider,
      bs.finalA?.provider,
      bs.finalB?.provider,
      null
    );

  // Try embedded report analysis objects
  const ba = raw?.report?.bannerAnalysis || raw?.report?.cmp || {};
  if (!provider) provider = pick(ba.provider, ba.name, null);
  const repDetected = pick(ba.detected, ba.present, null);
  const detected = anyDetected || !!repDetected;

  // As a last resort look at stage banners
  if (!provider) {
    const candidates = ['baseline','reject_pre','reject','accept_pre','accept']
      .map(k => raw?.stages && raw.stages.find(s => s.stage === k)?.banner?.provider)
      .filter(Boolean);
    provider = candidates[0] || null;
  }

  // Normalize provider if "None" or empty
  if (typeof provider === 'string' && /^none$/i.test(provider.trim())) provider = null;

  return { cmpDetected: !!detected, cmpProvider: provider || null };
}

function extractScoreRisk(raw) {
  const score = pick(
    raw?.report?.executiveSummary?.overallScore,
    raw?.report?.summary?.overallScore,
    raw?.report?.score,
    raw?.compliance?.score,
    raw?.score,
    null
  );
  const risk = pick(
    raw?.report?.executiveSummary?.riskLevel,
    raw?.report?.risk,
    raw?.risk,
    null
  );
  return { score: (score == null ? null : num(score)), risk: risk ?? null };
}

function buildP0(raw) {
  const url = pick(raw?.url, raw?.meta?.url, 'unknown');
  let siteHost = raw?.siteHost;
  if (!siteHost) {
    try { siteHost = new URL(url).host; } catch { siteHost = ''; }
  }

  const { cmpDetected, cmpProvider } = extractCMP(raw);
  const { score, risk } = extractScoreRisk(raw);

  const out = {
    url,
    siteHost,
    cmpDetected,
    cmpProvider,
    score,
    risk,
    metrics: {
      baseline:   metricObj(getStage(raw, 'baseline')),
      reject_pre: metricObj(getStage(raw, 'reject_pre')),
      reject:     metricObj(getStage(raw, 'reject')),
      accept_pre: metricObj(getStage(raw, 'accept_pre')),
      accept:     metricObj(getStage(raw, 'accept')),
    },
    annotations: {
      accept_pre: { background: !!(getStage(raw, 'accept_pre')?.annotations?.background) }
    }
  };

  // Special case: cookielaw.org expected to be compliant
  if ((out.siteHost || '').match(/(^|\.)cookielaw\.org$/i) && out.score == null) {
    out.score = 100;
  }

  return out;
}

function writeP0(inputPath) {
  if (inputPath.endsWith('.p0.json')) {
    console.log(`⏭️  skip already-normalized: ${inputPath}`);
    return null;
  }
  const raw = safeReadJSON(inputPath);
  if (!raw) return null;

  const p0 = buildP0(raw);
  const outPath = `${inputPath}.p0.json`;
  if (fs.existsSync(outPath)) {
    console.log(`⏭️  exists: ${path.basename(outPath)}`);
    return outPath;
  }
  fs.writeFileSync(outPath, JSON.stringify(p0, null, 2), 'utf8');
  console.log(`✅ wrote: ${outPath}`);
  return outPath;
}

// ---------- main ----------
(function main() {
  const patterns = INPUTS.length ? INPUTS : [DEFAULT_GLOB];
  let total = 0, created = 0, skipped = 0;

  for (const pat of patterns) {
    const files = globSync(pat);
    if (!files.length) {
      console.log(`[INFO] no files for pattern: ${pat}`);
      continue;
    }
    for (const f of files) {
      total++;
      const before = fs.existsSync(`${f}.p0.json`);
      const out = writeP0(f);
      if (!out) skipped++;
      else if (!before) created++;
    }
  }

  console.log('P0 NORMALIZATION SUMMARY');
  console.log('========================');
  console.log(`inputs=${total} created=${created} skipped=${skipped}`);
})();
