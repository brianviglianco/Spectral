// src/crawler/violationEngine.js
// Forensic-first scoring. Robust to input shape (array de stages o objeto con {stages}).

function normalizeStages(input) {
  if (Array.isArray(input)) return input;
  if (input && Array.isArray(input.stages)) return input.stages;
  if (input && input.detailedResults && Array.isArray(input.detailedResults.stages)) {
    return input.detailedResults.stages;
  }
  return [];
}

function countPreConsent(stages, key) {
  return stages
    .filter(s => s.stage === 'baseline' || s.stage === 'reject_pre' || s.stage === 'accept_pre')
    .reduce((n, s) => n + ((s.networkEvidence?.[key] || []).length), 0);
}

function pickStage(stages, name) {
  return stages.find(s => s.stage === name) || {};
}

function analyze(input) {
  const stages = normalizeStages(input); // <— tolerante a llamadas con objeto
  if (!stages.length) {
    // Falla blanda: sin stages, devuelve 100/LOW sin violaciones
    return { score: 100, risk: 'LOW', violations: [], note: 'no-stages' };
  }

  // 1) Señales pre-consent
  const preHits = countPreConsent(stages, 'trackingHits');
  const preCookies = countPreConsent(stages, 'setCookies');

  // 2) Señales post-choice
  const rej = pickStage(stages, 'reject');
  const acc = pickStage(stages, 'accept');

  const rejHits = (rej.networkEvidence?.trackingHits || []).length;
  const accHits = (acc.networkEvidence?.trackingHits || []).length;
  const rejCookies = (rej.networkEvidence?.setCookies || []).length;
  const accCookies = (acc.networkEvidence?.setCookies || []).length;

  // Métrica combinada para bypass (hits + cookies)
  const wHits = 1.0, wCookies = 1.0;
  const rejCombined = wHits * rejHits + wCookies * rejCookies;
  const accCombined = wHits * accHits + wCookies * accCookies;

  const violations = [];

  // EU-C-001: tracking real antes de consentir
  if (preHits > 0 || preCookies > 0) {
    violations.push({
      code: 'EU-C-001',
      title: 'Pre-consent Tracking Violation',
      severity: 'CRITICAL',
      details: { preHits, preCookies }
    });
  }

  // EU-C-011: bypass tras Reject ≈ Accept usando métrica combinada
  let bypass = false;
  let ratio = 0;
  if (rejCombined > 0 && accCombined > 0) {
    ratio = rejCombined / accCombined;
    if (ratio >= 0.8) bypass = true; // ≥80% del nivel de Accept
  } else if (accCombined === 0 && rejCombined > 0) {
    bypass = true;
    ratio = Infinity;
  }

  if (bypass) {
    violations.push({
      code: 'EU-C-011',
      title: 'Consent Bypass Violation',
      severity: 'CRITICAL',
      details: {
        rejHits, accHits, rejCookies, accCookies,
        rejCombined, accCombined, ratio: Number.isFinite(ratio) ? Number(ratio.toFixed(2)) : 'inf'
      }
    });
  }

  // 3) Scoring proporcional y riesgo
  let score = 100;
  for (const v of violations) {
    if (v.code === 'EU-C-001') score -= 35;
    if (v.code === 'EU-C-011') score -= 30;
  }
  if (score < 0) score = 0;

  let risk = 'LOW';
  if (score < 40) risk = 'CRITICAL';
  else if (score < 70) risk = 'HIGH';
  else if (score < 90) risk = 'MEDIUM';

  try {
    console.log('[ViolationEngine] pre={hits:%d,cookies:%d} rej={h:%d,c:%d} acc={h:%d,c:%d} ratio=%s',
      preHits, preCookies, rejHits, rejCookies, accHits, accCookies,
      Number.isFinite(ratio) ? ratio.toFixed(2) : 'inf'
    );
  } catch {}

  return { score, risk, violations };
}

module.exports = { analyze };
