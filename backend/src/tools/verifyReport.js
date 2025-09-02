#!/usr/bin/env node
/**
 * SPECTRAL – Report Verifier
 * Recomputes counts and violations from a saved JSON report.
 * Input: path to JSON saved by testCrawler/professionalAnalysis ({ evidence, report }).
 *
 * Usage:
 *   node src/tools/verifyReport.js reports/spectral-analysis-*.json
 *
 * This tool does NOT re-crawl. It only verifies persisted evidence.
 */

const fs = require('fs');
const path = require('path');

const PRE_STAGES = new Set(['baseline','reject_pre','accept_pre']);
const STAGES = ['baseline','reject_pre','reject','accept_pre','accept'];

function load(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw);
}

// Robust stage normalization (matches violationEngine behavior) :contentReference[oaicite:3]{index=3}
function normalizeStages(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (Array.isArray(input.stages)) return input.stages;
  if (input.detailedResults && Array.isArray(input.detailedResults.stages)) return input.detailedResults.stages;
  return [];
}

function count(arr, key) {
  return arr.reduce((n, s) => n + ((s.networkEvidence?.[key] || []).length), 0);
}

function pick(stages, name) {
  return stages.find(s => s.stage === name) || {};
}

function fmt(n) {
  if (!Number.isFinite(n)) return String(n);
  return n.toFixed(2).replace(/\.00$/, '');
}

function summarizeStage(s) {
  const ne = s.networkEvidence || {};
  return {
    requests: ne.totals?.requests ?? (ne.harLite?.entries?.length ?? 0),
    trackingHits: (ne.trackingHits || []).length,
    setCookies: (ne.setCookies || []).length,
    ls: (s.storage?.localStorageKeys || []).length,
    ss: (s.storage?.sessionStorageKeys || []).length
  };
}

function listTopTrackingUrls(s, limit = 10) {
  return (s.networkEvidence?.trackingHits || [])
    .slice(0, limit)
    .map(e => e.url)
    .filter(Boolean);
}

function verify(evidence, existingReport) {
  const stages = normalizeStages(evidence);
  if (!stages.length) {
    return { ok: false, error: 'no-stages-in-evidence' };
  }

  // Stage-by-stage summary
  const stageStats = {};
  for (const name of STAGES) {
    stageStats[name] = summarizeStage(pick(stages, name));
  }

  // Pre-consent signals (EU-C-001) :contentReference[oaicite:4]{index=4}
  const preStages = stages.filter(s => PRE_STAGES.has(s.stage));
  const preHits = count(preStages, 'trackingHits');
  const preCookies = count(preStages, 'setCookies');

  // Post-choice comparison (EU-C-011) :contentReference[oaicite:5]{index=5}
  const rej = pick(stages, 'reject');
  const acc = pick(stages, 'accept');
  const rejHits = (rej.networkEvidence?.trackingHits || []).length;
  const rejCookies = (rej.networkEvidence?.setCookies || []).length;
  const accHits = (acc.networkEvidence?.trackingHits || []).length;
  const accCookies = (acc.networkEvidence?.setCookies || []).length;

  const wHits = 1.0, wCookies = 1.0;
  const rejCombined = wHits * rejHits + wCookies * rejCookies;
  const accCombined = wHits * accHits + wCookies * accCookies;

  let ratio = Number.POSITIVE_INFINITY;
  if (accCombined > 0) ratio = rejCombined / accCombined;

  const hasEU_C_001 = preHits > 0 || preCookies > 0;
  const hasEU_C_011 = (rejCombined > 0 && accCombined === 0) || (accCombined > 0 && ratio >= 0.8);

  // Recompute score/risk using the same deductions :contentReference[oaicite:6]{index=6}
  let score = 100;
  if (hasEU_C_001) score -= 35;
  if (hasEU_C_011) score -= 30;
  if (score < 0) score = 0;
  let risk = 'LOW';
  if (score < 40) risk = 'CRITICAL';
  else if (score < 70) risk = 'HIGH';
  else if (score < 90) risk = 'MEDIUM';

  // Compare with embedded report if present (from professionalAnalysis/testCrawler) :contentReference[oaicite:7]{index=7} :contentReference[oaicite:8]{index=8}
  const rep = existingReport || {};
  const compare = {
    score: { saved: rep.score ?? rep.report?.score, recomputed: score },
    risk: { saved: rep.risk ?? rep.report?.risk, recomputed: risk },
    hasEU_C_001: {
      saved: Array.isArray(rep.violations) ? rep.violations.some(v => v.code === 'EU-C-001') : rep.report?.violations?.some(v => v.code === 'EU-C-001'),
      recomputed: hasEU_C_001
    },
    hasEU_C_011: {
      saved: Array.isArray(rep.violations) ? rep.violations.some(v => v.code === 'EU-C-011') : rep.report?.violations?.some(v => v.code === 'EU-C-011'),
      recomputed: hasEU_C_011
    }
  };

  return {
    ok: true,
    stageStats,
    pre: { hits: preHits, cookies: preCookies },
    reject: { hits: rejHits, cookies: rejCookies, combined: rejCombined },
    accept: { hits: accHits, cookies: accCookies, combined: accCombined },
    ratio: Number.isFinite(ratio) ? Number(fmt(ratio)) : 'inf',
    violations: {
      'EU-C-001': hasEU_C_001,
      'EU-C-011': hasEU_C_011
    },
    score, risk,
    compare,
    samples: {
      baselineTopTracking: listTopTrackingUrls(pick(stages, 'baseline')),
      rejectTopTracking: listTopTrackingUrls(pick(stages, 'reject')),
      acceptTopTracking: listTopTrackingUrls(pick(stages, 'accept'))
    }
  };
}

