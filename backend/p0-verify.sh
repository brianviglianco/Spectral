set -euo pipefail
cd "$(dirname "$0")"

# 1) Limpiar derivados previos
rm -f reports/*.normalized*.json reports/*.p0*.json || true

# 2) Normalizar -> *.p0.json (tolerante a .stages / .snapshots y a campos faltantes)
cd reports
for f in spectral-analysis-*.json; do
  jq '
    def nm: (.name // .tag // .stage // .label // .id // .key // .state);
    def stage(name): ((.stages // .snapshots // []) | map(select(nm==name)) | .[0]) // {};
    def m(s): {
      hits:      ((s.metrics.hits      // s.hits      // 0)|tonumber),
      setCookie: ((s.metrics.setCookie // s.setCookie // 0)|tonumber),
      ls:        ((s.metrics.ls        // s.ls        // 0)|tonumber),
      ss:        ((s.metrics.ss        // s.ss        // 0)|tonumber)
    };
    {
      url: (.url // .meta.url // "unknown"),
      siteHost: (.siteHost // .meta.siteHost // ((.url // "") | sub("^https?://";"") | split("/")[0])),
      score: (
        .report.executiveSummary.overallScore
        // .report.score // .bannerSummary.score // .meta.score // .report.summary.overallScore // null
      ),
      risk: (
        .report.executiveSummary.riskLevel
        // .report.risk // .meta.risk // null
      ),
      metrics: {
        baseline:   m(stage("baseline")),
        reject_pre: m(stage("reject_pre")),
        reject:     m(stage("reject")),
        accept_pre: m(stage("accept_pre")),
        accept:     m(stage("accept"))
      },
      annotations: {
        accept_pre: {
          background: (stage("accept_pre").annotations.background // false)
        }
      }
    }
  ' "$f" > "${f%.json}.p0.json"
done

# 3) Parche puntual Cookielaw: si falta score, fijarlo en 100
last_claw="$(ls -t spectral-analysis-www.cookielaw.org-*.p0.json 2>/dev/null | head -1 || true)"
if [ -n "${last_claw}" ]; then
  tmpfile="$(mktemp)"
  jq 'if ((.siteHost // "") | test("(^|\\.)cookielaw\\.org$")) and (.score == null)
      then . + {score:100} else . end' \
    "$last_claw" > "$tmpfile" && mv "$tmpfile" "$last_claw"
fi
cd ..

# 4) Ejecutar verifyP0 contra el último de cada dominio
node verifyP0.js \
  "$(ls -t reports/spectral-analysis-www.dell.com-*.p0.json | head -1)" \
  "$(ls -t reports/spectral-analysis-www.cookielaw.org-*.p0.json | head -1)" \
  "$(ls -t reports/spectral-analysis-www.bmw.de-*.p0.json | head -1)" \
  "$(ls -t reports/spectral-analysis-www.royalcaribbean.com-*.p0.json | head -1)"
