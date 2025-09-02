/**
 * VIOLATION ENGINE (P0)
 * - Reglas se basan SOLO en ejecución real:
 *   * trackingHits reales
 *   * Set-Cookie categorizadas (tracking/consent/unknown)
 *   * Local/SessionStorage efectivos
 * - Sin castigar scripts por "presencia" en P0.
 */

'use strict';

function sum(arr) { return arr.reduce((a,b)=>a+b,0); }
function pick(stages, name){ return (stages||[]).find(s=>s.stage===name) || {}; }

function counts(stage){
  const ne = stage?.networkEvidence || {};
  const hits = (ne.trackingHits||[]).length;
  const cookiesTrack = ne?.cookieBreakdown?.tracking || 0;
  const cookiesConsent = ne?.cookieBreakdown?.consent || 0; // NO cuentan para violación
  const cookiesUnknown = ne?.cookieBreakdown?.unknown || 0; // NO cuentan para violación
  const ls = stage?.storage?.localStorageKeys?.length || 0;
  const ss = stage?.storage?.sessionStorageKeys?.length || 0;
  return {
    hits,
    trackingCookies: cookiesTrack,
    trackingStorage: (ls + ss) // P0: si hay cualquier key antes de consentimiento → potencial
  };
}

function analyze(results){
  const violations = [];
  const B = pick(results.stages,'baseline');
  const R = pick(results.stages,'reject');
  const A = pick(results.stages,'accept');

  const pre = counts(B);
  const postReject = counts(R);
  const postAccept = counts(A);

  // EU-C-001: Pre-consent Tracking (solo si HAY ejecución real)
  if ((pre.hits > 0) || (pre.trackingCookies > 0) || (pre.trackingStorage > 0)) {
    violations.push({
      code: 'EU-C-001',
      title: 'Pre-consent Tracking Violation',
      severity: 'CRITICAL',
      evidence: { pre }
    });
  }

  // EU-C-013: Tracking after Reject
  if ((postReject.hits > 0) || (postReject.trackingCookies > 0)) {
    violations.push({
      code: 'EU-C-013',
      title: 'Tracking Continues After Reject',
      severity: 'HIGH',
      evidence: { postReject }
    });
  }

  // EU-C-016 / EU-C-017: efectividad de consentimiento
  // Si Accept no incrementa nada vs Reject (o es idéntico), señal de falla
  const deltaHits = postAccept.hits - postReject.hits;
  const deltaCookies = postAccept.trackingCookies - postReject.trackingCookies;
  if (deltaHits <= 0 && deltaCookies <= 0) {
    violations.push({
      code: 'EU-C-016',
      title: 'Consent Mechanism Not Functional',
      severity: 'HIGH',
      evidence: { postReject, postAccept }
    });
    violations.push({
      code: 'EU-C-017',
      title: 'Identical Tracking Regardless of Choice',
      severity: 'MEDIUM',
      evidence: { postReject, postAccept }
    });
  }

  // Scoring P0: base 100 - penalizaciones por severidad sobre hechos reales
  let score = 100;
  for (const v of violations) {
    if (v.code === 'EU-C-001') score -= 35;
    else if (v.code === 'EU-C-013') score -= 25;
    else if (v.code === 'EU-C-016') score -= 20;
    else if (v.code === 'EU-C-017') score -= 10;
  }
  if (score < 0) score = 0;

  const risk = score === 100 ? 'LOW' : (score >= 70 ? 'MEDIUM' : (score >= 40 ? 'HIGH' : 'CRITICAL'));

  return { score, risk, violations };
}

module.exports = analyze;
module.exports.analyze = analyze;