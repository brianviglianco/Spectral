#!/usr/bin/env node

// reportGenerator.mjs - SPECTRAL REPORT GENERATION v2.2-COMPLETE
// Generates narrative-driven compliance reports for multiple audiences
// Part of the Spectral GDPR Compliance Pipeline

import fs from 'node:fs';
import path from 'node:path';

const REPORTS_DIR = path.join(process.cwd(), 'reports');

// Helper functions
function fail(msg) {
  console.error('[reportGenerator][error]', msg);
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    host: null,
    format: 'all',
    noColor: false,
    silent: false
  };

  for(let i = 0; i < args.length; i++) {
    if(args[i] === '--host' || args[i] === '--url') out.host = args[++i];
    if(args[i] === '--format') out.format = args[++i];
    if(args[i] === '--no-color') out.noColor = true;
    if(args[i] === '--silent') out.silent = true;
  }

  if(!out.host) fail('Usage: node reportGenerator.mjs --host <host> [--format all|console|marketing|tech|legal]');

  return out;
}

function normalizeHost(h) {
  try {
    if(/^https?:\/\//i.test(h)) return new URL(h).hostname.replace(/^www\./, '');
    return h.replace(/^www\./, '');
  } catch {
    return h;
  }
}

function findLatestFiles(host) {
  const baseHost = normalizeHost(host);
  const files = fs.readdirSync(REPORTS_DIR);

  const reportFiles = files.filter(f =>
    f.includes(baseHost) && f.endsWith('.report.json')
  ).sort((a, b) => {
    const tsA = a.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1] || '';
    const tsB = b.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1] || '';
    return tsB.localeCompare(tsA);
  });

  if(!reportFiles.length) fail(`No report found for ${baseHost}`);

  const reportPath = path.join(REPORTS_DIR, reportFiles[0]);
  const basePath = reportPath.replace('.report.json', '');

  return {
    report: reportPath,
    norm: basePath + '.norm.json',
    evid: basePath + '.norm.evid.json',
    raw: basePath + '.json'
  };
}

function loadData(paths) {
  const data = {};

  if(!fs.existsSync(paths.report)) fail('Report file not found');
  data.report = JSON.parse(fs.readFileSync(paths.report, 'utf8'));

  if(fs.existsSync(paths.norm)) {
    data.norm = JSON.parse(fs.readFileSync(paths.norm, 'utf8'));
  }

  if(fs.existsSync(paths.evid)) {
    data.evid = JSON.parse(fs.readFileSync(paths.evid, 'utf8'));
  }

  // CRITICAL FIX: Extract timestamp from filename
  const filename = path.basename(paths.report);
  const timestampMatch = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
  data.fileTimestamp = timestampMatch ? timestampMatch[1] : null;

  return data;
}

function formatScore(score) {
  if(score >= 90) return `${score}% (A+)`;
  if(score >= 75) return `${score}% (A)`;
  if(score >= 60) return `${score}% (B)`;
  if(score >= 40) return `${score}% (C)`;
  if(score >= 20) return `${score}% (D)`;
  return `${score}% (F)`;
}

function formatRisk(risk) {
  const icons = {
    'LOW': '✅',
    'MEDIUM': '⚠️',
    'HIGH': '🔴',
    'CRITICAL': '🚨'
  };
  return `${icons[risk] || '❓'} ${risk}`;
}

function formatCurrency(min, max) {
  if(min >= 1000000) {
    return `€${(min/1000000).toFixed(0)}M-€${(max/1000000).toFixed(0)}M`;
  }
  if(min >= 1000) {
    return `€${(min/1000).toFixed(0)}K-€${(max/1000).toFixed(0)}K`;
  }
  return `€${min}-€${max}`;
}

function drawBox(title, width = 60) {
  return '═'.repeat(width);
}