function print(result) {
  if (!result.ok) {
    console.error(`❌ Verify failed: ${result.error}`);
    process.exit(2);
  }

  console.log('==============================');
  console.log('🔎 SPECTRAL REPORT VERIFICATION');
  console.log('==============================\n');

  console.log('Stage metrics:');
  for (const [k,v] of Object.entries(result.stageStats)) {
    console.log(` - ${k.padEnd(10)} requests=${v.requests} trackingHits=${v.trackingHits} setCookies=${v.setCookies} ls=${v.ls} ss=${v.ss}`);
  }

  console.log('\nPre-consent totals:');
  console.log(` - trackingHits=${result.pre.hits} setCookies=${result.pre.cookies}`);

  console.log('\nPost-choice:');
  console.log(` - reject: hits=${result.reject.hits} cookies=${result.reject.cookies} combined=${result.reject.combined}`);
  console.log(` - accept: hits=${result.accept.hits} cookies=${result.accept.cookies} combined=${result.accept.combined}`);
  console.log(` - ratio(rej/acc)=${result.ratio}`);

  console.log('\nViolations:');
  for (const [code, val] of Object.entries(result.violations)) {
    console.log(` - ${code}: ${val ? 'YES' : 'NO'}`);
  }

  console.log('\nScore/Risk:');
  console.log(` - score=${result.score}% risk=${result.risk}`);

  console.log('\nSaved vs Recomputed (if saved present):');
  console.log(` - score: saved=${result.compare.score.saved ?? 'n/a'} vs recomputed=${result.compare.score.recomputed}`);
  console.log(` - risk : saved=${result.compare.risk.saved ?? 'n/a'} vs recomputed=${result.compare.risk.recomputed}`);
  console.log(` - EU-C-001: saved=${result.compare.hasEU_C_001.saved ?? 'n/a'} vs recomputed=${result.compare.hasEU_C_001.recomputed}`);
  console.log(` - EU-C-011: saved=${result.compare.hasEU_C_011.saved ?? 'n/a'} vs recomputed=${result.compare.hasEU_C_011.recomputed}`);

  const s = result.samples;
  const show = (arr) => (arr && arr.length) ? arr.slice(0,5).join('\n   • ') : '(none)';
  console.log('\nTop tracking URLs:');
  console.log(` - baseline:\n   • ${show(s.baselineTopTracking)}`);
  console.log(` - reject:\n   • ${show(s.rejectTopTracking)}`);
  console.log(` - accept:\n   • ${show(s.acceptTopTracking)}`);
}

(function cli(){
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node src/tools/verifyReport.js <path-to-report.json>');
    process.exit(1);
  }
  const abs = path.resolve(file);
  const json = load(abs);
  const evidence = json.evidence || json; // support {evidence, report} or raw evidence
  const existingReport = json.report || json.detailedResults?.report || null;
  const result = verify(evidence, existingReport);
  print(result);
})();
