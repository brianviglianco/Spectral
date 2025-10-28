#!/usr/bin/env node
// auditDeep.mjs - INTELLIGENT SCORING SYSTEM v2.5-ONETRUST
// CRITICAL UPDATE: Handles OneTrust-only mode, generates valid reports even with 1 stage
// If only baseline exists (unsupported CMP), generates limited analysis report

import fs from 'node:fs';
import path from 'node:path';

const REPORTS_DIR = path.join(process.cwd(), 'reports');
const STAGES = ['baseline', 'reject_pre', 'reject', 'accept_pre', 'accept'];

// INDUSTRY BENCHMARKS
const INDUSTRY_BENCHMARKS = {
  'technology': { avg: 45, top10: 75, bottom10: 15 },
  'finance': { avg: 65, top10: 85, bottom10: 35 },
  'healthcare': { avg: 70, top10: 90, bottom10: 40 },
  'retail': { avg: 35, top10: 65, bottom10: 10 },
  'media': { avg: 25, top10: 55, bottom10: 5 },
  'default': { avg: 40, top10: 70, bottom10: 15 }
};

// SCORING DIMENSIONS - v2.5 with OneTrust-only support
const SCORING_DIMENSIONS = {
  consent_implementation: { weight: 30, name: 'Consent Implementation' },
  data_minimization: { weight: 25, name: 'Data Minimization' },
  transparency: { weight: 20, name: 'Transparency & Control' },
  security: { weight: 15, name: 'Security Practices' },
  compliance_readiness: { weight: 10, name: 'Compliance Readiness' }
};

// GDPR FINE PRECEDENTS
const FINE_PRECEDENTS = {
  'pre-consent-tracking': {
    cases: ['Google (€90M)', 'Amazon (€35M)', 'Facebook (€60M)'],
    range: '€10M-€90M',
    factors: 'Depends on scale, user count, and cooperation'
  },
  'post-reject-tracking': {
    cases: ['Google (€150M)', 'Facebook (€60M)'],
    range: '€50M-€150M',
    factors: 'Serious violation of user choice'
  },
  'no-consent-mechanism': {
    cases: ['Clearview AI (€20M)', 'TIM (€27.8M)'],
    range: '€20M-€30M',
    factors: 'Complete absence of consent'
  },
  'multiple-violations': {
    cases: ['Amazon (€746M)', 'WhatsApp (€225M)', 'Google Ireland (€90M)'],
    range: '€90M-€750M',
    factors: 'Cumulative violations and company size'
  }
};

function fail(m) {
  console.error('[auditDeep][error]', m);
  process.exit(1);
}

function read(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch(e) {
    fail(`Cannot read ${p}: ${e.message}`);
  }
}

function parseArgs() {
  const a = process.argv.slice(2);
  const out = { host: null, strict: false, industry: 'default' };
  for(let i = 0; i < a.length; i++) {
    if(a[i] === '--host' || a[i] === '--url') out.host = a[++i];
    if(a[i] === '--strict') out.strict = true;
    if(a[i] === '--industry') out.industry = a[++i];
  }
  if(!out.host) fail('Usage: node auditDeep.mjs --host <host|url> [--strict] [--industry retail|finance|tech|healthcare|media]');
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

function pickBase(host) {
  const baseHost = normalizeHost(host);
  const files = fs.readdirSync(REPORTS_DIR);
  
  const normFiles = files.filter(f => 
    f.includes(baseHost) && f.endsWith('.norm.json')
  ).sort((a,b) => {
    const tsA = a.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1] || '';
    const tsB = b.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1] || '';
    return tsB.localeCompare(tsA);
  });

  if(!normFiles.length) fail(`No norm file found for ${baseHost}`);

  const normPath = path.join(REPORTS_DIR, normFiles[0]);
  const base = normPath.replace('.norm.json', '');

  return {
    norm: normPath,
    evid: base + '.norm.evid.json',
    raw: base + '.json',
    base
  };
}

function getStageData(norm, stageName) {
  if(!norm || !Array.isArray(norm.stages)) return null;
  return norm.stages.find(s => s.stage === stageName) || null;
}

