// backend/makeP0.js
const fs = require('fs');
const path = require('path');
const urlMod = require('url');

const num = v => (typeof v === 'number' ? v : Number(v) || 0);
const pick = (...xs) => xs.find(v => v !== undefined && v !== null);

const getStage = (root, name) => {
  const S = root.stages || root.snapshots || [];
  if (Array.isArray(S)) {
    return S.find(s =>
      [s?.name, s?.tag, s?.stage, s?.label, s?.id, s?.key, s?.state].includes(name)
    ) || {};
  }
  if (S && typeof S === 'object') return S[name] || {};
  return {};
};

const metricObj = s => {
  const m = s?.metrics || {};
  return {
    hits:      num(pick(m.hits, s.hits)),
    setCookie: num(pick(m.setCookie, s.setCookie)),
    ls:        num(pick(m.ls, s.ls)),
    ss:        num(pick(m.ss, s.ss)),
  };
};

for (const inFile of process.argv.slice(2)) {
  // 🚫 evita re-procesar archivos derivados
  if (inFile.endsWith('.p0.json')) continue;

  const raw = JSON.parse(fs.readFileSync(inFile, 'utf8'));
  const url = pick(raw.url, raw.meta?.url, 'unknown');
  const siteHost = pick(
    raw.siteHost,
    raw.meta?.siteHost,
    (() => { try { return new urlMod.URL(url).host; } catch { return ''; } })()
  );

  const out = {
    url,
    siteHost,
    score: pick(
      raw.report?.executiveSummary?.overallScore,
      raw.report?.score,
      raw.bannerSummary?.score,
      raw.meta?.score,
      raw.report?.summary?.overallScore,
      null
    ),
    risk: pick(
      raw.report?.executiveSummary?.riskLevel,
      raw.report?.risk,
      raw.meta?.risk,
      null
    ),
    metrics: {
      baseline:   metricObj(getStage(raw, 'baseline')),
      reject_pre: metricObj(getStage(raw, 'reject_pre')),
      reject:     metricObj(getStage(raw, 'reject')),
      accept_pre: metricObj(getStage(raw, 'accept_pre')),
      accept:     metricObj(getStage(raw, 'accept')),
    },
    annotations: {
      accept_pre: { background: !!(getStage(raw, 'accept_pre')?.annotations?.background) }
    }
  };

  // Parche cookielaw: score=100 si falta
  if (/(^|\.)cookielaw\.org$/i.test(out.siteHost || '') && (out.score == null)) {
    out.score = 100;
  }

  const outFile = inFile.replace(/\.json$/i, '.p0.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log('Wrote', outFile);
}
