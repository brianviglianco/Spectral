import fs from 'fs';
import path from 'path';
const isDir = p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const isFile = p => { try { return fs.statSync(p).isFile(); } catch { return false; } };

function verifyOne(fp){
  const j = JSON.parse(fs.readFileSync(fp,'utf8'));
  const errs = [];
  if(!j.url) errs.push('url');
  if(!j.domain) errs.push('domain');
  if(!Array.isArray(j.stages) || j.stages.length===0) errs.push('stages');
  for(const s of (j.stages||[])){
    if(typeof s.stage!=='string') errs.push('stage.name');
    if(typeof (s.trackingHits??-1)!=='number') errs.push(`stage.${s.stage}.trackingHits`);
    if(typeof (s.thirdPartyScripts??-1)!=='number') errs.push(`stage.${s.stage}.thirdPartyScripts`);
    const cb=s.cookieBreakdown||{};
    for(const k of ['tracking','consent','unknown']) if(typeof (cb[k]??-1)!=='number') errs.push(`cookieBreakdown.${k}`);
  }
  return errs;
}

function collectTargets(args){
  const out=[];
  for(const a of args){
    if(isFile(a) && a.endsWith('.p0.json')) out.push(a);
    else if(isDir(a)){
      for(const f of fs.readdirSync(a)){
        const p = path.join(a,f);
        if(isFile(p) && p.endsWith('.p0.json')) out.push(p);
      }
    }
  }
  return out;
}

const args = process.argv.slice(2);
if(args.length===0){ console.error('Usage: node verifyP0.mjs <dirOrFiles>'); process.exit(1); }
const targets = collectTargets(args);
if(targets.length===0){ console.error('No .p0.json found'); process.exit(2); }

let fail=0, pass=0;
for(const fp of targets){
  const errs = verifyOne(fp);
  if(errs.length){ console.log('FAIL', path.basename(fp), '->', errs.join(',')); fail++; }
  else { console.log('PASS', path.basename(fp)); pass++; }
}
console.log(`[SUMMARY] PASS=${pass} FAIL=${fail}`);
process.exit(fail?1:0);
