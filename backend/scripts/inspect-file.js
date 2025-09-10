#!/usr/bin/env node
'use strict';
const fs=require('fs'), path=require('path');
const dom=(process.argv[2]||'').toLowerCase();
const dir=path.join(process.cwd(),'reports');
const raws=(fs.readdirSync(dir).filter(f=>/^spectral-analysis-.*\.json$/i.test(f)&&!f.endsWith('.norm.json')));
const targets=dom?raws.filter(f=>f.includes(dom)):raws;
if(!targets.length){ console.error('No RAW match'); process.exit(1); }
for(const f of targets.sort()){
  const j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
  const rows=(j.stages||[]).map(s=>({
    stage:s.stage,
    hits:(s.networkEvidence?.trackingHits||[]).length,
    setCookies:(s.networkEvidence?.setCookies||[]).length,
    thirdPartyScripts:s.scriptAnalysis?.statistics?.thirdParty ?? 0
  }));
  console.log('FILE:', f);
  console.log('CMP anyDetected:', !!j?.bannerSummary?.anyDetected, 'provider:', (j?.bannerSummary?.providers||[])[0]||j?.bannerSummary?.initial?.provider||'None');
  console.log(rows);
}
