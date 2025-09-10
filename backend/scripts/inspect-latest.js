#!/usr/bin/env node
'use strict';
const fs=require('fs'), path=require('path');
const dir=path.join(process.cwd(),'reports');
const files=(fs.existsSync(dir)?fs.readdirSync(dir):[]).filter(f=>/^spectral-analysis-.*\.json$/i.test(f)&&!f.endsWith('.norm.json'));
if(!files.length){ console.error('No RAW found in reports/'); process.exit(1); }
files.sort((a,b)=>fs.statSync(path.join(dir,b)).mtimeMs-fs.statSync(path.join(dir,a)).mtimeMs);
const fp=path.join(dir,files[0]);
const j=JSON.parse(fs.readFileSync(fp,'utf8'));
const sum=(s)=>({
  stage:s.stage,
  hits:(s.networkEvidence?.trackingHits||[]).length,
  setCookies:(s.networkEvidence?.setCookies||[]).length,
  cookieBreakdown:s.networkEvidence?.cookieBreakdown||{},
  ls:(s.storage?.localStorageKeys||[]).length,
  ss:(s.storage?.sessionStorageKeys||[]).length,
  thirdPartyScripts:s.scriptAnalysis?.statistics?.thirdParty ?? 0
});
console.log('FILE:', path.basename(fp));
console.log('CMP anyDetected:', !!j?.bannerSummary?.anyDetected, 'provider:', (j?.bannerSummary?.providers||[])[0]||j?.bannerSummary?.initial?.provider||'None');
console.log(JSON.stringify((j.stages||[]).map(sum), null, 2));
