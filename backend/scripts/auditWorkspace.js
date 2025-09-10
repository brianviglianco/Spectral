#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const exists = p => fs.existsSync(path.join(root, p));
const ls = p => (exists(p) ? fs.readdirSync(path.join(root, p)) : []);

function fmtSize(n){
  if(n < 1024) return `${n} B`;
  if(n < 1024**2) return `${(n/1024).toFixed(1)} KB`;
  if(n < 1024**3) return `${(n/1024**2).toFixed(1)} MB`;
  return `${(n/1024**3).toFixed(2)} GB`;
}
function statP(p){ try { return fs.statSync(p); } catch { return null; } }

function walk(dir, baseLabel){
  const abs = path.join(root, dir);
  const out = [];
  const exts = new Map(); // ext -> bytes
  const byStem = new Map(); // stem -> [exts]

  function rec(d, depth=0){
    const items = fs.readdirSync(d, { withFileTypes: true });
    for(const it of items){
      const p = path.join(d, it.name);
      const rel = path.relative(root, p);
      const st = statP(p);
      if(!st) continue;

      if(it.isDirectory()){
        out.push({ type: 'dir', depth, rel, size: st.size });
        rec(p, depth+1);
      } else {
        out.push({ type: 'file', depth, rel, size: st.size });
        const ext = path.extname(it.name).toLowerCase() || '(noext)';
        exts.set(ext, (exts.get(ext)||0) + st.size);
        const stem = path.join(path.dirname(it.name), path.basename(it.name, ext));
        const list = byStem.get(stem) || new Set();
        list.add(ext);
        byStem.set(stem, list);
      }
    }
  }
  rec(abs, 0);

  // print tree
  let totalBytes = 0;
  console.log(`\n=== ${baseLabel} (${dir}) ===`);
  for(const row of out){
    const indent = '  '.repeat(row.depth);
    const icon = row.type === 'dir' ? '📁' : '📄';
    const size = row.type === 'file' ? ` (${fmtSize(row.size)})` : '';
    if(row.type === 'file') totalBytes += row.size;
    console.log(`${indent}${icon} ${row.rel}${size}`);
  }
  console.log(`-- total archivos: ${out.filter(x=>x.type==='file').length}, tamaño: ${fmtSize(totalBytes)}`);

  // resumen por extensión
  if(exts.size){
    console.log('extensiones:');
    [...exts.entries()]
      .sort((a,b)=>b[1]-a[1])
      .forEach(([ext, bytes]) => console.log(` - ${ext.padEnd(8)} ${fmtSize(bytes)}`));
  }

  // duplicados .js/.cjs/.mjs con mismo stem
  const dups = [];
  for(const [stem, set] of byStem){
    if(set.has('.js') && (set.has('.cjs') || set.has('.mjs'))) dups.push([stem, [...set].sort().join(',')]);
  }
  if(dups.length){
    console.log('posibles duplicados (mismo nombre con ext distintas):');
    dups.slice(0,200).forEach(([stem, kinds]) => console.log(` - ${stem} -> ${kinds}`));
    if(dups.length > 200) console.log(` ... +${dups.length-200} más`);
  }
}

console.log('=== Audit Workspace (detalle) ===');

// candidatos “grandes”
['reports', 'screenshots', 'logs', 'tmp', '.cache', '.puppeteer_cache'].forEach(dir => {
  if (exists(dir)) {
    const count = ls(dir).length;
    console.log(`[candidate] ${dir}/ -> ${count} items`);
  }
});

// scripts visibles
const scripts = ls('scripts').filter(f => /\.(c?js|mjs)$/.test(f)).sort();
console.log('\n[scripts]');
scripts.forEach(f => console.log(' -', f));

// carpetas pedidas con detalle
if (exists('src/crawler')) walk('src/crawler', 'Crawler');
if (exists('src/tools'))   walk('src/tools', 'Tools');

console.log('\n[done]');
