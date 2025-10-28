#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { runCrawl } = require('../spectralCrawler.js');

// Utilities
function ts() { 
  return new Date().toISOString().replace(/[:.]/g,'-'); 
}

function ensureDir(p) { 
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true }); 
  }
}

function rawName(u) { 
  const h = new URL(u).hostname.replace(/^www\./,''); 
  return `spectral-analysis-${h}-${ts()}.json`; 
}

function savePretty(p, o) { 
  fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); 
  console.log('[professionalAnalysis] Saved:', p); 
  return p; 
}

function parseArgs(argv) {
  const out = { url: null, outdir: 'reports' };
  const a = [...argv]; 
  out.url = a[0] && !a[0].startsWith('-') ? a[0] : null;
  
  for (let i = 1; i < a.length; i++) { 
    const v = a[i]; 
    if (v === '--outdir' && a[i+1]) { 
      out.outdir = a[++i]; 
      continue; 
    } 
  }
  return out;
}

function primeEnv() {
  if (process.env.HEADLESS === undefined) {
    process.env.HEADLESS = 'false';
  }
  process.env.RAN_REGION ||= 'DE';
  process.env.RAN_TZ ||= 'Europe/Berlin';
  
  const lang = process.env.RAN_ACCEPT_LANGUAGE || process.env.ACCEPT_LANG;
  if (!lang) { 
    process.env.RAN_ACCEPT_LANGUAGE = 'de-DE,de;q=0.9,en;q=0.8'; 
    process.env.ACCEPT_LANG = process.env.RAN_ACCEPT_LANGUAGE; 
  }
}

// FIXED v2.5: Capture unsupportedCMP for OneTrust-only mode
function pickProvider(b) {
  const cands = [
    b?.initial, 
    b?.initialB, 
    b?.finalA, 
    b?.finalB
  ].filter(Boolean);
  
  // Priority 1: Look for detected CMPs (OneTrust)
  for (const c of cands) { 
    if (c.detected && c.provider && c.provider !== 'None') {
      return c.provider; 
    }
  }
  
  // Priority 2: Look for unsupported CMPs (Quantcast, Cookiebot, etc)
  for (const c of cands) {
    if (c.provider === 'Unsupported' && c.unsupportedCMP) {
      return c.unsupportedCMP; // Return "Quantcast/TCF", "Cookiebot", etc
    }
  }
  
  // Priority 3: No CMP detected
  return 'None';
}

