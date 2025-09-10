#!/usr/bin/env bash
set -euo pipefail

root="$PWD"
ts="$(date +"%Y%m%d-%H%M%S")"

# ---- helpers: paths (soporta layouts con/ sin backend/) ----
reports_dir=""
for d in "reports" "backend/reports"; do
  [ -d "$root/$d" ] && { reconst root=process.cwd();
const dir=[path.joeports_dir" ] && reports_dir="$root/reports"  # por si no existe aún

archive_dir="$root/archive"
[ -d "$root/backend" ] && archive_dir="$root/backend/archive"

makep0="$root/makeP0.mjs"
[ -f "$root/backend/makeP0.mjs" ] && makep0="$root/backend/makeP0.mjs"

# ---- 1) Backups locales (sin node_modules/ ni archive/) ----
mkdir -p "$root/backups"
tar -czf "$root/backups/Spectral-FULL-before-clean-$ts.tgz" \
  --exclude='./node_modules' --exclude='./archive' --exclude='./backups' .

# ---- 2) Reports: generar P0 faltantes y podar a 1 por dominio ----
if [ -d "$reports_dir" ]; then
  # a) asegurar *.p0.json
  find "$reports_dir" -type f -name '*.norm.json' -print0 | xargs -0 -I{} node "$makep0" "{}" || true

  # b) borrar RAW y .norm.json (dejar sólo .p0.json)
  find "$reports_dir" -type f -name 'spectral-analysis-*.json' ! -name '*.norm.json.p0.json' -delete

  # c) mantener sólo el más nuevo por dominio
  node - <<'NODE'
const fs=require('fs'), path=require('path');
const root=process.cwd();
const candidates=[path.join(root,'reports'),path.join(root,'backend','reports')];
const dir=candidates.find(d=>fs.existsSync(d))||candidates[0];

const files=fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.norm.json.p0.json')):[];
const byDom=new Map();
for(const f of files){
  const m=f.match(/^spectral-analysis-(.*?)-(20\d{2}-\d{2}-\d{2}T[\d\-]+)\.norm\.json\.p0\.json$/);
  if(!m) continue;
  const dom=m[1], fp=path.join(dir,f), mt=fs.statSync(fp).mtimeMs;
  (byDom.get(dom)||byDom.set(dom,[]).get(dom)).push({fp,mt});
}
let kept=0, del=0;
for(const [dom,list] of byDom){
  list.sort((a,b)=>b.mt-a.mt);
  kept++;
  for(const it of list.slice(1)){ try{ fs.unlinkSync(it.fp); del++; }catch{} }
}
console.log(`[reports] domains=${byDom.size} kept=${kept} deleted=${del}`);
NODE
fi

# ---- 3) Mover basura a archive/ (BAK/BAD y .cjs duplicados de .js) ----
mkdir -p "$archive_dir"
find "$root" -maxdepth 2 -type f \( -name '*.BAK' -o -name '*.BAD' \) -print -exec mv -f {} "$archive_dir"/ \; || true
# .cjs con gemelo .js
while IFS= read -r f; do
  base="${f%.*}.js"; [ -f "$base" ] && mv -f "$f" "$archive_dir"/
done < <(find "$root" -type f -name '*.cjs')

# ---- 4) Limpiar carpetas pesadas temporales ----
rm -rf "$root"/{screenshots,logs,tmp,.cache,.puppeteer_cache} \
       "$root/backend"/{screenshots,logs,tmp,.cache,.puppeteer_cache} \
       "$root/public"/{har-files,screenshots} \
       "$root/backend/public"/{har-files,screenshots} || true

# ---- 5) Inventario rápido ----
echo; echo "=== RESUMEN ==="
du -sh "$root" 2>/dev/null || true
[ -d "$reports_dir" ] && { echo -n "reports size: "; du -sh "$reports_dir" 2>/dev/null; }

echo "p0 por dominio:"
node - <<'NODE'
const fs=require('fs'), path=require('path');
const root=process.cwd();
const dir=[path.join(root,'reports'),path.join(root,'backend','reports')].find(d=>fs.existsSync(d));
if(!dir){ console.log(' (no hay reports/)'); process.exit(0); }
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.norm.json.p0.json'));
const doms=[...new Set(files.map(f=>f.match(/^spectral-analysis-(.*?)-/)[1]))].sort();
doms.forEach(d=>{
  const last=files.filter(f=>f.startsWith(`spectral-analysis-${d}-`)).sort().pop();
  console.log(' -', d, '->', last);
});
console.log('total dominios:', doms.length);
NODE
echo "Listo."
