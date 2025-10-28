#!/usr/bin/env node
// verifyP0.mjs - ONETRUST-AWARE VALIDATION
// Usage:
//   node verifyP0.mjs <dir|files...> [--strict]
// Examples:
//   node verifyP0.mjs reports --strict
//   node verifyP0.mjs reports/spectral-analysis-*.p0.json --strict

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const inputs = args.filter(a => a !== '--strict');

if (!inputs.length) {
  console.error('Usage: node verifyP0.mjs <dir|files...> [--strict]');
  process.exit(1);
}

function expand(paths) {
  const out = [];
  for (const p of paths) {
    if (!statSync(p, { throwIfNoEntry: false })) continue;
    if (statSync(p).isDirectory()) {
      const subs = readdirSync(p);
      for (const s of subs) {
        if (s.endsWith('.p0.json')) out.push(join(p, s));
      }
    } else {
      out.push(p);
    }
  }
  return out;
}

function kstage(s) {
  return typeof s === 'string' ? s : s?.stage || '';
}

function basicCheck(p0) {
  const errs = [];
  if (!p0) return ['cannot parse'];
  if (!p0.url) errs.push('url missing');
  if (!p0.domain) errs.push('domain missing');
  if (!p0.ts) errs.push('ts missing');
  if (typeof p0.cmpDetected !== 'boolean') errs.push('cmpDetected missing or not boolean');
  if (!p0.cmpProvider) errs.push('cmpProvider missing');
  
  // ONETRUST-AWARE: Stage requirements depend on CMP
  const cmpProvider = p0.cmpProvider || 'None';
  const isOneTrust = cmpProvider === 'OneTrust';
  
  if (!Array.isArray(p0?.stages)) errs.push('stages missing or not array');
  
  // Build stage map
  const by = Object.fromEntries((p0?.stages || []).map(s => [kstage(s), s]));
  
  // Baseline always required
  if (!by.baseline) errs.push('missing stage baseline');
  
  // If OneTrust, require all 5 stages
  if (isOneTrust) {
    const req = ['baseline','reject_pre','reject','accept_pre','accept'];
    for (const st of req) {
      if (!by[st]) errs.push(`missing stage ${st}`);
    }
  } else {
    // Non-OneTrust: baseline is sufficient, but warn if more expected
    if (p0.stages.length > 1) {
      errs.push(`⚠️  Warning: CMP ${cmpProvider} not supported, expected 1 stage but found ${p0.stages.length}`);
    }
  }
  
  return errs;
}

function strictCheck(p0Path) {
  const errs = [];
  // FIX: Handle .norm.json.p0.json filename correctly
  const normPath = p0Path.replace(/\.norm\.json\.p0\.json$/i, '.norm.json');
  
  try {
    const norm = JSON.parse(readFileSync(normPath, 'utf8'));
    const p0 = JSON.parse(readFileSync(p0Path, 'utf8'));
    
    // Check CMP consistency
    const cmpProvider = p0.cmpProvider || norm.cmpProvider || 'None';
    const isOneTrust = cmpProvider === 'OneTrust';
    
    // Build stage maps
    const byN = Object.fromEntries((norm?.stages || []).map(s => [kstage(s), s]));
    const byP = Object.fromEntries((p0?.stages || []).map(s => [kstage(s), s]));
    
    // Baseline always required
    if (!byN.baseline) errs.push('NORM missing stage baseline');
    
    // If OneTrust, all stages required
    if (isOneTrust) {
      const req = ['baseline','reject_pre','reject','accept_pre','accept'];
      for (const st of req) {
        if (!byN[st]) errs.push(`NORM missing stage ${st}`);
        if (!byP[st]) errs.push(`P0 missing stage ${st}`);
      }
      
      // Verify metrics consistency for all stages
      for (const st of req) {
        const nStage = byN[st];
        const pStage = byP[st];
        
        if (!nStage || !pStage) continue;
        
        const nHits = nStage.networkEvidence?.trackingHits?.length || 0;
        const pHits = pStage.hits || 0;
        const nCookies = nStage.cookieBreakdown?.all?.length || 0;
        const pCookies = pStage.cookies || 0;
        
        if (Math.abs(nHits - pHits) > 0) {
          errs.push(`NORM ${st}.hits=${nHits} != P0 ${st}.hits=${pHits}`);
        }
        if (Math.abs(nCookies - pCookies) > 0) {
          errs.push(`NORM ${st}.cookies=${nCookies} != P0 ${st}.cookies=${pCookies}`);
        }
      }
    } else {
      // Non-OneTrust: verify baseline only
      const nStage = byN.baseline;
      const pStage = byP.baseline;
      
      if (nStage && pStage) {
        const nHits = nStage.networkEvidence?.trackingHits?.length || 0;
        const pHits = pStage.hits || 0;
        const nCookies = nStage.cookieBreakdown?.all?.length || 0;
        const pCookies = pStage.cookies || 0;
        
        if (Math.abs(nHits - pHits) > 0) {
          errs.push(`NORM baseline.hits=${nHits} != P0 baseline.hits=${pHits}`);
        }
        if (Math.abs(nCookies - pCookies) > 0) {
          errs.push(`NORM baseline.cookies=${nCookies} != P0 baseline.cookies=${pCookies}`);
        }
      }
    }
  } catch (e) {
    errs.push(`strict check error: ${e.message}`);
  }
  
  return errs;
}

const files = expand(inputs);
if (!files.length) {
  console.error('No .p0.json files found');
  process.exit(1);
}

let ok = 0, bad = 0;

for (const p0Path of files) {
  let p0;
  try {
    p0 = JSON.parse(readFileSync(p0Path, 'utf8'));
  } catch (e) {
    console.log(`FAIL ${basename(p0Path)}: cannot parse JSON`);
    bad++;
    continue;
  }
  
  let errs = basicCheck(p0);
  if (strict) errs.push(...strictCheck(p0Path));
  
  if (errs.length) {
    console.log(`FAIL ${basename(p0Path)}:`);
    for (const e of errs) console.log(`  - ${e}`);
    bad++;
  } else {
    console.log(`PASS ${basename(p0Path)}${strict ? ' (strict)' : ''}`);
    ok++;
  }
}

console.log(strict ? 'VERIFY SUMMARY (STRICT)' : 'VERIFY SUMMARY');
console.log(`checked=${ok + bad} ok=${ok} bad=${bad}`);

if (bad > 0) {
  process.exit(1);
}