// CRITICAL FIX: Build proper normalized snapshot with ALL data INCLUDING STORAGE
function buildP0Snapshot(raw) {
  const prov = pickProvider(raw.bannerSummary || {});
  
  const snapshot = {
    url: raw.url,
    domain: raw.siteHost || (new URL(raw.url)).hostname,
    siteETLD: raw.siteETLD,
    ts: raw?.meta?.ts || new Date().toISOString(),
    cmpDetected: !!(raw?.bannerSummary?.anyDetected),
    cmpProvider: prov,
    stages: []
  };
  
  // Process each stage with COMPLETE data preservation INCLUDING STORAGE
  for (const stage of (raw.stages || [])) {
    const normalizedStage = {
      stage: stage.stage,
      screenshot: stage.screenshot,
      
      // CRITICAL: Preserve complete cookieBreakdown with 'all' array
      cookieBreakdown: stage.networkEvidence?.cookieBreakdown || stage.cookieBreakdown || {
        tracking: 0,
        consent: 0,
        unknown: 0,
        all: [] // Empty array if no cookies
      },
      
      // Tracking hits count
      trackingHits: (stage.networkEvidence?.trackingHits || stage.trackingHits || []).length,
      
      // Third party scripts count
      thirdPartyScripts: stage.scriptAnalysis?.statistics?.thirdParty || stage.thirdPartyScripts || 0,
      
      // PHASE 1 FIX: Add storage data
      storage: stage.storage || {
        localStorageKeys: [],
        sessionStorageKeys: [],
        localStorageSize: 0,
        sessionStorageSize: 0
      },
      
      // Also add at root level for compatibility
      localStorageKeys: stage.storage?.localStorageKeys || stage.localStorageKeys || [],
      sessionStorageKeys: stage.storage?.sessionStorageKeys || stage.sessionStorageKeys || [],
      
      // PHASE 1: Add Google Consent Mode
      googleConsentMode: stage.googleConsentMode || null,
      
      // CMP State - PRESERVE IT
      cmpState: stage.cmpState || {
        optanonConsent: '',
        optanonActiveGroups: '',
        onetrustGroupsUpdated: '',
        eupubconsent: '',
        tcString: '',
        parsedGroups: stage.cmpState?.parsedGroups || {}
      },
      
      // Network evidence - preserve key data
      networkEvidence: {
        requests: stage.networkEvidence?.requests || [],
        trackingHits: stage.networkEvidence?.trackingHits || [],
        endpoints: stage.networkEvidence?.endpoints || [],
        thirdPartyHosts: stage.networkEvidence?.thirdPartyHosts || [],
        statistics: stage.networkEvidence?.statistics || {
          totalRequests: 0,
          trackingRequests: 0,
          uniqueEndpoints: 0,
          thirdPartyCount: 0
        },
        cookieBreakdown: stage.networkEvidence?.cookieBreakdown || stage.cookieBreakdown
      },
      
      // Script analysis
      scriptAnalysis: {
        statistics: stage.scriptAnalysis?.statistics || {
          total: 0,
          thirdParty: 0,
          firstParty: 0,
          inline: 0
        },
        scripts: stage.scriptAnalysis?.scripts || []
      },
      
      // Banner state - Include DOM analysis if available
      bannerState: stage.bannerState || {
        detected: false,
        provider: 'None',
        domAnalysis: stage.bannerState?.domAnalysis || null
      }
    };
    
    // Ensure backward compatibility by having cookies count at root
    normalizedStage.cookies = normalizedStage.cookieBreakdown?.all?.length || 0;
    // Add total to cookieBreakdown
    if (normalizedStage.cookieBreakdown) {
      normalizedStage.cookieBreakdown.total = normalizedStage.cookieBreakdown.all?.length || 0;
    }
    
    snapshot.stages.push(normalizedStage);
  }
  
  // Add metadata for tracking
  snapshot.meta = {
    crawlTimestamp: raw.timestamp,
    region: raw.meta?.region || 'DE',
    timezone: raw.meta?.tz || 'Europe/Berlin',
    detectionMode: raw.meta?.detectionMode || 'ONETRUST_ONLY'
  };
  
  return snapshot;
}

// Build evidence file for deeper analysis
function buildEvidenceFile(norm) {
  const evidence = {
    url: norm.url,
    domain: norm.domain,
    timestamp: norm.ts,
    cmp: {
      detected: norm.cmpDetected,
      provider: norm.cmpProvider
    },
    stagesEvidence: {}
  };
  
  for (const stage of norm.stages) {
    evidence.stagesEvidence[stage.stage] = {
      cookieCount: stage.cookieBreakdown?.all?.length || stage.cookies || 0,
      cookieBreakdown: {
        tracking: stage.cookieBreakdown?.tracking || 0,
        consent: stage.cookieBreakdown?.consent || 0,
        unknown: stage.cookieBreakdown?.unknown || 0,
        total: stage.cookieBreakdown?.all?.length || 0,
      },
      trackingHits: stage.trackingHits,
      thirdPartyScripts: stage.thirdPartyScripts,
      // PHASE 1: Include storage in evidence
      storage: {
        localStorageKeys: stage.storage?.localStorageKeys?.length || stage.localStorageKeys?.length || 0,
        sessionStorageKeys: stage.storage?.sessionStorageKeys?.length || stage.sessionStorageKeys?.length || 0
      },
      googleConsentMode: stage.googleConsentMode,
      cmpState: stage.cmpState,
      bannerDOMAnalysis: stage.bannerState?.domAnalysis || null,
      endpoints: stage.networkEvidence?.endpoints?.length || 0,
      thirdPartyHosts: stage.networkEvidence?.thirdPartyHosts?.length || 0,
      totalRequests: stage.networkEvidence?.statistics?.totalRequests || 0
    };
  }
  
  // Calculate deltas for violation detection
  if (evidence.stagesEvidence.reject && evidence.stagesEvidence.baseline) {
    evidence.rejectDelta = {
      cookieChange: evidence.stagesEvidence.reject.cookieCount - evidence.stagesEvidence.baseline.cookieCount,
      trackingChange: evidence.stagesEvidence.reject.trackingHits - evidence.stagesEvidence.baseline.trackingHits,
      thirdPartyChange: evidence.stagesEvidence.reject.thirdPartyScripts - evidence.stagesEvidence.baseline.thirdPartyScripts,
      localStorageChange: evidence.stagesEvidence.reject.storage.localStorageKeys - evidence.stagesEvidence.baseline.storage.localStorageKeys,
      sessionStorageChange: evidence.stagesEvidence.reject.storage.sessionStorageKeys - evidence.stagesEvidence.baseline.storage.sessionStorageKeys
    };
  }
  
  if (evidence.stagesEvidence.accept && evidence.stagesEvidence.baseline) {
    evidence.acceptDelta = {
      cookieChange: evidence.stagesEvidence.accept.cookieCount - evidence.stagesEvidence.baseline.cookieCount,
      trackingChange: evidence.stagesEvidence.accept.trackingHits - evidence.stagesEvidence.baseline.trackingHits,
      thirdPartyChange: evidence.stagesEvidence.accept.thirdPartyScripts - evidence.stagesEvidence.baseline.thirdPartyScripts,
      localStorageChange: evidence.stagesEvidence.accept.storage.localStorageKeys - evidence.stagesEvidence.baseline.storage.localStorageKeys,
      sessionStorageChange: evidence.stagesEvidence.accept.storage.sessionStorageKeys - evidence.stagesEvidence.baseline.storage.sessionStorageKeys
    };
  }
  
  return evidence;
}

