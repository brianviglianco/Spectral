#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function log(...a){ console.log(...a); }
function err(...a){ console.error(...a); }
function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function ts(){ return new Date().toISOString().replace(/[:.]/g,'-'); }
function hostnameOf(u){ try{ return new URL(u).hostname.replace(/^www\./,''); }catch{ return null; } }

function parseArgs(argv){
  const out={ region:'de', sitesFile:'config/sites-anchor.json' };
  for(let i=0;i<argv.length;i++){
    const v=argv[i];
    if((v==='--region'||v==='-r') && argv[i+1]){ out.region=argv[++i].toLowerCase(); continue; }
    if((v==='--sites'||v==='-s') && argv[i+1]){ out.sitesFile=argv[++i]; continue; }
  }
  return out;
}

function loadSites(file){
  try{
    const txt = fs.readFileSync(file,'utf8');
    const j = JSON.parse(txt);
    // admite formatos {de:[...]} o array simple
    if(Array.isArray(j)) return j;
    const key = Object.keys(j).find(k=>Array.isArray(j[k]));
    return key ? j[key] : [];
  }catch(e){
    err('[matrix] Could not read sites list, fallback to defaults:', e.message);
    return [
      'https://www.dell.com/de-de',
      'https://www.microsoft.com',
      'https://www.americanexpress.com',
      'https://www.bmw.de',
      'https://www.bmw.com',
      'https://www.mercedes-benz.de',
      'https://www.volkswagen.de',
      'https://www.carrefour.fr',
      'https://www.royalcaribbean.com',
      'https://www.cookielaw.org',
    ];
  }
}

function latestNormForHost(dir, host){
  const files = fs.readdirSync(dir).filter(f => f.startsWith(`spectral-analysis-${host}-`) && f.endsWith('.norm.json'));
  if(!files.length) return null;
  files.sort((a,b)=> fs.statSync(path.join(dir,b)).mtimeMs - fs.statSync(path.join(dir,a)).mtimeMs);
  return path.join(dir, files[0]);
}

function runOne(url){
  const cmd = 'node';
  const args = ['scripts/professionalAnalysis.js', url];
  const env = { ...process.env };
  const opt = { stdio:'inherit', env };
  log('Starting professionalAnalysis...');
  const res = spawnSync(cmd, args, opt);
  const code = typeof res.status === 'number' ? res.status : 1;

  const host = hostnameOf(url);
  const reportsDir = path.join(process.cwd(),'reports');
  let report = 'n/a';
  if(host){
    const norm = latestNormForHost(reportsDir, host);
    if(norm){ report = norm; }
  }
  log('Completed', url, 'with code='+code, 'report='+report);
  return { url, host, code, report, ts: new Date().toISOString() };
}

(function main(){
  const args = parseArgs(process.argv.slice(2));
  const region = args.region;
  const sites = loadSites(args.sitesFile);
  if(!sites.length){ err('[matrix] No sites to run.'); process.exit(1); }

  const outDir = path.join(process.cwd(),'reports','matrix',region);
  ensureDir(outDir);

  const summary = { region, startedAt:new Date().toISOString(), items:[] };
  for(const url of sites){
    console.log('==================================================');
    console.log('REGION='+region, 'URL='+url);
    const item = runOne(url);
    summary.items.push(item);
  }
  summary.finishedAt = new Date().toISOString();
  const sumPath = path.join(outDir, `summary.${region}.json`);
  fs.writeFileSync(sumPath, JSON.stringify(summary,null,2));
  console.log('[SUMMARY]', sumPath);

  // exit non-zero si alguno falló y no generó reporte
  const failures = summary.items.filter(it => it.code!==0 || it.report==='n/a');
  process.exit(failures.length ? 1 : 0);
})();
