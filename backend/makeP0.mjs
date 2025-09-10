import fs from 'fs';
import path from 'path';
const isFile = p => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const isDir  = p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

function loadJSON(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }
function outPath(p){ return p.endsWith('.p0.json') ? p : p.replace(/\.norm\.json$/i,'.norm.json.p0.json'); }

function toP0(norm){
  const stages = (norm.stages||[]).map(s=>({
    stage: s.stage,
    screenshot: s.screenshot||null,
    cookieBreakdown: s.cookieBreakdown||s.networkEvidence?.cookieBreakdown||{tracking:0,consent:0,unknown:0},
    trackingHits: s.trackingHits ?? (s.networkEvidence?.trackingHits||[]).length ?? 0,
    thirdPartyScripts: s.thirdPartyScripts ?? s.scriptAnalysis?.statistics?.thirdParty ?? 0
  }));
  return {
    url: norm.url,
    domain: norm.domain || (new URL(norm.url)).hostname,
    siteETLD: norm.siteETLD || null,
    ts: norm.ts || new Date().toISOString(),
    cmpDetected: !!norm.cmpDetected,
    cmpProvider: norm.cmpProvider || 'None',
    stages
  };
}

function processFile(fp){
  if(!/\.norm\.json$/i.test(fp)) return;
  const j = loadJSON(fp);
  const p0 = toP0(j);
  const out = outPath(fp);
  fs.writeFileSync(out, JSON.stringify(p0,null,2));
  console.log('[makeP0] ->', path.basename(out));
}

const args = process.argv.slice(2);
if(args.length===0){ console.error('Usage: node makeP0.mjs <fileOrDir> [more files...]'); process.exit(1); }

for(const a of args){
  if(isFile(a)) processFile(a);
  else if(isDir(a)) for(const f of fs.readdirSync(a)) processFile(path.join(a,f));
  else console.error('[makeP0] Not found:', a);
}
