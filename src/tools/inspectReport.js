#!/usr/bin/env node
'use strict';
const fs = require('fs'); const path = require('path');

function latestRaw(){
  const dir = path.join(process.cwd(),'reports');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f=>/^spectral-analysis-.*\.json$/i.test(f) && !/\.norm\.json$/i.test(f)) : [];
  if(!files.length) return null;
  files.sort((a,b)=> fs.statSync(path.join(dir,b)).mtimeMs - fs.statSync(path.join(dir,a)).mtimeMs );
  return path.join(dir, files[0]);
}
function pickFile(){
  const argI = process.argv.indexOf('--file');
  if(argI>-1 && process.argv[argI+1]) return path.resolve(process.argv[argI+1]);
  return latestRaw();
}
function shortBanner(b){ if(!b) return 'None'; const any=b.anyDetected?'Yes':'No'; const prov=(b.initial?.provider||b.finalA?.provider||b.finalB?.provider||'None'); return `${any}/${prov}`; }

(function main(){
  const file = pickFile();
  if(!file || !fs.existsSync(file)){ console.error('❌ No se encontró RAW. Usa: node src/tools/inspectReport.js --file reports/<raw>.json'); process.exit(1); }
  const raw = JSON.parse(fs.readFileSync(file,'utf8'));
  console.log('📄 RAW:', file);
  console.log('CMP:', shortBanner(raw.bannerSummary));
  const rows = (raw.stages||[]).map(s=>{
    const ne=s.networkEvidence||{};
    return {
      stage: s.stage,
      hits: (ne.trackingHits||[]).length,
      setCookies: (ne.setCookies||[]).length,
      ls: (s.storage?.localStorageKeys||[]).length,
      ss: (s.storage?.sessionStorageKeys||[]).length
    };
  });
  console.log(JSON.stringify(rows,null,2));
})();