function getCookieCount(stage) {
  if(!stage) return 0;
  return stage?.cookieBreakdown?.total || 0;
}

function getTrackingHits(stage) {
  if (typeof stage?.trackingHits === 'number') return stage.trackingHits;
  if (Array.isArray(stage?.trackingHits)) return stage.trackingHits.length;
  if (Array.isArray(stage?.networkEvidence?.trackingHits)) {
    return stage.networkEvidence.trackingHits.length;
  }
  return 0;
}

function getTrackingCookies(stage) {
  return stage?.cookieBreakdown?.tracking || 0;
}

function getThirdPartyScripts(stage) {
  return stage?.thirdPartyScripts ||
         stage?.scriptAnalysis?.statistics?.thirdParty ||
         0;
}

function getLocalStorage(stage) {
  return stage?.storage?.localStorageKeys?.length ||
         stage?.localStorageKeys?.length ||
         0;
}

function getSessionStorage(stage) {
  return stage?.storage?.sessionStorageKeys?.length ||
         stage?.sessionStorageKeys?.length ||
         0;
}

function getCookieDetails(stage) {
  if (stage?.cookieBreakdown?.all) {
    return stage.cookieBreakdown.all;
  }
  return [];
}

// VIOLATION DETECTION v2.5 - OneTrust-only mode support
function detectViolations(norm, evid) {
  const violations = [];

  // Check if we have full analysis (5 stages with OneTrust)
  const hasFullAnalysis = norm.stages && norm.stages.length >= 5;
  const cmpDetected = norm.cmpDetected === true;
  const cmpProvider = norm.cmpProvider || 'None';

  // Get stage data
  const baseline = getStageData(norm, 'baseline');
  const rejectPre = getStageData(norm, 'reject_pre');
  const reject = getStageData(norm, 'reject');
  const accept = getStageData(norm, 'accept');

  // Get metrics for baseline (always available)
  const baselineHits = getTrackingHits(baseline);
  const baselineCookies = getCookieCount(baseline);
  const baselineTrackingCookies = getTrackingCookies(baseline);
  const baselineScripts = getThirdPartyScripts(baseline);
  const baselineLS = getLocalStorage(baseline);
  const baselineSS = getSessionStorage(baseline);

  // EU-C-001: Pre-consent tracking (can detect even with 1 stage)
  if (baselineHits > 0) {
    violations.push({
      code: 'EU-C-001',
      severity: 'CRITICAL',
      title: 'Pre-consent Tracking Activities',
      description: 'Tracking requests detected before user provides consent',
      evidence: {
        trackingHits: baselineHits,
        details: 'Tracking pixels/analytics fired before consent dialog interaction'
      },
      gdprArticle: 'Article 6(1)(a), Article 7'
    });
  }

  // EU-C-002: Tracking cookies before consent (can detect even with 1 stage)
  if (baselineTrackingCookies > 0) {
    const trackingCookiesList = getCookieDetails(baseline)
      .filter(c => c.gdprCategory === 'analytics' || c.gdprCategory === 'marketing')
      .slice(0, 5)
      .map(c => ({ name: c.name, category: c.gdprCategory }));

    violations.push({
      code: 'EU-C-002',
      severity: 'CRITICAL',
      title: 'Non-essential Cookies Before Consent',
      description: 'Analytics/marketing cookies set before user consent',
      evidence: {
        count: baselineTrackingCookies,
        examples: trackingCookiesList.length > 0 ?
          trackingCookiesList :
          [{note: `${baselineTrackingCookies} tracking cookies detected`}]
      },
      gdprArticle: 'Article 5(3) ePrivacy Directive'
    });
  }

  // EU-C-003: Excessive third-party scripts (can detect even with 1 stage)
  if (baselineScripts > 10) {
    violations.push({
      code: 'EU-C-003',
      severity: 'HIGH',
      title: 'Excessive Third-party Scripts Pre-consent',
      description: 'Multiple third-party scripts loading before consent',
      evidence: {
        count: baselineScripts,
        threshold: 10,
        risk: 'Potential data leakage to third parties'
      },
      gdprArticle: 'Article 25 (Data Protection by Design)'
    });
  }

  // EU-C-004: LocalStorage usage (can detect even with 1 stage)
  if (baselineLS > 2) {
    violations.push({
      code: 'EU-C-004',
      severity: 'HIGH',
      title: 'LocalStorage Usage Before Consent',
      description: 'LocalStorage being used before user consent',
      evidence: {
        keys: baselineLS,
        concern: 'Persistent tracking possible'
      },
      gdprArticle: 'Article 5(3) ePrivacy Directive'
    });
  }

  // EU-C-005: SessionStorage usage (can detect even with 1 stage)
  if (baselineSS > 0) {
    violations.push({
      code: 'EU-C-005',
      severity: 'MEDIUM',
      title: 'SessionStorage Usage Before Consent',
      description: 'SessionStorage being used before user consent',
      evidence: {
        keys: baselineSS,
        concern: 'Session-based tracking without consent'
      },
      gdprArticle: 'Article 5(3) ePrivacy Directive'
    });
  }

  // EU-C-012: No consent mechanism (can detect even with 1 stage)
  if (!cmpDetected && (baselineHits > 0 || baselineCookies > 0)) {
    violations.push({
      code: 'EU-C-012',
      severity: 'CRITICAL',
      title: 'No Consent Mechanism',
      description: 'Tracking activities without any consent management',
      evidence: {
        trackingDetected: baselineHits,
        trackingCookies: baselineCookies,
        cmpPresent: false
      },
      gdprArticle: 'Article 7 (Conditions for consent)'
    });
  }

  // VIOLATIONS REQUIRING FULL ANALYSIS (reject/accept stages)
  // Only check these if we have full 5-stage analysis with OneTrust
  if (hasFullAnalysis && cmpProvider === 'OneTrust') {
    const rejectPreCookies = getTrackingCookies(rejectPre);
    const rejectHits = getTrackingHits(reject);
    const rejectCookies = getTrackingCookies(reject);
    const acceptHits = getTrackingHits(accept);
    const acceptCookies = getTrackingCookies(accept);

    // EU-C-013: Tracking after rejection
    const hasPostRejectViolation = rejectHits > 0 || rejectCookies > 0;
    if (hasPostRejectViolation) {
      const cookieChange = rejectCookies - rejectPreCookies;
      let description;
      
      if(cookieChange > 0) {
        description = 'Tracking cookies INCREASE after user rejects consent';
      } else if(cookieChange === 0 && rejectCookies > 0) {
        description = 'Tracking cookies PERSIST after user rejects consent (not deleted)';
      } else if(rejectCookies > 5) {
        description = `${rejectCookies} tracking cookies remain after rejection (partial deletion)`;
      } else if(rejectHits > 0) {
        description = 'Tracking continues via hits despite cookie deletion';
      }

      violations.push({
        code: 'EU-C-013',
        severity: 'CRITICAL',
        title: 'Tracking After Rejection',
        description: description,
        evidence: {
          trackingHits: rejectHits,
          rejectPreCookies: rejectPreCookies,
          rejectCookies: rejectCookies,
          cookieChange: cookieChange,
          cookieIncrease: cookieChange > 0 ? cookieChange : undefined,
          userChoice: 'rejected'
        },
        gdprArticle: 'Article 7(3) (Right to withdraw consent)'
      });
    }

    // EU-C-016: Ineffective consent
    const acceptDelta = acceptHits - rejectHits;
    if (acceptDelta < 5 && acceptHits > 0) {
      violations.push({
        code: 'EU-C-016',
        severity: 'HIGH',
        title: 'Ineffective Consent Implementation',
        description: 'Minimal difference between accept and reject states',
        evidence: {
          acceptHits,
          rejectHits,
          difference: acceptDelta,
          concern: 'Consent choices not properly implemented'
        },
        gdprArticle: 'Article 7 (Valid consent)'
      });
    }

    // EU-C-017: Identical behavior
    if (acceptHits === rejectHits && acceptCookies === rejectCookies && acceptHits > 0) {
      violations.push({
        code: 'EU-C-017',
        severity: 'HIGH',
        title: 'Identical Tracking Regardless of Choice',
        description: 'Same tracking behavior for accept and reject',
        evidence: {
          acceptHits,
          rejectHits,
          acceptCookies,
          rejectCookies
        },
        gdprArticle: 'Article 7 (Meaningful consent)'
      });
    }

    // EU-C-018: Insecure cookie attributes
    const insecureTrackingCookies = getCookieDetails(baseline)
      .filter(c => (c.gdprCategory === 'analytics' || c.gdprCategory === 'marketing'))
      .filter(c => !c.secure || !c.sameSite || c.sameSite === 'None');

    if (insecureTrackingCookies.length > 0) {
      violations.push({
        code: 'EU-C-018',
        severity: 'MEDIUM',
        title: 'Insecure Tracking Cookie Attributes',
        description: 'Tracking cookies lack proper security attributes',
        evidence: {
          count: insecureTrackingCookies.length,
          issues: insecureTrackingCookies.slice(0, 5).map(c => ({
            name: c.name,
            missing: [
              !c.secure ? 'Secure flag' : null,
              !c.sameSite ? 'SameSite attribute' : null,
              c.sameSite === 'None' ? 'SameSite=None (risky)' : null
            ].filter(Boolean)
          }))
        },
        gdprArticle: 'Article 32 (Security)'
      });
    }

    // EU-C-019: Excessive duration
    const longDurationCookies = getCookieDetails(baseline)
      .filter(c => c.gdprCategory === 'analytics' || c.gdprCategory === 'marketing')
      .filter(c => {
        if(!c.expires) return false;
        const expiryDate = new Date(c.expires);
        const monthsFromNow = (expiryDate - Date.now()) / (1000 * 60 * 60 * 24 * 30);
        return monthsFromNow > 13;
      });

    if (longDurationCookies.length > 0) {
      violations.push({
        code: 'EU-C-019',
        severity: 'MEDIUM',
        title: 'Excessive Cookie Duration',
        description: 'Tracking cookies with duration > 13 months',
        evidence: {
          count: longDurationCookies.length,
          examples: longDurationCookies.slice(0, 5).map(c => ({
            name: c.name,
            duration: c.expires ? `${Math.round((new Date(c.expires) - Date.now()) / (1000 * 60 * 60 * 24 * 30))} months` : 'unknown'
          }))
        },
        gdprArticle: 'Article 5(1)(e) (Storage limitation)'
      });
    }

    // EU-C-020: Opaque consent storage
    const consentCookies = getCookieDetails(baseline)
      .filter(c => c.gdprCategory === 'necessary' || c.name.toLowerCase().includes('consent'));
    
    const opaqueConsentCookies = consentCookies.filter(c => {
      const val = String(c.value || '');
      return val.length > 100 || /^[A-Za-z0-9+/=]{40,}$/.test(val);
    });

    if (opaqueConsentCookies.length > 0) {
      violations.push({
        code: 'EU-C-020',
        severity: 'LOW',
        title: 'Opaque Consent Storage',
        description: 'Consent preferences stored in non-transparent format',
        evidence: {
          count: opaqueConsentCookies.length,
          concern: 'Users cannot inspect their consent choices'
        },
        gdprArticle: 'Article 12 (Transparent information)'
      });
    }

    // EU-C-022: Purpose limitation
    const analyticsInMarketing = getCookieDetails(baseline)
      .filter(c => c.gdprCategory === 'analytics')
      .filter(c => {
        const domain = c.domain?.toLowerCase() || '';
        const name = c.name?.toLowerCase() || '';
        return domain.includes('facebook') || domain.includes('doubleclick') ||
               name.includes('_fbp') || name.includes('ide');
      });

    if (analyticsInMarketing.length > 0) {
      violations.push({
        code: 'EU-C-022',
        severity: 'HIGH',
        title: 'Purpose Limitation Violation',
        description: 'Analytics cookies used for marketing purposes',
        evidence: {
          count: analyticsInMarketing.length,
          examples: analyticsInMarketing.slice(0, 3).map(c => ({
            name: c.name,
            domain: c.domain,
            category: c.gdprCategory
          }))
        },
        gdprArticle: 'Article 5(1)(b) (Purpose limitation)'
      });
    }
  }

  return violations;
}

