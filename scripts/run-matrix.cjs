#!/usr/bin/env node
'use strict';
const fs = require('fs'); const path = require('path'); const { spawnSync } = require('node:child_process');

function parseArgs(argv){
  const out={ region:null, sitesFile:null, outdir:'reports', zip:false };
  const a=argv.slice(2);
  for(let i=0;i<a.length;i++){
    const v=a[i];
    if(v==='--region' && a[i+1]){ out.region=a[++i]; continue; }
    if(v==='--sites'  && a[i+1]){ out.sitesFile=a[++i]; continue; }
    if(v==='--outdir' && a[i+1]){ out.outdir=a[++i]; continue; }
    if(v==='--zip'){ out.zip=true; continue; }
    if(!out.region){ out.region=v; continue; }
    if(!out.sitesFile){ out.sitesFile=v; continue; }
  }
  return out;
}
function langForRegion(r){ const m={de:'de-DE',at:'de-AT',ch:'de-CH',fr:'fr-FR',it:'it-IT',es:'es-ES',nl:'nl-NL',da:'da-DK',sv:'sv-SE',en:'en-GB'}; return m[r]||'en-GB'; }
function loadSites(fp){ const full=path.isAbsolute(fp)?fp:path.join(process.cwd(),fp); const txt=fs.readFileSync(full,'utf8'); const j=JSON.parse(txt); return Array.isArray(j)?j:(Array.isArray(j?.sites)?j.sites:[]); }

function runOne(url, cfg){
  const wrapper = path.join(__dirname, 'professionalAnalysis.js');
  const args = [wrapper, url, '--outdir', cfg.outdir]; if(cfg.zip) args.push('--zip');
  const env = { ...process.env, HEADLESS: process.env.HEADLESS ?? 'false', RAN_REGION: cfg.region, RAN_ACCEPT_LANGUAGE: langForRegion(cfg.region), RAN_TZ: process.env.RAN_TZ || 'Europe/Berlin' };
  console.log('[run-matrix] EXEC', { region: cfg.region, url, headless: env.HEADLESS });
  const res = spawnSync(process.execPath, args, { stdio:'inherit', env }); return res.status ?? 0;
}

(function main(){
  const cfg=parseArgs(process.argv);
  if(!cfg.region || !cfg.sitesFile){ console.error('Usage: node scripts/run-matrix.js --region <code> --sites <file>'); process.exit(2); }
  const sites=loadSites(cfg.sitesFile); console.log('[run-matrix] Config', { region:cfg.region, totalSites: sites.length });
  let fails=0; for(const u of sites){ const code=runOne(u,cfg); if(code!==0){ console.error('[run-matrix] ERROR', code, u); fails++; } }
  if(fails){ console.error(`[run-matrix] Completed with ${fails} failures`); process.exit(1); }
  console.log('[run-matrix] Completed OK');
})();
