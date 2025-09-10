#!/usr/bin/env node
// Convert .norm.json -> .p0.json (one per input). Idempotent.
// Usage: node makeP0.mjs <path/to/report.norm.json>

import fs from 'node:fs';
import path from 'node:path';

const inFile = process.argv[2];
if (!inFile || !fs.existsSync(inFile)) {
  console.error('Usage: node makeP0.mjs <path/to/report.norm.json>');
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const outFile = inFile.replace(/\.norm\.json$/i, '.norm.json.p0.json');

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const pick = (s = {}) => {
  // avoid ?? with || without parentheses
  const thirdParty =
    (s.thirdPartyScripts ?? s.scriptAnalysis?.statistics?.thirdParty ?? 0);
  const tracking =
    (s.trackingHits ?? s.networkEvidence?.trackingHits?.length ?? 0);

  const cookieBreakdown =
    s.cookieBreakdown
      ?? s.networkEvidence?.cookieBreakdown
      ?? { tracking: 0, consent: 0, unknown: 0 };

  return {
    stage: s.stage,
    screenshot: s.screenshot || null,
    cookieBreakdown,
    trackingHits: toNum(tracking),
    thirdPartyScripts: toNum(thirdParty)
  };
};

const p0 = {
  _meta: {
    createdAt: new Date().toISOString(),
    source: path.basename(inFile),
    version: 'p0.1'
  },
  url: raw.url,
  domain: raw.domain || (raw.siteHost || new URL(raw.url).hostname),
  siteETLD: raw.siteETLD,
  ts: raw.ts || new Date().toISOString(),
  cmpDetected: !!raw.cmpDetected,
  cmpProvider: raw.cmpProvider || 'None',
  stages: Array.isArray(raw.stages) ? raw.stages.map(pick) : []
};

fs.writeFileSync(outFile, JSON.stringify(p0, null, 2));
console.log('P0 created:', outFile);
