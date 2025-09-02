/**
 * TEST CRAWLER (smoke P0)
 * - Solo navega, corre el flujo y muestra métricas por etapa
 */

'use strict';

const { runCrawl } = require('./spectralCrawler');

async function main(){
  const url = process.argv[2];
  if (!url) {
    console.error('Uso: node src/crawler/testCrawler.js <URL>');
    process.exit(1);
  }
  console.log(`🧭 Navigating → ${url}`);
  try {
    const res = await runCrawl(url);
    console.log('🧪 SPECTRAL TEST - Enhanced GDPR Detection');
    console.log('==================================================');

    const bs = res.bannerSummary || { anyDetected:false, provider:'None' };
    const anyProv = bs.providers?.length ? bs.providers.join(',') : (bs.initial?.provider||'None');
    const detected = !!(bs.initial?.detected || bs.finalA?.detected || bs.finalB?.detected);
    const rej = !!(bs.initial?.reject || bs.finalA?.reject || bs.finalB?.reject);
    const set = !!(bs.initial?.settings || bs.finalA?.settings || bs.finalB?.settings);
    console.log(`🧭 CMP detection → detected=${detected} provider=${anyProv||'None'} reject=${rej} settings=${set}`);

    console.log('📊 Captured stages: ' + res.stages.map(s=>s.stage).join(', '));
    for (const s of res.stages) {
      const ne = s.networkEvidence || {};
      const sc = s.scriptAnalysis || {};
      const hits = (ne.trackingHits||[]).length;
      const scats = ne.cookieBreakdown || { tracking:0, consent:0, unknown:0 };
      console.log(`📸 ${s.stage}: scripts=${sc.statistics?.total||0} (t=${sc.tracking||0}, n=${sc.necessary||0}, u=${sc.unknown||0}) | hits=${hits} | set-cookie=${(ne.setCookies||[]).length} | cookies=0`);
    }

    // ratio helper
    const pre = (res.stages.find(x=>x.stage==='baseline')?.networkEvidence?.trackingHits||[]).length;
    const rejHits = (res.stages.find(x=>x.stage==='reject')?.networkEvidence?.trackingHits||[]).length;
    const accHits = (res.stages.find(x=>x.stage==='accept')?.networkEvidence?.trackingHits||[]).length;
    console.log(`[ViolationEngine] pre={hits:${pre},cookies:0} rej={h:${rejHits},c:0} acc={h:${accHits},c:0} ratio=${accHits? (rejHits/accHits).toFixed(2):'0.00'}`);

  } catch (e) {
    console.error('❌ Test failed:', e?.message || e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}