#!/usr/bin/env bash
set -euo pipefail

# Default input dir if not provided
INPUT_DIR="${1:-reports}"

echo "P0 NORMALIZATION SUMMARY"
echo "========================"

inputs=0
created=0
skipped=0

# 1) Normalización: .norm.json -> .p0.json (idempotente)
shopt -s nullglob
for f in "$INPUT_DIR"/spectral-analysis-*.norm.json; do
  [ -e "$f" ] || continue
  inputs=$((inputs+1))
  out="${f%.norm.json}.norm.json.p0.json"
  if [ -f "$out" ]; then
    skipped=$((skipped+1))
    continue
  fi
  node makeP0.mjs "$f"
  created=$((created+1))
done
shopt -u nullglob

echo "inputs=$inputs created=$created skipped=$skipped"

# 2) Verificación forense de todos los .p0.json
node ./verifyP0.mjs "$REPORTS_DIR"
