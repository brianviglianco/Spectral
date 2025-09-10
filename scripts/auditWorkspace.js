// scripts/auditWorkspace.js
// Lists workspace contents and flags safe-to-delete artifacts.
// No destructive actions. Read-only.

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const ROOT_DIRS = [
  'src','reports','docs','public','prisma','node_modules','browser-profile'
];
const CANDIDATE_DIRS = ['reports','screenshots','logs','tmp','.cache','.puppeteer_cache'];
const BACKUP_EXT = ['.sql','.sqlite','.db'];
const KEEP_SQL_REGEX = /spectral_backup_20250825_clean\.sql$/i; // keep this one by default

async function exists(p){ try{ await fsp.stat(p); return true; } catch { return false; } }
async function list(dir){
  const out = [];
  const items = await fsp.readdir(dir, { withFileTypes:true }).catch(()=>[]);
  for (const it of items){
    const abs = path.join(dir, it.name);
    if (it.isDirectory()){
      const size = await dirSize(abs);
      out.push({type:'dir', name:it.name, size});
    } else {
      const stat = await fsp.stat(abs).catch(()=>null);
      out.push({type:'file', name:it.name, size: stat? stat.size:0});
    }
  }
  return out;
}
async function dirSize(dir){
  let total = 0;
  const items = await fsp.readdir(dir, { withFileTypes:true }).catch(()=>[]);
  for (const it of items){
    const abs = path.join(dir, it.name);
    if (it.isDirectory()) total += await dirSize(abs);
    else {
      const st = await fsp.stat(abs).catch(()=>null);
      total += st? st.size:0;
    }
  }
  return total;
}
function human(n){ const u=['B','KB','MB','GB']; let i=0; while(n>1024 && i<u.length-1){ n/=1024; i++; } return `${n.toFixed(1)} ${u[i]}`; }

async function audit(){
  const cwd = process.cwd();
  console.log('=== SPECTRAL WORKSPACE AUDIT (read-only) ===');
  console.log('cwd:', cwd, '\n');

  const root = await list(cwd);

  // 1) Show top-level
  console.log('> Top-level items:');
  for (const it of root){
    const mark =
      (it.type==='dir' && CANDIDATE_DIRS.includes(it.name)) ? ' [candidate]' :
      (it.type==='dir' && it.name==='src') ? ' [core]' :
      (it.type==='file' && BACKUP_EXT.some(e=>it.name.endsWith(e))) ? ' [backup]' :
      '';
    console.log(`- ${it.type} ${it.name} (${human(it.size)})${mark}`);
  }

  // 2) Backups
  const backups = root.filter(x=>x.type==='file' && BACKUP_EXT.some(e=>x.name.endsWith(e)));
  const keep = backups.filter(b=>KEEP_SQL_REGEX.test(b.name)).map(b=>b.name);
  const del  = backups.filter(b=>!KEEP_SQL_REGEX.test(b.name)).map(b=>b.name);
  console.log('\n> Backups SQL:');
  console.log('  keep:', keep.length? keep.join(', '): '(none)');
  console.log('  delete candidates:', del.length? del.join(', '): '(none)');

  // 3) Reports summary
  if (await exists(path.join(cwd,'reports'))){
    const repList = await list(path.join(cwd,'reports'));
    const jsons = repList.filter(x=>x.type==='file' && x.name.endsWith('.json'));
    console.log(`\n> reports/: ${repList.length} items, ${jsons.length} JSON`);
    const sample = jsons.slice(0,5).map(x=>x.name);
    if (sample.length) console.log('  sample:', sample.join(', '));
    else console.log('  (empty)');
  } else {
    console.log('\n> reports/: (absent)');
  }

  // 4) src sanity
  if (await exists(path.join(cwd,'src'))){
    const must = [
      'crawler/spectralCrawler.js',
      'crawler/testCrawler.js',
      'crawler/violationEngine.js',
      'crawler/professionalAnalysis.js',
      'crawler/intelligentClassifier.js',
      'tools/inspectReport.js'
    ];
    console.log('\n> src/ sanity check:');
    for (const f of must){
      const ok = await exists(path.join(cwd,'src', f));
      console.log(`  ${ok? '✅':'⚠️'} ${f}`);
    }
  }

  // 5) Learning files
  const learning = ['learningPatterns.json','unknownScripts.json','knownDomains.json','pendingClassification.json'];
  console.log('\n> Learning files at root:');
  for (const lf of learning){
    const ok = await exists(path.join(cwd, lf));
    console.log(`  ${ok? '✅':'— '} ${lf}`);
  }

  // 6) Suggested deletions (read-only recommendation)
  console.log('\n> Suggested deletions (safe):');
  for (const d of CANDIDATE_DIRS){
    if (await exists(path.join(cwd,d))) console.log(`  - dir ${d}/`);
  }
  for (const f of del){
    console.log(`  - file ${f}`);
  }

  console.log('\nDone.');
}
audit().catch(e=>{ console.error('Audit failed:', e); process.exit(1); });
