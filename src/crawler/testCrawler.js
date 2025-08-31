/**
 * SPECTRAL – Test Runner (Puppeteer v22 compatible)
 * - NO usa createIncognitoBrowserContext (el crawler gestiona navegador)
 * - Llama a spectralCrawler.runCrawl(url) y luego a violationEngine.analyze(evidence)
 * - Guarda reporte JSON en ./reports/
 */

const fs = require('fs');
const path = require('path');
const { runCrawl } = require('./spectralCrawler');              // mismo folder
const { analyze }   = require('./violationEngine');             // mismo folder

function ts() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Uso: node src/crawler/testCrawler.js <url>');
    process.exit(1);
  }

  console.log('🧪 SPECTRAL TEST - Enhanced GDPR Detection');
  console.log('==================================================');

  // 1) Crawl: el crawler abre y cierra su propio browser. Aquí NO se crean contexts.
  let evidence;
  try {
    evidence = await runCrawl(url);
  } catch (e) {
    console.error(`❌ Crawl failed: ${e.message}`);
    process.exit(1);
  }

  // 2) Analítica de violaciones
  let report;
  try {
    report = analyze(evidence);
  } catch (e) {
    console.error(`❌ Analysis failed: ${e.message}`);
    process.exit(1);
  }

  // 3) Persistencia del reporte
  try {
    const outDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const host = (() => {
      try { return new URL(url).hostname.replace(/[^a-z0-9.-]/gi, '_'); } catch { return 'site'; }
    })();
    const outFile = path.join(outDir, `spectral-analysis-${host}-${ts()}.json`);
    fs.writeFileSync(outFile, JSON.stringify({ evidence, report }, null, 2), 'utf8');
    console.log(`\n💾 Reporte guardado: ${outFile}`);
  } catch (e) {
    console.error(`⚠️ No se pudo guardar el reporte: ${e.message}`);
  }

  // 4) Resumen en consola
  try {
    const { score, risk, violations } = report || {};
    console.log('\n📊 RESULTS:');
    console.log(`URL: ${url}`);
    if (evidence?.stages?.[0]?.cmp) {
      const cmpAny = evidence.stages.find(s => s?.cmp?.detected) || {};
      const cmp = cmpAny.cmp || evidence.stages[0].cmp;
      console.log('\n🎯 BANNER ANALYSIS:');
      console.log(`Provider: ${cmp.provider || 'None'}`);
      console.log(`Detected: ${cmp.detected ? 'Yes' : 'No'}`);
      console.log(`Buttons: Reject=${cmp.buttons?.reject ? 'Yes' : 'No'} | Accept=${cmp.buttons?.accept ? 'Yes' : 'No'} | Settings=${cmp.buttons?.settings ? 'Yes' : 'No'}`);
    }
    console.log('\n================================================================================');
    console.log('📊 GDPR COMPLIANCE REPORT');
    console.log('================================================================================');
    console.log(`Score: ${typeof score === 'number' ? score : 'n/a'}%`);
    console.log(`Risk: ${risk || 'n/a'}`);
    console.log(`Total Violations: ${Array.isArray(violations) ? violations.length : 0}`);
    if (Array.isArray(violations)) {
      for (const v of violations) {
        console.log(`- [${v.code}] ${v.title} (${v.severity || 'n/a'})`);
      }
    }
  } catch (e) {
    console.error(`⚠️ Error mostrando resumen: ${e.message}`);
  }
}

main().catch(e => {
  console.error(`❌ Test failed: ${e.message}`);
  process.exit(1);
});