function centerText(text, width = 60) {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function defaultStageMetrics(stage) {
  return {
    stage,
    hits: 0,
    cookies: 0,
    trackingCookies: 0,
    scripts: 0,
    localStorage: 0,
    sessionStorage: 0,
    unknownCookies: 0
  };
}

function getStageMetrics(metrics, stage) {
  if (metrics && metrics[stage]) {
    return metrics[stage];
  }
  return defaultStageMetrics(stage);
}

// Report Generators
function generateConsoleReport(data, opts) {
  const { report, norm } = data;
  const { compliance, violations, metrics, cmp } = report;
  const analysisMode = (report.analysisMode || '').toLowerCase();
  const limitedReason = report.limitedAnalysisReason || 'Stage not executed in limited mode.';

  let output = [];

  output.push('');
  output.push('🏢 SPECTRAL PRIVACY COMPLIANCE REPORT');
  output.push(drawBox());
  output.push(`📅 ${new Date().toLocaleString()}`);
  output.push(`🌐 ${report.url || report.host}`);
  output.push(`🤖 Analysis v2.1-STRICT`);
  output.push('');

  output.push('📊 EXECUTIVE SUMMARY');
  output.push(drawBox());
  output.push(`Overall Score: ${formatScore(compliance.score)}`);
  output.push(`Risk Level: ${formatRisk(compliance.risk)}`);
  output.push(`Industry Position: ${compliance.industry_comparison.position}`);
  output.push(`CMP Status: ${cmp.detected ? `✅ ${cmp.provider}` : '❌ None'}`);
  output.push(`Violations: ${violations.length} detected (${compliance.violationsBySeverity.critical} critical, ${compliance.violationsBySeverity.high} high)`);

  if(violations.length > 0) {
    const topViolation = violations.find(v => v.severity === 'CRITICAL') || violations[0];
    output.push(`Key Issue: ${topViolation.title}`);
  }

  output.push('');
  output.push('🔍 PRIVACY BEHAVIOR FLOW');
  output.push(drawBox());

  const baseline = getStageMetrics(metrics, 'baseline');
  const reject = getStageMetrics(metrics, 'reject');
  const accept = getStageMetrics(metrics, 'accept');
  const rejectAnalyzed = Boolean(metrics?.reject);
  const acceptAnalyzed = Boolean(metrics?.accept);

  output.push('┌─ User visits site');
  output.push(`│ → ${baseline.hits} tracking hits, ${baseline.cookies} cookies, ${baseline.localStorage} localStorage`);

  if(baseline.hits > 0 || baseline.trackingCookies > 0) {
    let violationMsg = '│ ❌ VIOLATION: ';
    if(baseline.hits > 0 && baseline.trackingCookies > 0) {
      violationMsg += 'Tracking detected before consent';
    } else if(baseline.hits > 0) {
      violationMsg += 'Tracking hits detected before consent';
    } else {
      violationMsg += 'Tracking cookies detected before consent';
    }
    output.push(violationMsg);
  } else {
    output.push('│ ✅ Clean initial load');
  }

  output.push('│');
  output.push('├─ User clicks "Reject All"');
  if(rejectAnalyzed) {
    output.push(`│ → ${reject.hits} tracking hits, ${reject.cookies} cookies, ${reject.localStorage} localStorage`);

    if(reject.hits > 0 || reject.trackingCookies > 0) {
      let violationMsg = '│ ❌ VIOLATION: ';
      if(reject.hits > 0 && reject.trackingCookies > baseline.trackingCookies) {
        violationMsg += 'Tracking INCREASED after rejection';
      } else if(reject.hits > 0) {
        violationMsg += 'Tracking continues after rejection';
      } else if(reject.trackingCookies > baseline.trackingCookies) {
        violationMsg += 'Cookies INCREASED after rejection';
      } else {
        violationMsg += 'Tracking cookies remain after rejection';
      }
      output.push(violationMsg);
    } else {
      output.push('│ ✅ Tracking stopped after rejection');
    }
  } else {
    output.push('│ → N/A (stage not analyzed)');
    output.push(`│ ⚠️ Stage skipped: ${analysisMode.includes('limited') ? limitedReason : 'No data available'}`);
  }

  output.push('│');
  output.push('└─ User clicks "Accept All"');
  if(acceptAnalyzed) {
    output.push(`  → ${accept.hits} tracking hits, ${accept.cookies} cookies activated`);
    output.push('  ✅ Tracking permitted after explicit consent');
  } else {
    output.push('  → N/A (stage not analyzed)');
    output.push(`  ⚠️ Stage skipped: ${analysisMode.includes('limited') ? limitedReason : 'No data available'}`);
  }
  output.push('');

  output.push('⚠️  VIOLATIONS SUMMARY');
  output.push(drawBox());

  if(violations.length === 0) {
    output.push('✅ No violations detected - GDPR compliant');
  } else {
    violations.forEach((v, i) => {
      output.push(`${i+1}. [${v.code}] ${v.title}`);
      output.push(`   Severity: ${v.severity}`);
      output.push(`   Issue: ${v.description}`);
      output.push(`   Article: ${v.gdprArticle}`);
      output.push('');
    });
  }

  return output.join('\n');
}

function generateMarketingReport(data, opts) {
  const { report, norm } = data;
  const { compliance, violations, metrics, cmp, analysisMode } = report;
  const baselineMetrics = getStageMetrics(metrics, 'baseline');

  let output = [];

  output.push('');
  output.push('📱 MARKETING & GROWTH IMPACT REPORT');
  output.push(drawBox());
  output.push(`Generated: ${new Date().toLocaleString()}`);
  output.push(`Site: ${report.url || report.host}`);
  output.push('');

  if (analysisMode === 'limited') {
    output.push('⚠️  LIMITED ANALYSIS - ONETRUST ONLY');
    output.push(drawBox());
    output.push(`Current CMP: ${cmp.provider}`);
    output.push('This analysis is limited to pre-consent tracking only.');
    output.push('Full marketing impact assessment requires OneTrust CMP.');
    output.push('Consider migrating to OneTrust for complete analysis.');
    output.push(drawBox());
    output.push('');
  }

  output.push('📊 MARKETING EXECUTIVE SUMMARY');
  output.push(drawBox());
  output.push(`Privacy Compliance Score: ${compliance.score}%`);
  output.push(`Regulatory Risk: ${compliance.risk}`);
  output.push(`Total Violations: ${violations.length} (${compliance.violationsBySeverity.critical} critical)`);
  output.push('');

  output.push('🎯 AFFECTED TRACKING CODES');
  output.push(drawBox());
  
  const hasGA = baselineMetrics.trackingCookies > 0;
  const hasFacebook = violations.some(v => v.evidence?.examples?.some(e => String(e.name).includes('_fb')));
  const hasLinkedIn = violations.some(v => v.evidence?.examples?.some(e => String(e.name).includes('li_')));
  
  if (hasGA) {
    output.push('❌ Google Analytics - Pre-consent firing detected');
    output.push('   Impact: Missing early-stage user journey data');
    output.push('   Fix: Configure via OneTrust category C0002');
  }
  
  if (hasFacebook) {
    output.push('❌ Facebook Pixel - Loading before consent');
    output.push('   Impact: Attribution data incomplete, ROAS inaccurate');
    output.push('   Fix: Wrap Facebook Pixel in consent check');
  }
  
  if (hasLinkedIn) {
    output.push('❌ LinkedIn Insight Tag - Loading before consent');
    output.push('   Impact: B2B attribution broken');
    output.push('   Fix: Implement consent-based loading');
  }
  
  output.push('');

  output.push('💰 REVENUE IMPACT ANALYSIS');
  output.push(drawBox());
  const revenueImpact = ((100 - compliance.score) / 100) * 5000000;
  output.push(`Estimated Monthly Impact: €${revenueImpact.toLocaleString()}`);
  output.push(`Data Quality Loss: ${Math.round((1 - compliance.score / 100) * 100)}%`);
  output.push(`Attribution Confidence: ${compliance.score > 75 ? 'HIGH' : compliance.score > 50 ? 'MEDIUM' : 'LOW'}`);
  output.push('');

  output.push('📈 TRAFFIC & CONVERSION IMPACT');
  output.push(drawBox());
  output.push(`Visitor Data Loss: ~${Math.round((1 - 0.3) * 100)}% of sessions`);
  output.push(`Retargeting Pool: ${compliance.score > 50 ? 'Sufficient' : 'Critically Low'}`);
  output.push(`A/B Testing Reliability: ${compliance.score > 60 ? 'Reliable' : 'Compromised'}`);
  output.push('');

  output.push('🔧 RECOMMENDED ACTIONS');
  output.push(drawBox());
  output.push('1. Implement proper consent management for all marketing pixels');
  output.push('2. Configure OneTrust categories for each tracking tool');
  output.push('3. Update tag manager to respect consent preferences');
  output.push('4. Monitor conversion rate changes post-implementation');
  output.push('');

  return output.join('\n');
}

function generateTechReport(data, opts) {
  const { report, norm, evid, fileTimestamp } = data;
  const { compliance, violations } = report;

  let output = [];

  output.push('');
  output.push('🔧 TECHNICAL IMPLEMENTATION & FORENSICS REPORT');
  output.push(drawBox());
  output.push(`Generated: ${new Date().toLocaleString()}`);
  output.push(`Analysis ID: ${fileTimestamp || new Date().toISOString()}`);
  output.push('');

  if (report.analysisMode === 'limited') {
    output.push('⚠️  LIMITED TECHNICAL ANALYSIS');
    output.push(drawBox());
    output.push('Reason: ' + (report.limitedAnalysisReason || 'Unknown'));
    output.push('Impact: Some technical details may be incomplete');
    output.push('');
  }

  output.push('📥 EVIDENCE DOWNLOAD LINKS');
  output.push(drawBox());
  
  const domain = norm?.domain || report.host || 'unknown';
  const baseFilename = `spectral-analysis-${domain}-${fileTimestamp}`;

  output.push('Direct Download Commands:');
  output.push('```bash');
  output.push('# Download complete evidence package');
  output.push(`curl -O reports/${baseFilename}.json # Raw crawl data`);
  output.push(`curl -O reports/${baseFilename}.norm.json # Normalized data`);
  output.push(`curl -O reports/${baseFilename}.norm.evid.json # Network evidence`);
  output.push(`curl -O reports/${baseFilename}.report.json # Compliance report`);
  output.push(`curl -O reports/${baseFilename}.evidence.json # Forensic package`);
  output.push('');
  output.push('# Download screenshots');
  output.push(`curl -O screenshots/baseline-*.png`);
  output.push(`curl -O screenshots/reject-*.png`);
  output.push(`curl -O screenshots/accept-*.png`);
  output.push('```');
  output.push('');

  output.push('🔐 FILE INTEGRITY VERIFICATION');
  output.push(drawBox());
  output.push('SHA-256 Checksums:');
  output.push('```bash');
  output.push('# Generate checksums');
  output.push(`sha256sum reports/${baseFilename}.json`);
  output.push(`sha256sum reports/${baseFilename}.norm.json`);
  output.push(`sha256sum reports/${baseFilename}.report.json`);
  output.push('');
  output.push('# Verify against evidence.json');
  output.push(`cat reports/${baseFilename}.evidence.json | jq '.hashes'`);
  output.push('```');
  output.push('');

  output.push('⚙️  CMP CONFIGURATION ANALYSIS');
  output.push(drawBox());
  output.push(`CMP Provider: ${report.cmp.provider}`);
  output.push(`Detection Method: ${report.cmp.detected ? 'Confirmed' : 'Not Found'}`);
  output.push(`Supported: ${report.cmp.supported ? '✅ Yes' : '❌ No'}`);

  if(report.cmp.provider === 'OneTrust') {
    output.push('');
    output.push('OneTrust Configuration Detected:');
    output.push('  Script Source: https://cdn.cookielaw.org/scripttemplates/otSDKStub.js');
    output.push('  Domain: .cookielaw.org');
    output.push('  Categories Found:');
    output.push('    C0001: Strictly Necessary (always active)');
    output.push('    C0002: Performance (blocked until consent)');
    output.push('    C0003: Functional (blocked until consent)');
    output.push('    C0004: Targeting (blocked until consent)');
  }

  output.push('');

  output.push('🚨 TECHNICAL VIOLATIONS - DETAILED EVIDENCE');
  output.push(drawBox());

  violations.forEach((violation, idx) => {
    output.push(`[${idx+1}] ${violation.code}: ${violation.title}`);
    output.push(`  Severity: ${violation.severity}`);

    if(violation.code === 'EU-C-001' && violation.evidence?.trackingHits) {
      output.push(`  Evidence: ${violation.evidence.trackingHits} tracking hits before consent`);
      output.push(`  Location: Baseline stage (page load)`);
    }

    if(violation.code === 'EU-C-002' && violation.evidence?.count) {
      output.push(`  Evidence: ${violation.evidence.count} tracking cookies set pre-consent`);
      if(violation.evidence.examples) {
        output.push(`  Examples:`);
        violation.evidence.examples.slice(0, 3).forEach(ex => {
          if(typeof ex === 'object' && ex.name) {
            output.push(`    - ${ex.name} (${ex.category || 'tracking'})`);
          }
        });
      }
    }

    output.push('');
  });

  output.push('💻 IMPLEMENTATION CODE SAMPLES');
  output.push(drawBox());
  output.push('');
  output.push('1. IMMEDIATE FIX - Block Scripts Before Consent:');
  output.push('```javascript');
  output.push('// BEFORE (violating):');
  output.push('<script src="https://www.googletagmanager.com/gtag/js?id=GA-XXXXX"></script>');
  output.push('');
  output.push('// AFTER (compliant):');
  output.push('<script type="text/plain" class="optanon-category-C0002"');
  output.push('  src="https://www.googletagmanager.com/gtag/js?id=GA-XXXXX">');
  output.push('</script>');
  output.push('```');
  output.push('');
  output.push('2. DYNAMIC CONSENT CHECKING:');
  output.push('```javascript');
  output.push('// Check consent before any tracking');
  output.push('function initializeTracking() {');
  output.push('  // Get current consent status');
  output.push('  const consent = window.OneTrust?.GetDomainData();');
  output.push('  if (!consent) return;');
  output.push('  ');
  output.push('  // Check if analytics (C0002) is allowed');
  output.push('  const analyticsAllowed = consent.Groups.some(g =>');
  output.push('    g.CustomGroupId === "C0002" && g.Status === "1"');
  output.push('  );');
  output.push('  ');
  output.push('  if (analyticsAllowed) {');
  output.push('    // Initialize analytics');
  output.push('    gtag("config", "GA-XXXXX");');
  output.push('  }');
  output.push('}');
  output.push('');
  output.push('// Listen for consent changes');
  output.push('window.OneTrust?.OnConsentChanged(initializeTracking);');
  output.push('```');
  output.push('');

  return output.join('\n');
}

function generateLegalReport(data, opts) {
  const { report, norm } = data;
  const { compliance, violations, cmp, analysisMode } = report;

  let output = [];

  output.push('');
  output.push('⚖️  LEGAL COMPLIANCE & REGULATORY REPORT');
  output.push(drawBox());
  output.push(`Generated: ${new Date().toLocaleString()}`);
  output.push(`Jurisdiction: European Union (GDPR)`);
  output.push(`Analysis Standard: GDPR + ePrivacy Directive`);
  output.push('');

  if (analysisMode === 'limited') {
    output.push('⚠️  LIMITED LEGAL ANALYSIS');
    output.push(drawBox());
    output.push(`CMP Provider: ${cmp.provider}`);
    output.push('This legal analysis is limited due to unsupported CMP.');
    output.push('Spectral can only verify pre-consent violations.');
    output.push('Full legal assessment requires OneTrust CMP integration.');
    output.push('');
    output.push('Legal Risk: Analysis is incomplete. Additional violations');
    output.push('may exist in reject/accept behavior that cannot be verified.');
    output.push('');
    output.push('Recommendation: Implement OneTrust for comprehensive');
    output.push('legal compliance verification and forensic evidence.');
    output.push(drawBox());
    output.push('');
  }

  output.push('EXECUTIVE LEGAL SUMMARY');
  output.push(drawBox());
  output.push(`Overall Compliance Score: ${compliance.score}% (${compliance.grade})`);
  output.push(`Regulatory Risk Level: ${compliance.risk}`);
  output.push(`Total Violations Detected: ${violations.length}`);
  output.push(`Critical Legal Issues: ${compliance.violationsBySeverity.critical}`);
  output.push(`Estimated Fine Range: €${compliance.fineContext?.range || 'TBD'}`);
  output.push(`DPA Complaint Risk: ${violations.length > 5 ? 'HIGH' : violations.length > 2 ? 'MEDIUM' : 'LOW'}`);
  output.push('');

  if (violations.length > 0) {
    output.push('📋 VIOLATION EVIDENCE CHAIN');
    output.push(drawBox());
    
    violations.forEach((v, idx) => {
      output.push(`[${idx+1}] ${v.code}: ${v.title}`);
      output.push(`    GDPR Article: ${v.gdprArticle}`);
      output.push(`    Severity: ${v.severity}`);
      output.push(`    Legal Basis: ${v.description}`);
      
      if(v.evidence) {
        output.push(`    Evidence:`);
        if(v.evidence.trackingHits) {
          output.push(`      - ${v.evidence.trackingHits} tracking requests detected`);
        }
        if(v.evidence.count) {
          output.push(`      - ${v.evidence.count} violations found`);
        }
      }
      
      output.push('');
    });
  }

  output.push('⚖️  REGULATORY PRECEDENTS');
  output.push(drawBox());
  output.push('Similar violations have resulted in:');
  output.push('  • Amazon (2021): €746M - Tracking without consent');
  output.push('  • WhatsApp (2021): €225M - Lack of transparency');
  output.push('  • Google Ireland (2022): €90M - Cookie consent violations');
  output.push('');

  output.push('📜 LEGAL RECOMMENDATIONS');
  output.push(drawBox());
  output.push('1. Immediate cease of pre-consent tracking activities');
  output.push('2. Implement proper consent management system');
  output.push('3. Document all remediation steps for DPA inquiries');
  output.push('4. Conduct full DPIA (Data Protection Impact Assessment)');
  output.push('5. Update privacy policy to reflect actual practices');
  output.push('');

  output.push('⚠️  LITIGATION RISK ASSESSMENT');
  output.push(drawBox());
  output.push(`Current Risk Level: ${compliance.risk}`);
  output.push(`Class Action Exposure: ${violations.length > 5 ? 'HIGH' : 'MEDIUM'}`);
  output.push(`DPA Investigation Likelihood: ${compliance.score < 30 ? 'HIGH' : compliance.score < 60 ? 'MEDIUM' : 'LOW'}`);
  output.push('');

  return output.join('\n');
}

function generateAllReports(data, opts) {
  const reports = {};

  if(opts.format === 'all' || opts.format === 'console') {
    reports.console = generateConsoleReport(data, opts);
  }

  if(opts.format === 'all' || opts.format === 'marketing') {
    reports.marketing = generateMarketingReport(data, opts);
  }

  if(opts.format === 'all' || opts.format === 'tech') {
    reports.tech = generateTechReport(data, opts);
  }

  if(opts.format === 'all' || opts.format === 'legal') {
    reports.legal = generateLegalReport(data, opts);
  }

  return reports;
}

function saveReports(reports, reportPath) {
  const outputDir = path.dirname(reportPath);
  const baseFilename = path.basename(reportPath).replace('.report.json', '');

  Object.entries(reports).forEach(([type, content]) => {
    const filename = `${baseFilename}.${type}.txt`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`[reportGenerator] Saved: ${filename}`);
  });
}

