#!/usr/bin/env node
'use strict';
/**
 * Matrix inspector that trusts the per-site *.norm.json, not the summary defaults.
 * Prints: domain, CMP flag, provider (None si cmpDetected=false), y métricas por etapa.
 */
const fs = require('fs');
const path = require('path');

function load(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }

function readSummary(fp){
  // summary.de.json debe contener una lista con {domain, report} o similar.
  // Soportamos { items: [...] } o arreglo directo.
  const j = load(fp);
  const items = Array.isArray(j) ? j : (Array.isArray(j.items) ? j.items : []);
  return items.filter(x => x && x.report && fs.existsSync(x.report));
}

function cmpLabel(norm){
  const detected = !!norm.cmpDetected;
  const provider = detected ? (norm.cmpProvider || 'Unknown') : 'None';
  return { detected, provider };
}

function stageRow(s){
  // s.trackingHits y s.cookieBreakdown deben existir por cómo construimos el .norm.json
  const hits = Number(s.trackingHits || 0);
  const cookies = Array.isArray(s.cookieBreakdown?.all)
    ? s.cookieBreakdown.all.length
    : Number((s.cookieBreakdown?.tracking||0)+(s.cookieBreakdown?.consent||0)+(s.cookieBreakdown?.unknown||0)||0);
  const third = Number(s.thirdPartyScripts || 0);
  return `${(s.stage||'').padEnd(11)} hits=${String(hits).padStart(4)}  cookies=${String(cookies).padStart(4)}  3pScripts=${String(third).padStart(4)}`;
}

function printOne(item){
  const norm = load(item.report); // usamos SIEMPRE el .norm.json real
  const { detected, provider } = cmpLabel(norm);
  console.log(`=== ${norm.domain||item.domain||new URL(norm.url).hostname} === CMP: ${detected} / ${provider}`);
  for(const s of (norm.stages||[])) console.log(stageRow(s));
}

(function main(){
  const fp = process.argv[2];
  if(!fp){ console.error('Usage: node scripts/inspect-matrix.js <reports/matrix/.../summary.json>'); process.exit(1); }
  const list = readSummary(fp);
  if(!list.length){ console.error('No items with .report found in summary'); process.exit(2); }
  for(const it of list) printOne(it);
})();
