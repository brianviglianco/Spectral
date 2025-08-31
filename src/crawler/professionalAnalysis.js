// src/crawler/professionalAnalysis.js
// Executive run que usa runSpectral() y guarda reporte enriquecido en /reports

const { runSpectral } = require('./spectralCrawler');
const fs = require('fs').promises;
const path = require('path');

async function saveReport(url, result) {
  const reportsDir = path.resolve(__dirname, '../../reports');
  await fs.mkdir(reportsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const domain = new URL(url).hostname;
  const filename = `spectral-analysis-${domain}-${timestamp}.json`;
  const filepath = path.join(reportsDir, filename);

  const reportData = {
    url,
    timestamp: new Date().toISOString(),
    complianceScore: result.report?.score ?? 0,
    riskLevel: result.report?.risk ?? 'UNKNOWN',
    violations: result.report?.violations ?? [],
    detailedResults: result,
    metadata: {
      spectralVersion: '1.0.0',
      analysisType: 'comprehensive-privacy-compliance',
      reportGeneration: 'automated'
    }
  };

  await fs.writeFile(filepath, JSON.stringify(reportData, null, 2), 'utf8');
  console.log(`\n💾 COMPREHENSIVE REPORT SAVED:\n   📁 ${filepath}`);
  return filepath;
}

async function main() {
  if (process.argv.length < 3) {
    console.log('Usage: node src/crawler/professionalAnalysis.js <URL>');
    console.log('Example: node src/crawler/professionalAnalysis.js https://example.com');
    process.exit(1);
  }
  const url = process.argv[2];

  console.log('🏢 SPECTRAL PRIVACY COMPLIANCE ANALYSIS');
  console.log('============================================================');
  console.log(`🌐 Target: ${url}`);
  console.log(`📅 Analysis Date: ${new Date().toLocaleString()}`);
  console.log('============================================================');

  try {
    const result = await runSpectral({ url });

    console.log('\n📊 GDPR COMPLIANCE SUMMARY');
    console.log('------------------------------------------------------------');
    console.log(`Score: ${result.report.score}%`);
    console.log(`Risk : ${result.report.risk}`);
    console.log(`Violations (${result.report.violations.length}):`);
    result.report.violations.forEach(v => {
      console.log(` - [${v.code}] ${v.title} (${v.severity})`);
    });

    await saveReport(url, result);
  } catch (err) {
    console.error('❌ Analysis failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, saveReport };
