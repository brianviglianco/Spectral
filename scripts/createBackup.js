// scripts/createBackup.js
// Creates a timestamped code backup under ./backups/ excluding reports, node_modules, caches.
// Copies code, configs, src/ if present, and learning JSONs (if exist).

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const EXCLUDE_DIRS = new Set([
  'node_modules','reports','backups','screenshots','logs','tmp','.git','.cache','.puppeteer_cache'
]);

const INCLUDE_FILES_ROOT = new Set([
  'package.json','package-lock.json',
  'server.js','auth.js',
  'spectralCrawler.js','intelligentClassifier.js','violationEngine.js','professionalAnalysis.js','testCrawler.js',
  'learningPatterns.json','knownDomains.json','README.md','CONTEXT.md'
]);

function ts() {
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function exists(p){ try{ await fsp.stat(p); return true; }catch{ return false; } }

async function ensureDir(p){ await fsp.mkdir(p, { recursive: true }); }

async function copyFile(src, dst){
  await ensureDir(path.dirname(dst));
  await fsp.copyFile(src, dst);
  console.log(`📄 copied: ${src} -> ${dst}`);
}

async function copyDir(src, dst){
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const ent of entries){
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()){
      if (EXCLUDE_DIRS.has(ent.name)) {
        console.log(`⛔ skip dir: ${s}`);
        continue;
      }
      await copyDir(s, d);
    } else if (ent.isFile()){
      await ensureDir(path.dirname(d));
      await fsp.copyFile(s, d);
      console.log(`📄 copied: ${s} -> ${d}`);
    }
  }
}

async function main(){
  const cwd = process.cwd();
  const backupsDir = path.join(cwd, 'backups');
  await ensureDir(backupsDir);
  const dest = path.join(backupsDir, `spectral-backup-${ts()}`);
  await ensureDir(dest);

  console.log('=== SPECTRAL CREATE BACKUP ===');
  console.log(`dst: ${dest}`);

  // 1) copy src/ if present
  const srcDir = path.join(cwd, 'src');
  if (await exists(srcDir)){
    await copyDir(srcDir, path.join(dest, 'src'));
  } else {
    console.log('ℹ️ no src/ folder found, skipping.');
  }

  // 2) copy selected root files if they exist
  const rootEntries = await fsp.readdir(cwd, { withFileTypes: true });
  for (const ent of rootEntries){
    if (ent.isFile() && INCLUDE_FILES_ROOT.has(ent.name)){
      await copyFile(path.join(cwd, ent.name), path.join(dest, ent.name));
    }
  }

  // 3) manifest
  const manifest = {
    createdAt: new Date().toISOString(),
    excludes: Array.from(EXCLUDE_DIRS),
    includedRootFiles: Array.from(INCLUDE_FILES_ROOT).filter(n => fs.existsSync(path.join(cwd, n))),
  };
  await fsp.writeFile(path.join(dest, 'MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('✅ Backup complete.');
  console.log(`📦 Location: ${dest}`);
}

main().catch(e=>{
  console.error('❌ Backup failed:', e);
  process.exit(1);
});
