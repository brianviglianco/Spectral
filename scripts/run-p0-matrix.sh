#!/usr/bin/env bash
set -euo pipefail

REGION="${1:-}"
SITES_FILE="${2:-}"

if [[ -z "${REGION}" || -z "${SITES_FILE}" ]]; then
  echo "Usage: scripts/run-p0-matrix.sh <region-code> <sites-json>"
  echo "Example: scripts/run-p0-matrix.sh de config/sites-anchor.json"
  exit 2
fi

if [[ ! -f "${SITES_FILE}" ]]; then
  echo "Sites file not found: ${SITES_FILE}"
  exit 3
fi

mkdir -p reports/matrix/${REGION}

echo "[INFO] Region: ${REGION}"
echo "[INFO] Sites file: ${SITES_FILE}"
echo "[INFO] Starting sequential runs..."

# Node runner secuencial (sin dependencias externas)
node scripts/run-matrix.js --region "${REGION}" --sites "${SITES_FILE}"

echo "[INFO] Normalizing into P0..."
# No comillas para expandir glob en shell
node makeP0.js reports/spectral-analysis-*.json || true

echo "[INFO] Verifying P0 integrity..."
# No comillas. Si el glob no matchea, usa find como respaldo.
if compgen -G "reports/*.p0.json" > /dev/null; then
  node verifyP0.js reports/*.p0.json | tee "reports/matrix-${REGION}.verify.log"
else
  echo "[WARN] No .p0.json matched by shell glob. Falling back to find."
  mapfile -t P0FILES < <(find reports -maxdepth 1 -type f -name "*.p0.json" | sort)
  if [[ "${#P0FILES[@]}" -eq 0 ]]; then
    echo "[ERROR] No .p0.json files found to verify." | tee "reports/matrix-${REGION}.verify.log"
    exit 4
  fi
  node verifyP0.js "${P0FILES[@]}" | tee "reports/matrix-${REGION}.verify.log"
fi

echo "[DONE] Region ${REGION} finished. Artifacts in reports/matrix/${REGION}"
