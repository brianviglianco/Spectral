// scripts/cleanWorkspace.js
// Cleans reports, screenshots, logs, tmp, backups (*.sql) and volatile learning files.
// By default: keeps knownDomains.json and learningPatterns.json.
// Flags:
//   --keep-learning     -> keeps unknownScripts.json and pendingClassification.json
//   --hard              -> also deletes knownDomains.json and learningPatterns.json

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const args = new Set(process.argv.slice(2));
const KEEP_LEARNING = args.has('--keep-learning');
const HARD = args.has('--hard');

const cwd = process.cwd();

const DIRS_TO_WIPE = [
  'reports', 'screenshots', 'logs', 'tmp', '.cache', '.puppeteer_cache'
];

const FILE_GLOBS = [
  '*.sql', '*.sqlite', '*.db', '*.log', 'nohup.out'
];

const LEARNING_FILES_DEFAULT = [
  'unknownScripts.json',
  'pendingClassification.json'
];

const LEARNING_FILES_HARD = [
  'knownDomains.json',
  'learningPatterns.json'
];

function toRegex(glob) {
  // Very small glob -> regex: * matches any except path sep
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${esc}$`, 'i');
}

async function exists(p) {
  try { await fsp.stat(p); return true; } catch { return false; }
}

async function rmDir(target) {
  try {
    await fsp.rm(target, { recursive: true, force: true });
    console.log(`🧹 dir removed: ${target}`);
    return true;
  } catch (e) {
    console.log(`⚠️ dir skip: ${target} -> ${e.message}`);
    return false;
  }
}

async function rmFile(target) {
  try {
    await fsp.rm(target, { force: true });
    console.log(`🧹 file removed: ${target}`);
    return true;
  } catch (e) {
    console.log(`⚠️ file skip: ${target} -> ${e.message}`);
    return false;
  }
}

async function walk(dir, relBase = '') {
  const out = [];
  const list = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const d of list) {
    const abs = path.join(dir, d.name);
    const rel = path.join(relBase, d.name);
    if (d.isDirectory()) {
      out.push({ type: 'dir', abs, rel });
      const sub = await walk(abs, rel);
      out.push(...sub);
    } else if (d.isFile()) {
      out.push({ type: 'file', abs, rel });
    }
  }
  return out;
}

async function main() {
  console.log('=== SPECTRAL CLEAN WORKSPACE ===');
  console.log(`cwd: ${cwd}`);
  const all = await walk(cwd);

  // 1) Remove known directories
  let removed = 0;
  for (const d of DIRS_TO_WIPE) {
    const abs = path.join(cwd, d);
    if (await exists(abs)) removed += (await rmDir(abs)) ? 1 : 0;
  }

  // 2) Remove file globs at root only
  const rootFiles = (await fsp.readdir(cwd, { withFileTypes: true }).catch(() => []))
    .filter(x => x.isFile())
    .map(x => x.name);

  for (const glob of FILE_GLOBS) {
    const re = toRegex(glob);
    for (const f of rootFiles) {
      if (re.test(f)) {
        removed += (await rmFile(path.join(cwd, f))) ? 1 : 0;
      }
    }
  }

  // 3) Learning files
  const learningList = [...LEARNING_FILES_DEFAULT];
  if (HARD) learningList.push(...LEARNING_FILES_HARD);

  for (const lf of learningList) {
    const abs = path.join(cwd, lf);
    if (!KEEP_LEARNING && await exists(abs)) {
      removed += (await rmFile(abs)) ? 1 : 0;
    }
  }

  // 4) Secondary reports folder patterns inside the tree
  for (const it of all) {
    if (it.type === 'dir' && /(^|\/)reports$/i.test(it.rel)) {
      removed += (await rmDir(it.abs)) ? 1 : 0;
    }
  }

  console.log('================================');
  console.log(`✅ Clean finished. Items removed: ${removed}`);
  console.log('Default kept: knownDomains.json, learningPatterns.json');
  if (KEEP_LEARNING) console.log('Flag --keep-learning: preserved unknownScripts.json and pendingClassification.json');
  if (HARD) console.log('Flag --hard: also deleted knownDomains.json and learningPatterns.json');
}

main().catch(e => {
  console.error('❌ Clean failed:', e);
  process.exit(1);
});
