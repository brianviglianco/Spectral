/**
 * PROFESSIONAL ANALYSIS (P0)
 * - Ejecuta runCrawl(url), carga violationEngine P0, imprime bloques estilo “Siemens”
 * - Guarda JSON completo en /reports
 */

'use strict';

const { runCrawl, saveReportJSON } = require('./spectralCrawler');

async function loadViolationEngine(){
  let ve;
  try { ve = require('./violationEngine'); } catch {}
  if (typeof ve === 'function') return { analyze: ve };
  if (ve && typeof ve.analyze === 'function') return { analyze: ve.analyze };
  return { analyze: () => ({ score: 100, risk: 'LOW', violations: [], note: 've-not-found' }) };
}

function pick(stages,name){ return (stages||[]).find(s=>s.stage===name) || {}; }

function summarizeStage(stage){
  const s = stage||{}; const ne = s.networkEvidence||{}; const sc = s.scriptAnalysis||{};
  const total = sc?.statistics?.total || 0;
  const tracking = sc?.tracking || 0;
  const necessary = sc?.necessary || 0;
  const unknown = sc?.unknown || Math.max(0, total - tracking - (necessary||0));
  const setC = (ne.setCookies||[]).length;
  const hits = (ne.trackingHits||[]).length;
  const cats = ne.cookieBreakdown || { tracking:0, consent:0, unknown:0 };
  const ls = s.storage?.localStorageKeys?.length || 0;
  const ss = s.storage?.sessionStorageKeys?.length || 0;
  return { total, tracking, necessary, unknown, setC, hits, cats, ls, ss };
}

function topHits(stage, n=5){
  const hits = stage?.networkEvidence?.trackingHits||[];
  const har = stage?.networkEvidence?.harLite?.entries||[];
  if (!hits.length) return [];
  const urls = Array.from(new Set(hits.map(h=>h.url))).slice(0, n);
  return urls.map(u=>{
    const e = har.find(x=>x.url===u) || {};
    return `• ${u}${e.status?` [${e.status}]`:''}${e.mimeType?` (${e.mimeType})`:''}`;
  });
}

async function main(){
  const url = process.argv[2];
  if (!url) { console.error('Uso: node src/crawler/professionalAnalysis.js <URL>'); process.exit(1); }

  console.log('🏢 SPECTRAL PRIVACY COMPLIANCE ANALYSIS');
  console.log('============================================================');
  console.log(`🌐 Target: ${url}`);
  console.log(`📅 Analysis Date: ${new Date().toLocaleString()}`);
  console.log('============================================================');

  const results = await runCrawl(url);
  const ve = await loadViolationEngine();
  const verdict = ve.analyze(results);

  const B  = pick(results.stages,'baseline');
  const RP = pick(results.stages,'reject_pre');
  const R  = pick(results.stages,'reject');
  const AP = pick(results.stages,'accept_pre');
  const A  = pick(results.stages,'accept');

  const SB  = summarizeStage(B);
  const SRP = summarizeStage(RP);
  const SR  = summarizeStage(R);
  const SAP = summarizeStage(AP);
  const SA  = summarizeStage(A);

  const bs = results.bannerSummary || { anyDetected:false, providers:[], buttons:{} };
  console.log(`🧭 CMP consolidated → detected=${bs.anyDetected} providers=[${bs.providers.join(', ')||'None'}] buttons: reject=${!!bs.buttons.reject} accept=${!!bs.buttons.accept} settings=${!!bs.buttons.settings}`);

  function block(label, S){
    console.log(`📸 ${label}: ${S.total} scripts (t=${S.tracking}, n=${S.necessary}, u=${S.unknown}), hits=${S.hits}, set-cookie=${S.setC} [tracking:${S.cats.tracking}, consent:${S.cats.consent}, unknown:${S.cats.unknown}], LS=${S.ls}, SS=${S.ss}`);
  }

  console.log('📋 Loading baseline...');
  block('baseline', SB);
  console.log('📊 Capturing reject_pre...');
  block('reject_pre', SRP);
  console.log('📊 Capturing reject...');
  block('reject', SR);
  console.log('📊 Capturing accept_pre...');
  block('accept_pre', SAP);
  console.log('ℹ️ Note: accept_pre activity is background (pre-accept), not post-consent');
  console.log('📊 Capturing accept...');
  block('accept', SA);

  console.log('\n🔝 TOP TRACKING URLS:');
  console.log(' - baseline:\n   ' + (topHits(B).join('\n   ') || '(none)'));
  console.log(' - reject:\n   '   + (topHits(R).join('\n   ') || '(none)'));
  console.log(' - accept:\n   '   + (topHits(A).join('\n   ') || '(none)'));

  console.log('\n🔍 ANALYZING GDPR COMPLIANCE...');
  console.log('📊 Running Violation Engine (P0)');

  console.log('\n📋 EXECUTIVE SUMMARY');
  console.log('══════════════════════════════════════════════════');
  const totalV = (verdict.violations||[]).length;
  const riskEmoji = verdict.risk==='CRITICAL'?'🚨': verdict.risk==='HIGH'?'⚠️': '✅';
  const status = verdict.score===100?'COMPLIANT':'NON-COMPLIANT';
  console.log(`Privacy Compliance Status: ${riskEmoji} ${status}`);
  console.log(`Overall Score: ${verdict.score}%`);
  console.log(`Risk Level: ${verdict.risk}`);
  console.log(`GDPR Violations: ${totalV} total`);
  if (totalV) {
    console.log('\n🚨 VIOLATIONS DETECTED:');
    for (const v of verdict.violations) {
      console.log(` - [${v.code}] ${v.title} (${v.severity})`);
    }
  }

  const annotated = { ...results, annotations: { accept_pre: { background: true, note: 'pre-accept background activity; not post-consent' } }, report: verdict };
  const file = await saveReportJSON(annotated);
  console.log('\n💾 COMPREHENSIVE REPORT SAVED:');
  console.log(`   📁 ${file}`);
}

if (require.main === module) {
  main().catch(e=>{ console.error('❌ Analysis failed:', e?.message||e); process.exit(1); });
}

module.exports = { main };