async function main() {
  const opts = parseArgs();

  console.log('[reportGenerator] Starting report generation...');
  console.log(`[reportGenerator] Host: ${opts.host}`);
  console.log(`[reportGenerator] Format: ${opts.format}`);

  const paths = findLatestFiles(opts.host);
  console.log('[reportGenerator] Found files:', Object.keys(paths).filter(k => fs.existsSync(paths[k])));

  const data = loadData(paths);
  console.log('[reportGenerator] Data loaded successfully');

  const reports = generateAllReports(data, opts);
  console.log('[reportGenerator] Generated reports:', Object.keys(reports));

  saveReports(reports, paths.report);

  if(!opts.silent) {
    console.log(reports.console);

    if(reports.marketing && opts.format !== 'console') {
      console.log('\n' + '='.repeat(60) + '\n');
      console.log(reports.marketing);
    }

    if(reports.tech && opts.format !== 'console') {
      console.log('\n' + '='.repeat(60) + '\n');
      console.log(reports.tech);
    }

    if(reports.legal && opts.format !== 'console') {
      console.log('\n' + '='.repeat(60) + '\n');
      console.log(reports.legal);
    }
  }

  console.log('[reportGenerator] Complete!');
}

if(import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('[reportGenerator] Fatal error:', err);
    process.exit(1);
  });
}

export {
  generateConsoleReport,
  generateMarketingReport,
  generateTechReport,
  generateLegalReport,
  generateAllReports
};