// SCORING SYSTEM v2.5 - OneTrust-only support
function calculateScore(violations, metrics, opts) {
  const { strict } = opts;
  
  // Base score
  let score = 100;
  const details = {
    penalties: [],
    bonuses: [],
    caps: []
  };

  // Severity penalties
  const severityPenalties = {
    CRITICAL: 25,
    HIGH: 15,
    MEDIUM: 10,
    LOW: 5
  };

  violations.forEach(v => {
    const penalty = severityPenalties[v.severity] || 10;
    score -= penalty;
    details.penalties.push({
      code: v.code,
      severity: v.severity,
      penalty: penalty,
      reason: v.title
    });
  });

  // Caps based on critical violations
  const criticalCount = violations.filter(v => v.severity === 'CRITICAL').length;
  if (criticalCount >= 3) {
    if (score > 25) {
      details.caps.push({ reason: '3+ critical violations', cap: 25, before: score });
      score = 25;
    }
  } else if (criticalCount >= 2) {
    if (score > 40) {
      details.caps.push({ reason: '2 critical violations', cap: 40, before: score });
      score = 40;
    }
  } else if (criticalCount === 1) {
    if (score > 60) {
      details.caps.push({ reason: '1 critical violation', cap: 60, before: score });
      score = 60;
    }
  }

  // Bonuses (only if no critical violations)
  if (criticalCount === 0) {
    // Good practices bonuses
    if (metrics.baseline.trackingCookies === 0 && metrics.baseline.hits === 0) {
      score = Math.min(100, score + 5);
      details.bonuses.push({ reason: 'Zero pre-consent tracking', bonus: 5 });
    }
    
    if (metrics.baseline.localStorage === 0 && metrics.baseline.sessionStorage === 0) {
      score = Math.min(100, score + 3);
      details.bonuses.push({ reason: 'No storage usage pre-consent', bonus: 3 });
    }
  }

  // Ensure bounds
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  // Risk level
  let risk;
  if (score >= 90) risk = 'LOW';
  else if (score >= 70) risk = 'MEDIUM';
  else if (score >= 40) risk = 'HIGH';
  else risk = 'CRITICAL';

  // Grade
  let grade;
  if (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B+';
  else if (score >= 60) grade = 'B';
  else if (score >= 50) grade = 'C+';
  else if (score >= 40) grade = 'C';
  else if (score >= 30) grade = 'D';
  else grade = 'F';

  return {
    score: Math.round(score),
    grade,
    risk,
    details
  };
}

// DIMENSION SCORING
function calculateDimensionScores(violations, metrics) {
  const dimensions = {};

  for (const [key, dim] of Object.entries(SCORING_DIMENSIONS)) {
    let dimScore = 100;
    
    violations.forEach(v => {
      if (key === 'consent_implementation' && ['EU-C-012', 'EU-C-013', 'EU-C-016', 'EU-C-017'].includes(v.code)) {
        dimScore -= 20;
      }
      if (key === 'data_minimization' && ['EU-C-001', 'EU-C-002', 'EU-C-003'].includes(v.code)) {
        dimScore -= 20;
      }
      if (key === 'transparency' && ['EU-C-020', 'EU-C-022'].includes(v.code)) {
        dimScore -= 15;
      }
      if (key === 'security' && ['EU-C-018', 'EU-C-019'].includes(v.code)) {
        dimScore -= 15;
      }
      if (key === 'compliance_readiness' && ['EU-C-004', 'EU-C-005'].includes(v.code)) {
        dimScore -= 10;
      }
    });

    dimensions[key] = {
      name: dim.name,
      score: Math.max(0, Math.min(100, dimScore)),
      weight: dim.weight
    };
  }

  return dimensions;
}

// INDUSTRY COMPARISON
function getIndustryComparison(score, industry) {
  const benchmark = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.default;
  
  let position;
  if (score >= benchmark.top10) position = 'Top 10%';
  else if (score >= benchmark.avg) position = 'Above Average';
  else if (score >= benchmark.bottom10) position = 'Below Average';
  else position = 'Bottom 10%';

  return {
    industry,
    benchmark,
    position,
    gap: benchmark.avg - score
  };
}

// FINE CONTEXT
function getFineContext(violations) {
  const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
  
  if (criticalViolations.length === 0) {
    return {
      range: '€0-€10K',
      risk: 'LOW',
      precedents: []
    };
  }

  const hasPreConsent = violations.some(v => v.code === 'EU-C-001' || v.code === 'EU-C-002');
  const hasPostReject = violations.some(v => v.code === 'EU-C-013');
  const hasNoCMP = violations.some(v => v.code === 'EU-C-012');

  if (criticalViolations.length >= 3) {
    return {
      range: '€90M-€750M',
      risk: 'CRITICAL',
      precedents: FINE_PRECEDENTS['multiple-violations'].cases
    };
  }

  if (hasPostReject) {
    return {
      range: '€50M-€150M',
      risk: 'CRITICAL',
      precedents: FINE_PRECEDENTS['post-reject-tracking'].cases
    };
  }

  if (hasNoCMP) {
    return {
      range: '€20M-€30M',
      risk: 'HIGH',
      precedents: FINE_PRECEDENTS['no-consent-mechanism'].cases
    };
  }

  if (hasPreConsent) {
    return {
      range: '€10M-€90M',
      risk: 'HIGH',
      precedents: FINE_PRECEDENTS['pre-consent-tracking'].cases
    };
  }

  return {
    range: '€10K-€10M',
    risk: 'MEDIUM',
    precedents: []
  };
}

// RECOMMENDATIONS
function generateRecommendations(violations, score, cmpProvider) {
  const recommendations = [];

  // CMP-specific recommendations
  if (cmpProvider !== 'OneTrust') {
    recommendations.push({
      priority: 'CRITICAL',
      title: 'Migrate to OneTrust or Supported CMP',
      description: `Current CMP (${cmpProvider}) is not supported by Spectral. Consider migrating to OneTrust for full compliance verification.`,
      impact: 'Enables complete GDPR compliance analysis',
      effort: '2-4 weeks',
      score_impact: 'N/A - enables full analysis'
    });
  }

  // Critical violations
  const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
  if (criticalViolations.length > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      title: 'Fix Critical Violations Immediately',
      description: `${criticalViolations.length} critical GDPR violations detected. These pose immediate legal risk.`,
      impact: `Reduces regulatory risk and potential fines by €${criticalViolations.length * 30}M+`,
      effort: '1-2 weeks',
      score_impact: `+${criticalViolations.length * 25} points`
    });
  }

  // Pre-consent tracking
  if (violations.some(v => v.code === 'EU-C-001' || v.code === 'EU-C-002')) {
    recommendations.push({
      priority: 'HIGH',
      title: 'Block Tracking Scripts Until Consent',
      description: 'Configure CMP to block all analytics/marketing scripts before user consent',
      impact: 'Eliminates pre-consent tracking violations',
      effort: '2-3 days',
      score_impact: '+30-40 points'
    });
  }

  // Post-reject tracking
  if (violations.some(v => v.code === 'EU-C-013')) {
    recommendations.push({
      priority: 'CRITICAL',
      title: 'Implement Proper Cookie Deletion on Reject',
      description: 'Ensure all tracking cookies are deleted when user rejects consent',
      impact: 'Demonstrates respect for user choice',
      effort: '3-5 days',
      score_impact: '+25-30 points'
    });
  }

  // No CMP
  if (violations.some(v => v.code === 'EU-C-012')) {
    recommendations.push({
      priority: 'CRITICAL',
      title: 'Implement OneTrust Consent Management',
      description: 'Deploy OneTrust CMP to enable lawful tracking with user consent',
      impact: 'Foundation for GDPR compliance',
      effort: '2-4 weeks',
      score_impact: '+40-50 points',
      business_impact: 'Unlocks data-driven marketing legally'
    });
  }

  // General improvements
  if (score < 70) {
    recommendations.push({
      priority: 'MEDIUM',
      title: 'Conduct Privacy Impact Assessment',
      description: 'Document all data processing activities and legal bases',
      impact: 'Demonstrates compliance efforts to regulators',
      effort: '1 week',
      score_impact: '+5-10 points',
      business_impact: 'Leverage existing CMP investment'
    });
  }

  return recommendations;
}