// Main execution
(async function main() {
  const argv = parseArgs(process.argv.slice(2));
  
  if (!argv.url) { 
    console.error('Usage: node scripts/professionalAnalysis.js <url> [--outdir reports]'); 
    process.exit(1); 
  }
  
  primeEnv();
  
  const outdir = path.isAbsolute(argv.outdir) ? 
    argv.outdir : 
    path.join(process.cwd(), argv.outdir);
    
  ensureDir(outdir);
  
  console.log('[professionalAnalysis] Start', { 
    url: argv.url, 
    outdir: path.basename(outdir), 
    headless: process.env.HEADLESS 
  });

  try {
    // Run the crawl
    const raw = await runCrawl(argv.url);
    
    // Save raw data
    const rawPath = path.join(outdir, rawName(raw.url || argv.url));
    savePretty(rawPath, raw);
    
    // Build and save normalized snapshot
    const norm = buildP0Snapshot(raw);
    const normPath = rawPath.replace(/\.json$/i, '.norm.json');
    savePretty(normPath, norm);
    
    // Build and save evidence file
    const evidence = buildEvidenceFile(norm);
    const evidPath = rawPath.replace(/\.json$/i, '.norm.evid.json');
    savePretty(evidPath, evidence);
    
    // Log summary with storage info
    console.log('\n[professionalAnalysis] Summary:');
    console.log(`- URL: ${norm.url}`);
    console.log(`- CMP: ${norm.cmpProvider} (${norm.cmpDetected ? 'Detected' : 'Not detected'})`);
    console.log(`- Stages: ${norm.stages.length}`);
    
    for (const stage of norm.stages) {
      const cookieCount = stage.cookieBreakdown?.all?.length || stage.cookies || 0;
      const lsCount = stage.storage?.localStorageKeys?.length || stage.localStorageKeys?.length || 0;
      const ssCount = stage.storage?.sessionStorageKeys?.length || stage.sessionStorageKeys?.length || 0;
      
      console.log(`\n  Stage: ${stage.stage}`);
      console.log(`  - Cookies: ${cookieCount} (T:${stage.cookieBreakdown.tracking} C:${stage.cookieBreakdown.consent} U:${stage.cookieBreakdown.unknown})`);
      console.log(`  - Tracking Hits: ${stage.trackingHits}`);
      console.log(`  - 3P Scripts: ${stage.thirdPartyScripts}`);
      console.log(`  - Storage: LS=${lsCount} SS=${ssCount}`);
      console.log(`  - CMP State: ${stage.cmpState.optanonConsent ? 'Set' : 'Empty'}`);
      
      // Log Google Consent Mode if detected
      if (stage.googleConsentMode?.hasGtag || stage.googleConsentMode?.hasDataLayer) {
        console.log(`  - Google Consent Mode: Detected (gtag=${stage.googleConsentMode.hasGtag}, dataLayer=${stage.googleConsentMode.hasDataLayer})`);
      }
    }
    
    console.log('\n[professionalAnalysis] Done.');
    
  } catch(err) { 
    console.error('[professionalAnalysis] FATAL', err?.stack || err); 
    process.exit(1); 
  }
})();