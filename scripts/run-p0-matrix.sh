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

# Use node runner to avoid jq dependency on self-hosted runners
node scripts/run-matrix.js --region "${REGION}" --sites "${SITES_FILE}"

echo "[INFO] Normalizing into P0..."
node makeP0.js "reports/spectral-analysis-*.json" || true

echo "[INFO] Verifying P0 integrity..."
node verifyP0.js "reports/*.p0.json" | tee "reports/matrix-${REGION}.verify.log"

echo "[DONE] Region ${REGION} finished. Artifacts in reports/matrix/${REGION}"