function main() {
  const { host, strict, industry } = parseArgs();
  const { norm: normPath, evid: evidPath, raw: rawPath, base } = pickBase(host);
  
  const norm = read(normPath);
  const evid = read(evidPath);
  let raw = {};
  if (fs.existsSync(rawPath)) {
    raw = read(rawPath);
  }

  // Check if we have full analysis or limited (OneTrust-only)
  const hasFullAnalysis = norm.stages && norm.stages.length >= 5;
  const cmpDetected = norm.cmpDetected === true;
  const cmpProvider = norm.cmpProvider || 'None';
  const isLimitedAnalysis = !hasFullAnalysis || cmpProvider !== 'OneTrust';

  console.log('\n=== GDPR COMPLIANCE AUDIT v2.5 (ONETRUST-ONLY MODE) ===');
  console.log(JSON.stringify({
    host: norm.domain || norm.host || '(unknown)',
    url: norm.url || null,
    cmp: {
      detected: cmpDetected,
      provider: cmpProvider
    },
    analysisMode: isLimitedAnalysis ? 'LIMITED (baseline-only)' : 'FULL (OneTrust)',
    stageCount: norm.stages?.length || 0,
    industry: industry,
    timestamp: norm.ts || norm.timestamp
  }, null, 2));

  // Warning for limited analysis
  if (isLimitedAnalysis) {
    console.log('\n⚠️  LIMITED ANALYSIS MODE');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`CMP Provider: ${cmpProvider}`);
    console.log('Spectral currently supports OneTrust only.');
    console.log('Analysis limited to baseline stage (pre-consent violations).');
    console.log('Cannot verify reject/accept behavior without OneTrust.');
    console.log('Scores and findings may be incomplete.');
    console.log('═══════════════════════════════════════════════════════\n');
  }

  // Extract stage data
  const baseline = getStageData(norm, 'baseline');
  const reject = getStageData(norm, 'reject');
  const accept = getStageData(norm, 'accept');

  // Collect all metrics
  const metrics = {
    baseline: {
      hits: getTrackingHits(baseline),
      cookies: getCookieCount(baseline),
      trackingCookies: getTrackingCookies(baseline),
      scripts: getThirdPartyScripts(baseline),
      localStorage: getLocalStorage(baseline),
      sessionStorage: getSessionStorage(baseline),
      unknownCookies: baseline?.cookieBreakdown?.unknown || 0
    },
    reject: reject ? {
      hits: getTrackingHits(reject),
      cookies: getCookieCount(reject),
      trackingCookies: getTrackingCookies(reject),
      localStorage: getLocalStorage(reject),
      sessionStorage: getSessionStorage(reject)
    } : null,
    accept: accept ? {
      hits: getTrackingHits(accept),
      cookies: getCookieCount(accept),
      trackingCookies: getTrackingCookies(accept),
      localStorage: getLocalStorage(accept),
      sessionStorage: getSessionStorage(accept)
    } : null
  };

  console.log('\n=== COLLECTED METRICS ===');
  console.log('Stage     | Hits | Tracking | Total | LS  | SS');
  console.log('----------|------|----------|-------|-----|----');
  console.log(`Baseline  | ${String(metrics.baseline.hits).padStart(4)} | ${String(metrics.baseline.trackingCookies).padStart(8)} | ${String(metrics.baseline.cookies).padStart(5)} | ${String(metrics.baseline.localStorage).padStart(3)} | ${String(metrics.baseline.sessionStorage).padStart(3)}`);
  
  if (metrics.reject) {
    console.log(`Reject    | ${String(metrics.reject.hits).padStart(4)} | ${String(metrics.reject.trackingCookies).padStart(8)} | ${String(metrics.reject.cookies).padStart(5)} | ${String(metrics.reject.localStorage).padStart(3)} | ${String(metrics.reject.sessionStorage).padStart(3)}`);
  } else {
    console.log('Reject    | N/A  | N/A      | N/A   | N/A | N/A  (not analyzed)');
  }
  
  if (metrics.accept) {
    console.log(`Accept    | ${String(metrics.accept.hits).padStart(4)} | ${String(metrics.accept.trackingCookies).padStart(8)} | ${String(metrics.accept.cookies).padStart(5)} | ${String(metrics.accept.localStorage).padStart(3)} | ${String(metrics.accept.sessionStorage).padStart(3)}`);
  } else {
    console.log('Accept    | N/A  | N/A      | N/A   | N/A | N/A  (not analyzed)');
  }

  // Detect violations
  console.log('\n=== DETECTING VIOLATIONS ===');
  const violations = detectViolations(norm, evid);
  console.log(`Total violations: ${violations.length}`);
  
  const violationsBySeverity = {
    critical: violations.filter(v => v.severity === 'CRITICAL').length,
    high: violations.filter(v => v.severity === 'HIGH').length,
    medium: violations.filter(v => v.severity === 'MEDIUM').length,
    low: violations.filter(v => v.severity === 'LOW').length
  };
  console.log(`By severity: Critical=${violationsBySeverity.critical}, High=${violationsBySeverity.high}, Medium=${violationsBySeverity.medium}, Low=${violationsBySeverity.low}`);

  // Calculate scores
  console.log('\n=== CALCULATING SCORES ===');
  const compliance = calculateScore(violations, metrics, { strict });
  console.log(`Score: ${compliance.score}% (${compliance.grade})`);
  console.log(`Risk: ${compliance.risk}`);
  console.log(`Penalties: ${compliance.details.penalties.length}`);
  console.log(`Bonuses: ${compliance.details.bonuses.length}`);
  console.log(`Caps applied: ${compliance.details.caps.length}`);

  // Dimension scores
  const dimensionScores = calculateDimensionScores(violations, metrics);
  console.log('\nDimension Scores:');
  Object.entries(dimensionScores).forEach(([key, dim]) => {
    console.log(`  ${dim.name}: ${dim.score}% (weight: ${dim.weight}%)`);
  });

  // Industry comparison
  const industryComparison = getIndustryComparison(compliance.score, industry);
  console.log(`\nIndustry: ${industryComparison.industry}`);
  console.log(`Position: ${industryComparison.position}`);
  console.log(`Gap to average: ${industryComparison.gap > 0 ? '+' : ''}${industryComparison.gap}%`);

  // Fine context
  const fineContext = getFineContext(violations);
  console.log(`\nFine Risk: ${fineContext.risk}`);
  console.log(`Estimated Range: ${fineContext.range}`);

  // Recommendations
  const recommendations = generateRecommendations(violations, compliance.score, cmpProvider);
  console.log(`\nRecommendations: ${recommendations.length}`);
  recommendations.slice(0, 3).forEach((rec, i) => {
    console.log(`  ${i+1}. [${rec.priority}] ${rec.title} (${rec.effort})`);
  });

  // Build final report object
  const report = {
    url: norm.url || `https://${norm.domain || norm.host}`,
    host: norm.domain || norm.host || '(unknown)',
    timestamp: new Date().toISOString(),
    analysisVersion: '2.5-ONETRUST',
    analysisMode: isLimitedAnalysis ? 'limited' : 'full',
    limitedAnalysisReason: isLimitedAnalysis ? `CMP ${cmpProvider} not supported. Spectral supports OneTrust only.` : null,
    cmp: {
      detected: cmpDetected,
      provider: cmpProvider,
      supported: cmpProvider === 'OneTrust'
    },
    compliance: {
      score: compliance.score,
      grade: compliance.grade,
      risk: compliance.risk,
      details: compliance.details,
      violationsBySeverity,
      dimensionScores,
      industry_comparison: industryComparison,
      fineContext
    },
    violations,
    metrics,
    recommendations
  };

  // Save report
  const reportPath = base + '.report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n✅ Report saved: ${reportPath}`);
  
  console.log('\n=== AUDIT COMPLETE ===\n');
}

main();