cd ~/Desktop/Spectral/backend
mkdir -p scripts reports public/screenshots public/har-files
cat > scripts/professionalAnalysis.js <<'EOF'
#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { runCrawl } = require('../spectralCrawler.js');

function ts(){ return new Date().toISOString().replace(/[:.]/g,'-'); }
function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function rawName(u){ const h=new URL(u).hostname.replace(/^www\./,''); return `spectral-analysis-${h}-${ts()}.json`; }
function savePretty(p,o){ fs.writeFileSync(p, JSON.stringify(o,null,2),'utf8'); console.log('[professionalAnalysis] Saved:', p); return p; }

function parseArgs(argv){
  const out={ url:null, outdir:'reports' };
  const a=[...argv]; out.url = a[0] && !a[0].startsWith('-') ? a[0] : null;
  for(let i=1;i<a.length;i++){ const v=a[i]; if(v==='--outdir' && a[i+1]){ out.outdir=a[++i]; continue; } }
  return out;
}
function primeEnv(){
  if(process.env.HEADLESS===undefined) process.env.HEADLESS='false';
  process.env.RAN_REGION ||= 'DE';
  process.env.RAN_TZ     ||= 'Europe/Berlin';
  const lang = process.env.RAN_ACCEPT_LANGUAGE || process.env.ACCEPT_LANG;
  if(!lang){ process.env.RAN_ACCEPT_LANGUAGE='de-DE,de;q=0.9,en;q=0.8'; process.env.ACCEPT_LANG=process.env.RAN_ACCEPT_LANGUAGE; }
}
function buildP0Snapshot(raw){
  return {
    url: raw.url,
    domain: raw.siteHost || (new URL(raw.url)).hostname,
    siteETLD: raw.siteETLD,
    ts: raw?.meta?.ts || new Date().toISOString(),
    cmpDetected: !!raw?.bannerSummary?.anyDetected,
    cmpProvider: (raw?.bannerSummary?.providers||[])[0] || raw?.bannerSummary?.initial?.provider || 'None',
    stages: (raw.stages||[]).map(s=>({
      stage: s.stage,
      screenshot: s.screenshot,
      cookieBreakdown: s.networkEvidence?.cookieBreakdown || { tracking:0, consent:0, unknown:0 },
      trackingHits: (s.networkEvidence?.trackingHits||[]).length,
      thirdPartyScripts: s.scriptAnalysis?.statistics?.thirdParty ?? 0
    }))
  };
}

(async function main(){
  const argv = parseArgs(process.argv.slice(2));
  if(!argv.url){ console.error('Usage: node scripts/professionalAnalysis.js <url> [--outdir reports]'); process.exit(1); }
  primeEnv();
  const outdir = path.isAbsolute(argv.outdir) ? argv.outdir : path.join(process.cwd(), argv.outdir);
  ensureDir(outdir);
  console.log('[professionalAnalysis] Start', { url: argv.url, outdir: path.basename(outdir), headless: process.env.HEADLESS });

  try{
    const raw = await runCrawl(argv.url);
    const rawPath  = path.join(outdir, rawName(raw.url||argv.url));  savePretty(rawPath, raw);
    const norm     = buildP0Snapshot(raw);
    const normPath = rawPath.replace(/\.json$/i,'.norm.json');        savePretty(normPath, norm);
    console.log('[professionalAnalysis] Done.');
  }catch(err){ console.error('[professionalAnalysis] FATAL', err?.stack||err); process.exit(1); }
})();
EOF
chmod +x scripts/professionalAnalysis.js
