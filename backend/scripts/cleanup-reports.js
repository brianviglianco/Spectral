#!/usr/bin/env node
'use strict';
const fs=require('fs'), path=require('path');
const args=new Map(process.argv.slice(2).map(a=>a.split('=')));
const KEEP=parseInt(args.get('--keep')||'1',10);
const DRY=args.has('--dry-run');
const dir=path.join(process.cwd(),'reports');
if(!fs.existsSync(dir)){ console.log('reports/ not found'); process.exit(0); }
const all=fs.readdirSync(dir);

const raws=all.filter(f=>/^spectral-analysis-.*\.json$/i.test(f) && !/\.norm\.json$/i.test(f));
if(!raws.length){ console.log('[INFO] No RAW found in reports/'); process.exit(0); }

const by=new Map();
for(const f of raws){
  const m=f.match(/^spectral-analysis-(.*?)-(20\d{2}-\d{2}-\d{2}T[\d\-]+)\.json$/);
  if(!m) continue;
  const domain=m[1];
  const fp=path.join(dir,f);
  const mtime=fs.statSync(fp).mtimeMs;
  (by.get(domain)||by.set(domain,[]).get(domain)).push({fp,f,mtime});
}

let del=0, keep=0;
for(const [domain,files] of by){
  files.sort((a,b)=>b.mtime-a.mtime);
  const survivors=files.slice(0,KEEP);
  const oldies=files.slice(KEEP);
  keep+=survivors.length;

  for(const it of oldies){
    const base=it.f.replace(/\.json$/i,'');
    const toDel=[
      path.join(dir, `${base}.json`),                 // raw
      path.join(dir, `${base}.norm.json`),            // norm
      path.join(dir, `${base}.norm.json.p0.json`)     // p0
    ].filter(p=>fs.existsSync(p));
    for(const fp of toDel){
      if(DRY) console.log('[DRY-DEL]', path.basename(fp));
      else { fs.unlinkSync(fp); console.log('[DEL]', path.basename(fp)); del++; }
    }
  }
}
console.log(`[SUMMARY] groups=${by.size} keep=${KEEP} deleted=${del} dry=${DRY}`);
