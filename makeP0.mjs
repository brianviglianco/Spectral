#!/usr/bin/env node
// makeP0.mjs — builds .p0.json from a .norm.json with correct per-stage counts
// Usage:
//   node makeP0.mjs reports/spectral-analysis-<host>-<ts>.norm.json
// Output:
//   <file>.norm.json.p0.json

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';

// Helper functions
function n(v){ 
  return Number.isFinite(v) ? v : 0; 
}

function kstage(s){ 
  return String(s?.stage || '').toLowerCase(); 
}

function isFile(p){
  try { 
    return existsSync(p) && statSync(p).isFile(); 
  } catch(e) { 
    return false; 
  }
}

function isDir(p){
  try { 
    return existsSync(p) && statSync(p).isDirectory(); 
  } catch(e) { 
    return false; 
  }
}

function loadJSON(fp){
  try {
    return JSON.parse(readFileSync(fp, 'utf8'));
  } catch(e) {
    console.error(`[makeP0] Error loading ${fp}:`, e.message);
    return null;
  }
}

function outPath(fp){
  return fp + '.p0.json';
}

// Count cookies from stage data
function cookiesCount(stage){
  // Primary source: cookieBreakdown.all array
  const breakdown = stage?.cookieBreakdown;
  
  if (breakdown?.all && Array.isArray(breakdown.all)) {
    return breakdown.all.length;
  }
  
  // Fallback to sum of categories
  if (breakdown) {
    const total = n(breakdown.tracking) + n(breakdown.consent) + n(breakdown.unknown);
    if (total > 0) return total;
  }
  
  // Legacy fallbacks
  if (Array.isArray(stage?.cookies)) return stage.cookies.length;
  if (typeof stage?.cookies === 'number') return stage.cookies;
  
  // Check networkEvidence
  if (stage?.networkEvidence?.cookieBreakdown?.all) {
    return stage.networkEvidence.cookieBreakdown.all.length;
  }
  
  return 0;
}

// Count third-party scripts
function thirdCount(stage){
  // Try multiple possible locations
  return n(
    stage?.thirdPartyScripts ?? 
    stage?.thirdPartyScriptsCount ?? 
    stage?.scriptAnalysis?.statistics?.thirdParty ??
    stage?.['3pScripts'] ?? 
    0
  );
}

// Count tracking hits
function hitsCount(stage){
  // Check if trackingHits is a number or array
  if (typeof stage?.trackingHits === 'number') {
    return stage.trackingHits;
  }
  if (Array.isArray(stage?.trackingHits)) {
    return stage.trackingHits.length;
  }
  
  // Check networkEvidence
  if (Array.isArray(stage?.networkEvidence?.trackingHits)) {
    return stage.networkEvidence.trackingHits.length;
  }
  
  return 0;
}

// Convert norm.json to p0.json format
function toP0(norm){
  if (!norm) return null;
  
  const domain = norm.domain || norm.host || norm.site || norm.siteHost || '(unknown)';
  const cmpDetected = !!norm.cmpDetected;
  const cmpProvider = norm.cmpProvider || 'None';
  const ts = norm.ts || norm.timestamp || norm.createdAt || norm.created_at || new Date().toISOString();
  
  // verifyP0.mjs expects these exact fields
  const out = {
    version: 'p0.v1',
    url: norm.url || null,
    domain: domain,
    ts: ts,
    cmpDetected: cmpDetected,
    cmpProvider: cmpProvider,
    stages: [],
    runId: norm.runId || norm.run_id || null
  };

  const stages = Array.isArray(norm.stages) ? norm.stages : [];
  
  for (const s of stages){
    const stageName = kstage(s);
    const st = {
      stage: stageName,
      hits: hitsCount(s),
      trackingHits: hitsCount(s),
      cookies: cookiesCount(s),
      thirdPartyScripts: thirdCount(s)
    };
    out.stages.push(st);
  }
  
  return out;
}

// Process a single file
function processFile(fp){
  if(!/\.norm\.json$/i.test(fp)) {
    console.log(`[makeP0] Skipping non-norm file: ${basename(fp)}`);
    return;
  }
  
  const j = loadJSON(fp);
  if (!j) {
    console.error(`[makeP0] Failed to load: ${fp}`);
    return;
  }
  
  const p0 = toP0(j);
  if (!p0) {
    console.error(`[makeP0] Failed to convert: ${fp}`);
    return;
  }
  
  const out = outPath(fp);
  writeFileSync(out, JSON.stringify(p0, null, 2));
  
  // Output with metrics
  console.log(`\n[makeP0] -> ${basename(out)}`);
  console.log(`[makeP0] CMP: ${p0.cmpProvider} (${p0.cmpDetected ? 'Detected' : 'Not detected'})`);
  console.log(`[makeP0] Domain: ${p0.domain}`);
  console.log('');
  
  // Display metrics for each stage
  console.log('   Stage        Hits Cookies  3P');
  console.log('   ------------ ---- ------- ----');
  for(const s of p0.stages){
    console.log(`   ${s.stage.padEnd(12)} ${String(s.hits).padStart(4)} ${String(s.cookies).padStart(7)} ${String(s.thirdPartyScripts).padStart(4)}`);
  }
  
  // Calculate and show deltas
  console.log('');
  const baseline = p0.stages.find(s => s.stage === 'baseline');
  const reject = p0.stages.find(s => s.stage === 'reject');
  const accept = p0.stages.find(s => s.stage === 'accept');
  
  if (baseline && accept) {
    const trackingDelta = accept.hits - baseline.hits;
    const cookieDelta = accept.cookies - baseline.cookies;
    const scriptDelta = accept.thirdPartyScripts - baseline.thirdPartyScripts;
    console.log(`[makeP0] Accept vs Baseline:`);
    console.log(`         Tracking: ${trackingDelta >= 0 ? '+' : ''}${trackingDelta} hits`);
    console.log(`         Cookies: ${cookieDelta >= 0 ? '+' : ''}${cookieDelta}`);
    console.log(`         3P Scripts: ${scriptDelta >= 0 ? '+' : ''}${scriptDelta}`);
  }
  
  if (reject && accept) {
    const rejectVsAccept = accept.hits - reject.hits;
    if (rejectVsAccept > 0) {
      console.log(`\n[makeP0] ⚠️  GDPR Issue: ${rejectVsAccept} tracking hits after accept vs reject`);
    }
  }
  
  if (baseline && baseline.hits > 0) {
    console.log(`\n[makeP0] ⚠️  GDPR Issue: ${baseline.hits} tracking hits before consent`);
  }
  
  console.log(`\n[makeP0] Complete.`);
}

// Main execution
const args = process.argv.slice(2);
if(args.length === 0){ 
  console.error('Usage: node makeP0.mjs <file.norm.json> [more files...]');
  console.error('       node makeP0.mjs reports/  (process directory)');
  process.exit(1); 
}

for(const a of args){
  if(isFile(a)) {
    processFile(a);
  } else if(isDir(a)) {
    console.log(`[makeP0] Processing directory: ${a}`);
    const files = readdirSync(a).filter(f => f.endsWith('.norm.json'));
    console.log(`[makeP0] Found ${files.length} norm.json files`);
    for(const f of files) {
      processFile(join(a, f));
    }
  } else {
    console.error('[makeP0] Not found:', a);
  }
}